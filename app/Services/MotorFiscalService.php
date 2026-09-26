<?php

namespace App\Services;

use App\Models\CertificadoA1;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Services\Fiscal\NfePhpDriver;
use Illuminate\Support\Facades\Crypt;
use Exception;

class MotorFiscalService
{
    /**
     * Testa a comunicação com a SEFAZ usando o certificado real do Tenant logado.
     */
    public static function pingSefaz(string $tenantId, string $empresaId, string $uf = 'RJ'): array
    {
        $certificadoDb = CertificadoA1::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('is_ativo', true)
            ->first();

        if (!$certificadoDb) {
            throw new Exception("Nenhum Certificado A1 ativo encontrado para esta empresa.");
        }

        // Descriptografia simétrica AES-256
        $pfxBinario = Crypt::decrypt($certificadoDb->arquivo_binario_criptografado);
        $senha = Crypt::decrypt($certificadoDb->senha_criptografada);

        // Forçamos tpAmb = 2 (Homologação) conforme seu pedido
        $tpAmb = 2;

        $driver = new NfePhpDriver();
        $driver->configurar($pfxBinario, $senha, $uf, $tpAmb);

        return $driver->verificarStatusSefaz($uf, $tpAmb);
    }

    // Mantém as assinaturas das funções originais exigidas pelo FiscalController
    public static function prepararDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens): DocumentoFiscal
    {
        throw new Exception("Stub de emissão - A implementar.");
    }

    public static function processarTransmissaoSefaz(DocumentoFiscal $documento): void {}
}
