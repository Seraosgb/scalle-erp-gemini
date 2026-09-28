<?php

namespace App\Services;

use App\Models\CertificadoA1;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Services\Fiscal\NfePhpDriver;
use Illuminate\Support\Facades\Crypt;
use Exception;
use NFePHP\NFe\Common\Standardize;
use NFePHP\DA\NFe\Danfce;

class MotorFiscalService
{
    private static function instanciarDriver(string $tenantId, string $empresaId): NfePhpDriver
    {
        $certificadoDb = CertificadoA1::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('is_ativo', true)
            ->first();

        if (!$certificadoDb) throw new Exception("Nenhum Certificado A1 ativo encontrado.");

        $pfxBinario = Crypt::decrypt($certificadoDb->arquivo_binario_criptografado);
        $senha = Crypt::decrypt($certificadoDb->senha_criptografada);
        $tpAmb = 2; // Homologação

        $driver = new NfePhpDriver();
        $driver->configurar(
            $pfxBinario, $senha, 'RJ', $tpAmb,
            $certificadoDb->cnpj_certificado, $certificadoDb->razao_social_certificado
        );
        return $driver;
    }

    public static function pingSefaz(string $tenantId, string $empresaId, string $uf = 'RJ'): array
    {
        $driver = self::instanciarDriver($tenantId, $empresaId);
        return $driver->verificarStatusSefaz($uf);
    }

    public static function prepararDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens): DocumentoFiscal
    {
        $driver = self::instanciarDriver($empresa->tenant_id, $empresa->id);

        $ultimoNumero = DocumentoFiscal::where('empresa_id', $empresa->id)->max('numero_documento') ?? 1000;

        $dadosEmissao = [
            'tenant_id' => $empresa->tenant_id,
            'empresa_id' => $empresa->id,
            'modelo' => $modelo,
            'numero' => $ultimoNumero + 1,
            'emitente' => $empresa->toArray(),
            'destinatario' => $destinatario->toArray(),
            'itens' => $itens
        ];

        return $driver->emitir($dadosEmissao);
    }

    public static function processarTransmissaoSefaz(DocumentoFiscal $documento): void
    {
        try {
            $driver = self::instanciarDriver($documento->tenant_id, $documento->empresa_id);

            $xmlAssinado = $documento->xml_conteudo;

            $reflection = new \ReflectionClass($driver);
            $property = $reflection->getProperty('tools');
            $property->setAccessible(true);
            $tools = $property->getValue($driver);

            $idLote = str_pad(100, 15, '0', STR_PAD_LEFT);

            $respSefaz = $tools->sefazEnviaLote([$xmlAssinado], $idLote);

            $std = (new Standardize())->toStd($respSefaz);
            $cStat = $std->cStat;
            $xMotivo = $std->xMotivo;

            if ($cStat == 103 || $cStat == 104) {
                $documento->update([
                    'status' => 'AUTORIZADO',
                    'mensagem_sefaz' => "Autorizado o uso da NFe. CSTAT: {$cStat}",
                ]);
            } else {
                $documento->update([
                    'status' => 'REJEITADO',
                    'mensagem_sefaz' => "Rejeição: {$xMotivo} (cStat: {$cStat})"
                ]);
            }

        } catch (Exception $e) {
            $documento->update([
                'status' => 'FALHA_COMUNICACAO',
                'mensagem_sefaz' => 'Falha na transmissão Sefaz: ' . $e->getMessage()
            ]);
            throw $e;
        }
    }

    public static function gerarDanfceBase64(DocumentoFiscal $documento): ?string
    {
        try {
            if (empty($documento->xml_conteudo)) return null;

            // 2 = Retrato. A classe Danfce renderiza o cupom em formato térmico estreito
            $danfce = new Danfce($documento->xml_conteudo, '', 2);
            $danfce->creditsIntegratorFooter('Scalle ERP - BTEC');
            $danfce->printParameters(80, 58); // Bobina de 80mm (Padrão Epson/Bematech/Elgin)

            $pdf = $danfce->render();
            return base64_encode($pdf);
        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error("Erro DANFCE: " . $e->getMessage());
            return null;
        }
    }
}
