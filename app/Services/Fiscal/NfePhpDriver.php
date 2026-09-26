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

    /**
     * Instancia a comunicação com a SEFAZ baseada no Certificado A1 do Tenant.
     */
    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2): self
    {
        // Configuração JSON exigida pelo NFePHP
        $config = [
            "atualizacao" => now()->format('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb, // 1 = Producao, 2 = Homologacao
            "razaosocial" => "Empresa Emissora", // Será sobrescrito no XML
            "siglaUF" => $uf,
            "cnpj" => "", // Será sobrescrito no XML
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => "",
            "CSCid" => ""
        ];

        $jsonConfig = json_encode($config);
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $this->tools = new Tools($jsonConfig, $certificado);

        // Desativa a validação estrita de SSL em homologação para evitar erros de cadeia de rede
        $this->tools->disableCertValidation(true);

        return $this;
    }

    /**
     * O "Hello World" Fiscal: Verifica se a SEFAZ do estado está online.
     */
    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
            $this->tools->model('55'); // 55 = NF-e
            $response = $this->tools->sefazStatus($uf, $tpAmb);

            $standardize = new Standardize();
            $std = $standardize->toStd($response);

            return [
                'status_code' => $std->cStat, // 107 é o sucesso
                'motivo' => $std->xMotivo,
                'tempo_medio' => $std->tMed ?? 0,
                'ambiente' => $std->tpAmb == 1 ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'
            ];
        } catch (Exception $e) {
            return [
                'status_code' => 500,
                'motivo' => 'Falha de Comunicação: ' . $e->getMessage()
            ];
        }
    }

    // --- Implementações obrigatórias da FiscalDriverInterface (Deixe vazio por enquanto) ---
    public function emitir(array $dadosEmissao): DocumentoFiscal { throw new Exception("Não implementado nesta etapa."); }
    public function cancelar(string $chaveAcesso, string $justificativa): bool { return false; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return false; }
}
