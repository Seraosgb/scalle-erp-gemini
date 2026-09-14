<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

class SefazNfeDriver implements FiscalDriverInterface
{
    protected ?Tools $tools = null;

    public function __construct()
    {
        // Nasce limpo. A injeção pesada (Certificado) ocorre apenas no método configurar()
    }

    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2): self
    {
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $configJson = json_encode([
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb,
            "razaosocial" => "Scalle Operacional",
            "siglaUF" => $uf,
            "cnpj" => "00000000000000",
            "schemes" => "PL_009_V4",
            "versao" => "4.00"
        ]);

        $this->tools = new Tools($configJson, $certificado);
        $this->tools->model('55'); // Define NFe (Modelo 55)

        return $this;
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal
    {
        if (!$this->tools) {
            throw new \Exception("Driver Fiscal não configurado. Chame o método configurar() antes de emitir.");
        }

        // Lógica de montagem e transmissão do XML entrará aqui
        return new DocumentoFiscal();
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return true; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return true; }
}
