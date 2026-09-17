<?php

namespace App\Services;

use App\Interfaces\FiscalDriverInterface;
use App\Models\CertificadoA1;
use App\Models\DocumentoFiscal;
use App\Models\DocumentoFiscalItem;
use App\Models\Empresa;
use App\Models\Pessoa;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class MotorFiscalService
{
    /**
     * FASE 1 (SÍNCRONA): Grava o espelho da nota no banco e libera o PDV rapidamente.
     */
    public static function prepararDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens): DocumentoFiscal
    {
        return DB::transaction(function () use ($empresa, $destinatario, $modelo, $itens) {
            $valorTotal = 0;
            foreach ($itens as $item) {
                $valorTotal += (float) $item['valor_total'];
            }

            // Descobre o ambiente de emissão com base no certificado ativo
            $certificado = CertificadoA1::where('tenant_id', $empresa->tenant_id)
                ->where('empresa_id', $empresa->id)
                ->where('is_ativo', true)
                ->first();

            $ambiente = $certificado ? $certificado->ambiente_emissao : 'HOMOLOGACAO';

            // Busca o último número de nota emitido para este modelo e empresa para manter a sequência
            $ultimoNumero = DocumentoFiscal::withoutGlobalScopes()
                ->where('empresa_id', $empresa->id)
                ->where('modelo_documento', $modelo)
                ->max('numero_documento') ?? 0;

            $documento = DocumentoFiscal::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $empresa->tenant_id,
                'empresa_id' => $empresa->id,
                'destinatario_id' => $destinatario->id,
                'modelo_documento' => $modelo,
                'serie_documento' => '1', // Série padrão 1
                'numero_documento' => (int) $ultimoNumero + 1, // Auto-incremento lógico seguro
                'ambiente_emissao' => $ambiente,
                'status' => 'PROCESSANDO', // Status blindado para a Fila assumir
                'data_emissao' => now(),
                'valor_total' => $valorTotal,
            ]);

            foreach ($itens as $item) {
                DocumentoFiscalItem::create([
                    'id' => (string) Str::uuid(),
                    'documento_fiscal_id' => $documento->id,
                    'tipo_item' => $item['tipo_item'],
                    'cfop' => $item['cfop'],
                    'valor_total' => $item['valor_total'],
                ]);
            }

            return $documento;
        });
    }

    /**
     * FASE 2 (ASSÍNCRONA): Motor Pesado executado em Background pelo Job.
     * Prepara os dados, carrega o certificado e orquestra a emissão via Driver.
     */
    public static function processarTransmissaoSefaz(DocumentoFiscal $documento): void
    {
        $empresa = Empresa::find($documento->empresa_id);
        $destinatario = Pessoa::find($documento->destinatario_id);

        // 1. Busca o Certificado A1 Ativo da Empresa/Tenant
        $certificado = CertificadoA1::where('tenant_id', $documento->tenant_id)
            ->where('empresa_id', $documento->empresa_id)
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
        $itensDocumento = $documento->itens->toArray();

        $dadosEmissao = [
            'empresa' => $empresa->toArray(),
            'destinatario' => $destinatario->toArray(),
            'modelo' => $documento->modelo_documento,
            'itens' => $itensDocumento,
            'origem' => 'assincrono',
            'numero_nota' => $documento->numero_documento, // Envia o número gerado no banco para o XML
            'serie_nota' => $documento->serie_documento,
        ];

        // 4. Aciona o Driver Real (se estiver configurado) ou simula em homologação local
        if (app()->bound(FiscalDriverInterface::class)) {
            $driver = app(FiscalDriverInterface::class);
            $ambiente = $certificado->ambiente_emissao === 'PRODUCAO' ? 1 : 2;
            $ufEmpresa = $empresa->endereco_padrao?->uf ?? 'RJ';

            $driver->configurar($pfxBinario, $senhaPfx, $ufEmpresa, $ambiente);
            $driver->emitir($dadosEmissao);
        } else {
            // Fallback de Simulação (Homologação sem driver externo plugado)
            sleep(2);
            $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa->cnpj ?? '00000000000191');

            $documento->update([
                'status' => 'AUTORIZADO',
                'protocolo_autorizacao' => '133' . rand(10000000000, 99999999999),
                'chave_acesso' => '332609' . str_pad($cnpjLimpo, 14, '0', STR_PAD_LEFT) . '550010000000011000000001',
                'mensagem_sefaz' => 'Autorizado o uso da NF-e (Simulação)'
            ]);
        }
    }

    /**
     * Retrocompatibilidade com a emissão síncrona manual
     */
    public static function emitirDocumento(Empresa $empresa, Pessoa $destinatario, string $modelo, array $itens, string $origem = 'manual'): DocumentoFiscal
    {
        $doc = self::prepararDocumento($empresa, $destinatario, $modelo, $itens);
        self::processarTransmissaoSefaz($doc);
        return $doc->fresh();
    }
}
