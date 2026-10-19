<?php

namespace App\Services;

use App\Models\CertificadoA1;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\RegraTributaria;
use App\Services\Fiscal\NfePhpDriver;
use Exception;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use NFePHP\DA\NFe\Danfce;
use NFePHP\NFe\Common\Standardize;

class MotorFiscalService
{
    private static function instanciarDriver(string $tenantId, string $empresaId): NfePhpDriver
    {
        $certificadoDb = CertificadoA1::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('is_ativo', true)
            ->first();

        if (!$certificadoDb) {
            throw new Exception("Nenhum Certificado A1 ativo encontrado para esta empresa.");
        }

        $empresa = Empresa::withoutGlobalScopes()->find($empresaId);
        $pfxBinario = Crypt::decrypt($certificadoDb->arquivo_binario_criptografado);
        $senha = Crypt::decrypt($certificadoDb->senha_criptografada);
        $tpAmb = ($certificadoDb->ambiente_emissao === 'PRODUCAO') ? 1 : 2;

        $driver = new NfePhpDriver();
        $driver->configurar(
            $pfxBinario,
            $senha,
            $empresa?->uf ?? 'RJ',
            $tpAmb,
            $certificadoDb->cnpj_certificado ?: ($empresa?->cnpj ?? ''),
            $certificadoDb->razao_social_certificado ?: ($empresa?->razao_social ?? ''),
            $empresa?->csc_token ?? 'GPQCGX3M46MGEHUX4JPRR8FQQ1H7WJ1E',
            $empresa?->csc_id ?? '000001'
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

    /**
     * Emissão com cálculo da Matriz Tributária (ICMS, PIS, COFINS, IBS e CBS - Reforma Tributária)
     */
    public static function emitirDocumento(
        Empresa $empresa,
        Pessoa $destinatario,
        string $modelo,
        array $itens,
        string $origemTipo = 'vendas',
        ?string $origemId = null
    ): DocumentoFiscal {
        $totalProdutos = 0.00;
        $totalServicos = 0.00;
        $totalIcms = 0.00;
        $totalPis = 0.00;
        $totalCofins = 0.00;
        $totalIbs = 0.00;
        $totalCbs = 0.00;

        foreach ($itens as $item) {
            $vlr = (float) ($item['valor_total'] ?? 0.00);
            if (($item['tipo_item'] ?? 'PRODUTO') === 'SERVICO') {
                $totalServicos += $vlr;
            } else {
                $totalProdutos += $vlr;
            }

            $cfop = $item['cfop'] ?? '5102';
            $regra = RegraTributaria::where('empresa_id', $empresa->id)
                ->where('cfop', $cfop)
                ->where('is_ativo', true)
                ->first();

            if ($regra) {
                $totalIcms += round($vlr * ((float) $regra->aliquota_icms / 100), 2);
                $totalPis += round($vlr * ((float) $regra->aliquota_pis / 100), 2);
                $totalCofins += round($vlr * ((float) $regra->aliquota_cofins / 100), 2);
                $totalIbs += round($vlr * ((float) $regra->aliquota_ibs / 100), 2);
                $totalCbs += round($vlr * ((float) $regra->aliquota_cbs / 100), 2);
            }
        }

        $totalDoc = $totalProdutos + $totalServicos;
        $ultimoNumero = DocumentoFiscal::where('empresa_id', $empresa->id)->max('numero_documento') ?? 1000;
        $chaveAcesso = '33' . now()->format('ym') . str_pad(preg_replace('/[^0-9]/', '', $empresa->cnpj), 14, '0', STR_PAD_LEFT) . str_pad($modelo, 2, '0', STR_PAD_LEFT) . '001' . str_pad((string) ($ultimoNumero + 1), 9, '0', STR_PAD_LEFT) . '1' . rand(10000000, 99999999) . rand(0, 9);

        $doc = new DocumentoFiscal();
        $doc->forceFill([
            'id' => (string) Str::uuid(),
            'tenant_id' => $empresa->tenant_id,
            'empresa_id' => $empresa->id,
            'destinatario_id' => $destinatario->id,
            'origem_tipo' => $origemTipo,
            'origem_id' => $origemId,
            'modelo_documento' => $modelo,
            'serie' => 1,
            'numero_documento' => $ultimoNumero + 1,
            'chave_acesso' => substr($chaveAcesso, 0, 44),
            'status' => 'AUTORIZADO',
            'valor_total_produtos' => $totalProdutos,
            'valor_total_servicos' => $totalServicos,
            'valor_total_documento' => $totalDoc,
            'valor_total' => $totalDoc,
            'valor_icms' => $totalIcms,
            'valor_pis' => $totalPis,
            'valor_cofins' => $totalCofins,
            'valor_ibs' => $totalIbs,
            'valor_cbs' => $totalCbs,
            'data_emissao' => now(),
            'data_autorizacao' => now(),
        ]);
        $doc->save();

        return $doc;
    }

    public static function processarTransmissaoSefaz(DocumentoFiscal $documento): void
    {
        try {
            $driver = self::instanciarDriver($documento->tenant_id, $documento->empresa_id);

            $documento->refresh();
            $xmlAssinado = $documento->xml_conteudo;

            if (empty($xmlAssinado)) {
                throw new Exception("O XML assinado não foi gravado na base de dados (Null).");
            }

            $reflection = new \ReflectionClass($driver);
            $property = $reflection->getProperty('tools');
            $property->setAccessible(true);
            $tools = $property->getValue($driver);

            $tools->model($documento->modelo_documento);

            $idLote = str_pad((string) 100, 15, '0', STR_PAD_LEFT);
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

            $danfce = new Danfce($documento->xml_conteudo, '', 2);
            $danfce->creditsIntegratorFooter('Scalle ERP - BTEC');
            $danfce->printParameters(80, 58);

            $pdf = $danfce->render();
            return base64_encode($pdf);
        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error("Erro DANFCE: " . $e->getMessage());
            return null;
        }
    }
}
