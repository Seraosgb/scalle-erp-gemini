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

    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2, string $cnpj = ''): self
    {
        if (!extension_loaded('soap')) {
            throw new Exception("A extensão SOAP do PHP não está ativada. Ative 'soap' nas extensões de PHP da Hostoo.");
        }

        $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpj);
        if (empty($cnpjLimpo) || strlen($cnpjLimpo) !== 14) {
            throw new Exception("CNPJ do emissor inválido ou ausente para configurar a SEFAZ.");
        }

        $config = [
            "atualizacao" => now()->format('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb,
            "razaosocial" => "Empresa Emissora",
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
        $this->tools->disableCertValidation(true);

        return $this;
    }

    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
            $this->tools->model('55'); // NF-e
            $response = $this->tools->sefazStatus($uf, $tpAmb);

            $standardize = new Standardize();
            $std = $standardize->toStd($response);

            return [
                'status_code' => $std->cStat,
                'motivo' => $std->xMotivo,
                'tempo_medio' => $std->tMed ?? 0,
                'ambiente' => $std->tpAmb == 1 ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'
            ];
        } catch (\Throwable $e) {
            return [
                'status_code' => 500,
                'motivo' => 'Falha NFePHP: ' . $e->getMessage()
            ];
        }
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal { throw new Exception("Não implementado."); }
    public function cancelar(string $chaveAcesso, string $justificativa): bool { return false; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return false; }
}
