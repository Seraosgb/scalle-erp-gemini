<?php

namespace App\Services;

use App\Models\ContaFinanceira;
use App\Models\MovimentacaoExtrato;
use App\Models\TituloFinanceiro;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FinanceiroService
{
    /**
     * Realiza a liquidação (total ou parcial) de um título e atualiza o saldo da conta financeira
     */
    public static function liquidarTitulo(
        TituloFinanceiro $titulo,
        string $contaFinanceiraId,
        float $valorPago,
        float $juros = 0.00,
        float $multa = 0.00,
        float $desconto = 0.00,
        string $formaPagamento = 'PIX',
        ?User $usuario = null
    ): TituloFinanceiro {
        return DB::transaction(function () use (
            $titulo,
            $contaFinanceiraId,
            $valorPago,
            $juros,
            $multa,
            $desconto,
            $formaPagamento,
            $usuario
        ) {
            // 1. Bloqueio pessimista da conta financeira para garantir concorrência
            $conta = ContaFinanceira::where('id', $contaFinanceiraId)->lockForUpdate()->firstOrFail();

            $saldoAnterior = (float) $conta->saldo_atual;
            $tipoMovimento = ($titulo->natureza === 'RECEBER') ? 'ENTRADA' : 'SAIDA';
            $saldoPosterior = ($tipoMovimento === 'ENTRADA') ? ($saldoAnterior + $valorPago) : ($saldoAnterior - $valorPago);

            // 2. Atualizar saldo da conta
            $conta->update(['saldo_atual' => $saldoPosterior]);

            // 3. Gravar Movimentação no Extrato
            MovimentacaoExtrato::create([
                'id' => (string) Str::uuid(),
                'conta_financeira_id' => $conta->id,
                'titulo_id' => $titulo->id,
                'usuario_id' => $usuario?->id,
                'tipo_movimento' => $tipoMovimento,
                'valor' => $valorPago,
                'saldo_anterior' => $saldoAnterior,
                'saldo_posterior' => $saldoPosterior,
                'forma_pagamento' => $formaPagamento,
                'data_movimento' => now()->toDateString(),
                'descricao' => "Liquidação ({$titulo->natureza}): Doc #{$titulo->documento_numero}",
                'created_at' => now(),
            ]);

            // 4. Atualizar valores do título
            $novoPagoAcumulado = (float) $titulo->valor_pago_acumulado + $valorPago;
            $valorEfetivoTitulo = ((float) $titulo->valor_original + $juros + $multa) - $desconto;
            $novoSaldoAberto = max(0.00, $valorEfetivoTitulo - $novoPagoAcumulado);
            $novoStatus = ($novoSaldoAberto <= 0.00) ? 'LIQUIDADO' : 'PARCIAL';

            $titulo->update([
                'valor_juros' => (float) $titulo->valor_juros + $juros,
                'valor_multa' => (float) $titulo->valor_multa + $multa,
                'valor_desconto' => (float) $titulo->valor_desconto + $desconto,
                'valor_pago_acumulado' => $novoPagoAcumulado,
                'valor_saldo_aberto' => $novoSaldoAberto,
                'status' => $novoStatus,
                'data_liquidacao' => ($novoStatus === 'LIQUIDADO') ? now()->toDateString() : null,
            ]);

            return $titulo;
        });
    }
}