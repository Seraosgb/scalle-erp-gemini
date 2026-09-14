<?php

namespace App\Services;

use App\Interfaces\FiscalDriverInterface;
use App\Models\CertificadoA1;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use Illuminate\Support\Facades\Crypt;
use Exception;
use Illuminate\Support\Str;

class MotorFiscalService
{
    /**
     * Prepara os dados, carrega o certificado e orquestra a emissão via Driver.
     */
    public static function emitirDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens, string $origem = 'manual'): DocumentoFiscal
    {
        // 1. Busca o Certificado A1 Ativo da Empresa/Tenant
        $certificado = CertificadoA1::where('tenant_id', $empresa->tenant_id)
            ->where('empresa_id', $empresa->id)
            ->where('is_ativo', true)
            ->first();

        if (!$certificado) {
            throw new Exception("Nenhum Certificado Digital A1 ativo encontrado para esta empresa. Vá em Configurações > Fiscal e importe o certificado.");
        }

        if ($certificado->valido_ate && now()->isAfter($certificado->valido_ate)) {
            throw new Exception("O Certificado Digital A1 expirou em " . date('d/m/Y', strtotime($certificado->valido_ate)) . ".");
        }

        // 2. Descriptografa o cofre (AES-256)
        try {
            $pfxBinario = Crypt::decrypt($certificado->arquivo_binario_criptografado);
            $senhaPfx = Crypt::decrypt($certificado->senha_criptografada);
        } catch (Exception $e) {
            throw new Exception("Falha de segurança ao descriptografar o certificado. A chave de criptografia do sistema foi alterada?");
        }

        // 3. Monta o DTO padronizado para a Interface Fiscal
        $dadosEmissao = [
            'empresa' => $empresa->toArray(),
            'destinatario' => $destinatario->toArray(),
            'modelo' => $modelo,
            'itens' => $itens,
            'origem' => $origem,
            'numero_nota' => 0, // No futuro, buscaremos da tabela de série/numeração
        ];

        // 4. Resolve o Driver pelo container, configura dinamicamente e emite
        $driver = app(FiscalDriverInterface::class);

        $ambiente = $certificado->ambiente_emissao === 'PRODUCAO' ? 1 : 2;
        // Pega a UF do endereço da matriz (mockado para 'RJ' se não existir no payload)
        $ufEmpresa = $empresa->endereco_padrao->uf ?? 'RJ';

        $driver->configurar($pfxBinario, $senhaPfx, $ufEmpresa, $ambiente);

        // Retorna a promessa do DocumentoFiscal gerado pelo Driver
        return $driver->emitir($dadosEmissao);
    }
}
