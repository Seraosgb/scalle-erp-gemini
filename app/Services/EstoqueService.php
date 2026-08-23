<?php

namespace App\Services;

use App\Models\EstoqueDeposito;
use App\Models\MovimentacaoEstoque;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EstoqueService
{
    /**
     * Executa movimentação atômica de entrada ou saída com registro de Kardex
     */
    public static function movimentar(
        string $depositoId,
        string $itemId,
        float $quantidade,
        string $tipoMovimento,
        ?string $usuarioId = null,
        ?string $documentoTipo = null,
        ?string $documentoId = null,
        ?string $lote = null,
        float $custoUnitario = 0.00
    ): EstoqueDeposito {
        return DB::transaction(function () use (
            $depositoId,
            $itemId,
            $quantidade,
            $tipoMovimento,
            $usuarioId,
            $documentoTipo,
            $documentoId,
            $lote,
            $custoUnitario
        ) {
            // 1. Bloqueio pessimista do registro de saldo para garantir concorrência segura
            $registroEstoque = EstoqueDeposito::where('deposito_id', $depositoId)
                ->where('item_id', $itemId)
                ->when($lote, fn($q) => $q->where('lote', $lote))
                ->lockForUpdate()
                ->first();

            if (!$registroEstoque) {
                $registroEstoque = EstoqueDeposito::create([
                    'id' => (string) Str::uuid(),
                    'deposito_id' => $depositoId,
                    'item_id' => $itemId,
                    'lote' => $lote,
                    'quantidade_saldo' => 0.0000,
                    'quantidade_reservada' => 0.0000,
                ]);
            }

            $saldoAnterior = (float) $registroEstoque->quantidade_saldo;
            $isSaida = in_array($tipoMovimento, ['SAIDA_VENDA', 'SAIDA_OS', 'TRANSFERENCIA_SAIDA']);

            if ($isSaida && ($saldoAnterior < $quantidade)) {
                throw new Exception("Saldo insuficiente no depósito para o item selecionado. Disponível: {$saldoAnterior}, Solicitado: {$quantidade}");
            }

            $saldoPosterior = $isSaida ? ($saldoAnterior - $quantidade) : ($saldoAnterior + $quantidade);

            // 2. Atualizar o saldo físico
            $registroEstoque->update([
                'quantidade_saldo' => $saldoPosterior,
            ]);

            // 3. Gravar na trilha do Kardex
            MovimentacaoEstoque::create([
                'id' => (string) Str::uuid(),
                'deposito_id' => $depositoId,
                'item_id' => $itemId,
                'usuario_id' => $usuarioId,
                'tipo_movimento' => $tipoMovimento,
                'quantidade' => $quantidade,
                'saldo_anterior' => $saldoAnterior,
                'saldo_posterior' => $saldoPosterior,
                'custo_unitario' => $custoUnitario,
                'documento_origem_tipo' => $documentoTipo,
                'documento_origem_id' => $documentoId,
                'created_at' => now(),
            ]);

            return $registroEstoque;
        });
    }
}