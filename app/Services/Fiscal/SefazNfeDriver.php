<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

class SefazNfeDriver implements FiscalDriverInterface
{
    protected Tools $tools;

    public function __construct(string $certificadoPfx, string $senha, string $uf)
    {
        // O certificado será carregado do banco (CertificadoA1) pelo container de injeção de dependência
        $certificado = Certificate::readPfx($certificadoPfx, $senha);

        // Aqui entrará o JSON de configuração da SEFAZ (tpAmb = 2 para homologação)
        $configJson = json_encode([
            "atualizacao" => date('Y-m-d h:i:s'),
            "tpAmb" => 2, // 2 = Homologação, 1 = Produção
            "razaosocial" => "Empresa Teste",
            "cnpj" => "00000000000000",
            "siglaUF" => $uf,
            "schemes" => "PL_009_V4",
            "versao" => "4.00"
        ]);

        $this->tools = new Tools($configJson, $certificado);
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal
    {
        // Lógica de montagem da tag <NFe> usando o NFePHP (Make) virá aqui
        // Lógica de assinatura: $this->tools->signNFe($xml);
        // Lógica de transmissão: $this->tools->sefazEnviaLote([$xmlAssinado], 1);

        return new DocumentoFiscal();
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return true; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return true; }
}
