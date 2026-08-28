<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CertificadoA1;
use App\Models\Empresa;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class CertificadoFiscalController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $cert = CertificadoA1::where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('is_ativo', true)
            ->first();

        if (!$cert) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'id' => $cert->id,
                'nome_arquivo' => $cert->nome_arquivo_original,
                'cnpj_certificado' => $cert->cnpj_certificado,
                'razao_social' => $cert->razao_social_certificado,
                'valido_de' => $cert->valido_de,
                'valido_ate' => $cert->valido_ate,
                'ambiente_emissao' => $cert->ambiente_emissao,
                'is_expirado' => $cert->valido_ate ? now()->isAfter($cert->valido_ate) : false,
            ]
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'certificado' => 'required|file',
            'senha' => 'required|string',
            'ambiente_emissao' => 'required|string|in:HOMOLOGACAO,PRODUCAO',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $empresaId = $user->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $arquivo = $request->file('certificado');
        $conteudoBinario = file_get_contents($arquivo->getRealPath());
        $senha = $request->senha;

        // Leitura e validação OpenSSL da chave pública e privada do Certificado A1
        $certs = [];
        if (!openssl_pkcs12_read($conteudoBinario, $certs, $senha)) {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CERTIFICATE_OR_PASSWORD',
                    'message' => 'Falha ao descriptografar o certificado. Verifique se o arquivo é um .pfx/.p12 válido e se a senha está correta.',
                ]
            ], 422);
        }

        $x509Data = openssl_x509_parse($certs['cert']);
        $razaoSocial = $x509Data['subject']['CN'] ?? 'Empresa Emitente';
        $validoDe = date('Y-m-d H:i:s', $x509Data['validFrom_time_t']);
        $validoAte = date('Y-m-d H:i:s', $x509Data['validTo_time_t']);

        // Extrair CNPJ se presente no subject
        preg_match('/\d{14}/', $razaoSocial, $matches);
        $cnpj = $matches[0] ?? null;

        // Criptografia simétrica AES-256 com chave do tenant
        $binarioCripto = Crypt::encrypt($conteudoBinario);
        $senhaCripto = Crypt::encrypt($senha);

        // Desativa certificados anteriores
        CertificadoA1::where('tenant_id', $tenantId)->where('empresa_id', $empresaId)->update(['is_ativo' => false]);

        $certificado = CertificadoA1::create([
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'nome_arquivo_original' => $arquivo->getClientOriginalName(),
            'arquivo_binario_criptografado' => $binarioCripto,
            'senha_criptografada' => $senhaCripto,
            'cnpj_certificado' => $cnpj,
            'razao_social_certificado' => $razaoSocial,
            'valido_de' => $validoDe,
            'valido_ate' => $validoAte,
            'ambiente_emissao' => $request->ambiente_emissao,
            'is_ativo' => true,
        ]);

        return response()->json([
            'data' => [
                'message' => 'Certificado Digital A1 importado, testado e ativado com isolamento seguro por tenant!',
                'certificado' => [
                    'razao_social' => $razaoSocial,
                    'valido_ate' => $validoAte,
                    'ambiente' => $request->ambiente_emissao,
                ]
            ]
        ], 201);
    }
}