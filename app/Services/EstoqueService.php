<?php

namespace App\Services;

use App\Models\EstoqueDeposito;
use App\Models\MovimentacaoEstoque;
use App\Models\TransferenciaEstoque;
use App\Models\User;
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
            $isSaida = in_array($tipoMovimento, [
                'SAIDA_VENDA', 
                'SAIDA_OS', 
                'TRANSFERENCIA_SAIDA', 
                'SAIDA_PRODUCAO'
            ]);

            // 1. Resolução Automática de Lote via FEFO/FIFO se não informado
            if ($isSaida && empty($lote)) {
                $loteSugerido = self::resolverLoteFefo($depositoId, $itemId, $quantidade);
                if ($loteSugerido) {
                    $lote = $loteSugerido->lote;
                }
            }

            // 2. Bloqueio pessimista do registro de saldo
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

            if ($isSaida && ($saldoAnterior < $quantidade)) {
                throw new Exception("Saldo insuficiente no almoxarifado selecionado. Disponível: {$saldoAnterior}, Solicitado: {$quantidade}");
            }

            $saldoPosterior = $isSaida ? ($saldoAnterior - $quantidade) : ($saldoAnterior + $quantidade);

            // 3. Atualizar o saldo físico
            $registroEstoque->update([
                'quantidade_saldo' => $saldoPosterior,
            ]);

            // 4. Trilha Kardex
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
                'motivo' => $lote ? "Lote: {$lote}" : "Movimentação Geral",
                'created_at' => now(),
            ]);

            return $registroEstoque;
        });
    }

    /**
     * Sugere o melhor lote para saída seguindo FEFO (validade mais próxima) com fallback para FIFO
     */
    public static function resolverLoteFefo(string $depositoId, string $itemId, float $quantidade): ?EstoqueDeposito
    {
        $fefo = EstoqueDeposito::where('deposito_id', $depositoId)
            ->where('item_id', $itemId)
            ->whereNotNull('data_validade')
            ->where('quantidade_saldo', '>=', $quantidade)
            ->orderBy('data_validade', 'asc')
            ->first();

        if ($fefo) {
            return $fefo;
        }

        return EstoqueDeposito::where('deposito_id', $depositoId)
            ->where('item_id', $itemId)
            ->where('quantidade_saldo', '>=', $quantidade)
            ->orderBy('created_at', 'asc')
            ->first();
    }
}