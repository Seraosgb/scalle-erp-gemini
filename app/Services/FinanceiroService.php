<?php

namespace App\Services;

use App\Models\ContaFinanceira;
use App\Models\MovimentacaoExtrato;
use App\Models\TituloFinanceiro;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FinanceiroService
{
    /**
     * Contrato oficial entre domínios para geração de Contas a Pagar / Receber
     */
    public static function registrarTitulo(array $dados): TituloFinanceiro
    {
        return TituloFinanceiro::create([
            'id' => $dados['id'] ?? (string) Str::uuid(),
            'tenant_id' => $dados['tenant_id'],
            'empresa_id' => $dados['empresa_id'],
            'pessoa_id' => $dados['pessoa_id'],
            'conta_padrao_id' => $dados['conta_padrao_id'] ?? null,
            'plano_conta_id' => $dados['plano_conta_id'] ?? null,
            'centro_custo_id' => $dados['centro_custo_id'] ?? null,
            'natureza' => $dados['natureza'], // 'PAGAR' ou 'RECEBER'
            'documento_numero' => $dados['documento_numero'] ?? ('DOC-' . strtoupper(substr((string) Str::uuid(), 0, 6))),
            'parcela_numero' => $dados['parcela_numero'] ?? 1,
            'total_parcelas' => $dados['total_parcelas'] ?? 1,
            'origem_tipo' => $dados['origem_tipo'] ?? 'manual',
            'origem_id' => $dados['origem_id'] ?? null,
            'data_emissao' => $dados['data_emissao'] ?? now()->toDateString(),
            'data_vencimento' => $dados['data_vencimento'],
            'valor_original' => (float) $dados['valor_original'],
            'valor_saldo_aberto' => (float) ($dados['valor_saldo_aberto'] ?? $dados['valor_original']),
            'valor_pago_acumulado' => (float) ($dados['valor_pago_acumulado'] ?? 0.00),
            'status' => $dados['status'] ?? 'ABERTO',
            'historico' => $dados['historico'] ?? null,
        ]);
    }

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
            $conta = ContaFinanceira::where('id', $contaFinanceiraId)->lockForUpdate()->firstOrFail();

            $saldoAnterior = (float) $conta->saldo_atual;
            $tipoMovimento = ($titulo->natureza === 'RECEBER') ? 'ENTRADA' : 'SAIDA';
            $saldoPosterior = ($tipoMovimento === 'ENTRADA') ? ($saldoAnterior + $valorPago) : ($saldoAnterior - $valorPago);

            $conta->update(['saldo_atual' => $saldoPosterior]);

            MovimentacaoExtrato::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $titulo->tenant_id,
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
