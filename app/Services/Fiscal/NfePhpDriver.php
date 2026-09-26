<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Common\Standardize;
use Exception;

class NfePhpDriver implements FiscalDriverInterface
{
    private Tools $tools;

    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2, string $cnpj = '', string $razaoSocial = ''): self
    {
        $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpj);

        // O NFePHP exige um CNPJ válido de 14 dígitos na construção
        if (empty($cnpjLimpo) || strlen($cnpjLimpo) !== 14) {
            $cnpjLimpo = str_pad($cnpjLimpo, 14, '0', STR_PAD_LEFT);
        }

        $config = [
            "atualizacao" => now()->format('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb, // 1 = Producao, 2 = Homologacao
            "razaosocial" => empty($razaoSocial) ? "Empresa Emissora" : substr($razaoSocial, 0, 60),
            "siglaUF" => $uf,
            "cnpj" => $cnpjLimpo,
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => "",
            "CSCid" => ""
        ];

        $jsonConfig = json_encode($config);
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $this->tools = new Tools($jsonConfig, $certificado);

        return $this;
    }

    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
            $this->tools->model('55'); // 55 = NF-e

            // Dispara a requisição real para o Webservice da SEFAZ
            $response = $this->tools->sefazStatus($uf, $tpAmb);

            // A classe Standardize trata de remover o envelope SOAP e extrair a tag <retConsStatServ>
            $standardize = new Standardize();
            $std = $standardize->toStd($response);

            return [
                'status_code' => (int) ($std->cStat ?? 0),
                'motivo' => (string) ($std->xMotivo ?? 'Sem resposta decodificável da SEFAZ'),
                'tempo_medio' => (int) ($std->tMed ?? 0),
                'ambiente' => ((string) ($std->tpAmb ?? '')) === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'
            ];
        } catch (Exception $e) {
            return [
                'status_code' => 500,
                'motivo' => 'Falha de Comunicação SEFAZ: ' . $e->getMessage()
            ];
        }
    }

    // Stub para as futuras emissões
    public function emitir(array $dadosEmissao): DocumentoFiscal { throw new Exception("Não implementado."); }
    public function cancelar(string $chaveAcesso, string $justificativa): bool { return false; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return false; }
}
