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
    public static function pingSefaz(string $tenantId, string $empresaId, string $uf = 'RJ'): array
    {
        $certificadoDb = CertificadoA1::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('is_ativo', true)
            ->first();

        if (!$certificadoDb) {
            throw new Exception("Nenhum Certificado A1 ativo encontrado.");
        }

        try {
            $pfxBinario = Crypt::decrypt($certificadoDb->arquivo_binario_criptografado);
            $senha = Crypt::decrypt($certificadoDb->senha_criptografada);
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            throw new Exception("Falha ao descriptografar a chave privada do certificado.");
        }

        $tpAmb = $certificadoDb->ambiente_emissao === 'PRODUCAO' ? 1 : 2;
        $cnpj = $certificadoDb->cnpj_certificado;

        $driver = new NfePhpDriver();
        $driver->configurar($pfxBinario, $senha, $uf, $tpAmb, $cnpj);

        return $driver->verificarStatusSefaz($uf, $tpAmb);
    }

    public static function prepararDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens): DocumentoFiscal
    {
        throw new Exception("Stub de emissão - A implementar.");
    }

    public static function processarTransmissaoSefaz(DocumentoFiscal $documento): void {}
}
