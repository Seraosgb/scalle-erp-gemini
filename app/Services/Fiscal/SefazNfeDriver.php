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
        // Tratamento para evitar que o NFePHP quebre caso o dummy file não exista no dev local ainda
        if (!file_exists($certificadoPfx)) {
            $certificadoPfx = file_get_contents(__DIR__ . '/dummy.pfx') ?: '';
            // Mock temporário. No fluxo real, passaremos o binário descriptografado do banco
            $certificado = Certificate::readPfx($certificadoPfx, $senha);
        } else {
            $certificado = Certificate::readPfx(file_get_contents($certificadoPfx), $senha);
        }

        // Configuração padrão estrutural para Homologação (tpAmb = 2)
        $configJson = json_encode([
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => 2,
            "razaosocial" => "Scalle Teste e Homologação",
            "siglaUF" => $uf,
            "cnpj" => "00000000000000",
            "schemes" => "PL_009_V4",
            "versao" => "4.00"
        ]);

        $this->tools = new Tools($configJson, $certificado);
        $this->tools->model('55'); // Define NFe (Modelo 55) por padrão
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal
    {
        // TODO: Mapear os dadosEmissao para a classe Make do NFePHP
        // TODO: Assinar XML -> $this->tools->signNFe($xml);
        // TODO: Transmitir Lote -> $this->tools->sefazEnviaLote([$xmlAssinado], 1);

        // Retorna um DocumentoFiscal temporário para manter o contrato até a implementação das tags
        return new DocumentoFiscal();
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool
    {
        // TODO: Implementar envio do evento de cancelamento
        return true;
    }

    public function consultar(string $chaveAcesso): array
    {
        // TODO: Implementar consulta de recibo/chave
        return [];
    }

    public function corrigir(string $chaveAcesso, string $correcao): bool
    {
        // TODO: Implementar envio de evento CC-e
        return true;
    }
}
