<?php

namespace App\Services;

use App\Models\ContaFinanceira;
use App\Models\MovimentacaoExtrato;
use App\Models\PedidoVenda;
use App\Models\PedidoVendaItem;
use App\Models\PedidoVendaPagamento;
use App\Models\TituloFinanceiro;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VendaService
{
    /**
     * Cria e fatura uma venda/PDV com baixa atômica de estoque e integração financeira
     */
    public static function faturarVenda(
        string $empresaId,
        string $clienteId,
        string $depositoId,
        User $vendedor,
        array $itensPayload,
        array $pagamentosPayload,
        float $descontoGeral = 0.00,
        string $tipoDocumento = 'PDV'
    ): PedidoVenda {
        return DB::transaction(function () use (
            $empresaId,
            $clienteId,
            $depositoId,
            $vendedor,
            $itensPayload,
            $pagamentosPayload,
            $descontoGeral,
            $tipoDocumento
        ) {
            $tenantId = $vendedor->tenant_id;
            $pedidoId = (string) Str::uuid();
            $subtotalItens = 0.00;

            // Próximo número sequencial de venda da empresa
            $ultimoNumero = PedidoVenda::where('empresa_id', $empresaId)->max('numero_pedido') ?? 1000;
            $numeroPedido = $ultimoNumero + 1;

            // 1. Instanciar o Pedido
            $pedido = PedidoVenda::create([
                'id' => $pedidoId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'vendedor_id' => $vendedor->id,
                'deposito_saida_id' => $depositoId,
                'tipo_documento' => $tipoDocumento,
                'numero_pedido' => $numeroPedido,
                'status' => 'APROVADO',
                'data_emissao' => now()->toDateString(),
                'valor_subtotal_itens' => 0.00,
                'valor_desconto' => $descontoGeral,
                'valor_total_liquido' => 0.00,
            ]);

            // 2. Processar Itens e Baixa Atômica no WMS
            foreach ($itensPayload as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $precoUnitario = (float) $itemData['preco_unitario'];
                $descontoItem = (float) ($itemData['desconto_unitario'] ?? 0.00);
                $precoFinal = max(0.00, $precoUnitario - $descontoItem);
                
                $totalBruto = $quantidade * $precoUnitario;
                $totalLiquido = $quantidade * $precoFinal;
                $subtotalItens += $totalLiquido;

                PedidoVendaItem::create([
                    'pedido_id' => $pedido->id,
                    'item_id' => $itemData['item_id'],
                    'quantidade' => $quantidade,
                    'preco_tabela_unitario' => $precoUnitario,
                    'valor_desconto_unitario' => $descontoItem,
                    'preco_venda_unitario' => $precoFinal,
                    'valor_total_bruto' => $totalBruto,
                    'valor_total_liquido' => $totalLiquido,
                    'lote' => $itemData['lote'] ?? null,
                ]);

                // Baixa de estoque via EstoqueService com lock pessimista
                EstoqueService::movimentar(
                    $depositoId,
                    $itemData['item_id'],
                    $quantidade,
                    'SAIDA_VENDA',
                    $vendedor->id,
                    'vendas',
                    $pedido->id,
                    $itemData['lote'] ?? null,
                    $precoFinal
                );
            }

            $totalLiquidoPedido = max(0.00, $subtotalItens - $descontoGeral);

            // 3. Processar Pagamentos e Validação de Valor
            $totalPago = 0.00;
            $contaPadrao = ContaFinanceira::where('tenant_id', $tenantId)->where('is_ativo', true)->first();

            foreach ($pagamentosPayload as $pagamentoData) {
                $valorPago = (float) $pagamentoData['valor_pago'];
                $totalPago += $valorPago;

                PedidoVendaPagamento::create([
                    'pedido_id' => $pedido->id,
                    'forma_pagamento' => $pagamentoData['forma_pagamento'],
                    'parcelas' => $pagamentoData['parcelas'] ?? 1,
                    'valor_pago' => $valorPago,
                    'valor_troco' => (float) ($pagamentoData['valor_troco'] ?? 0.00),
                    'status' => 'CONFIRMADO',
                ]);
            }

            if ($totalPago < $totalLiquidoPedido) {
                throw new Exception("O total pago (R$ {$totalPago}) é menor que o total líquido da venda (R$ {$totalLiquidoPedido}).");
            }

            // 4. Integração Financeira: Gerar Título Liquidado no Contas a Receber
            $titulo = TituloFinanceiro::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pessoa_id' => $clienteId,
                'conta_padrao_id' => $contaPadrao?->id,
                'natureza' => 'RECEBER',
                'documento_numero' => "PDV-{$numeroPedido}",
                'parcela_numero' => 1,
                'total_parcelas' => 1,
                'origem_tipo' => 'vendas',
                'origem_id' => $pedido->id,
                'data_emissao' => now()->toDateString(),
                'data_vencimento' => now()->toDateString(),
                'data_liquidacao' => now()->toDateString(),
                'valor_original' => $totalLiquidoPedido,
                'valor_desconto' => $descontoGeral,
                'valor_pago_acumulado' => $totalLiquidoPedido,
                'valor_saldo_aberto' => 0.00,
                'status' => 'LIQUIDADO',
                'historico' => "Recebimento no PDV Balcão - Pedido #{$numeroPedido}",
            ]);

            // Se houver conta bancária/caixa cadastrado, registra a entrada no extrato
            if ($contaPadrao) {
                $saldoAnterior = (float) $contaPadrao->saldo_atual;
                $saldoPosterior = $saldoAnterior + $totalLiquidoPedido;
                $contaPadrao->update(['saldo_atual' => $saldoPosterior]);

                MovimentacaoExtrato::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'conta_financeira_id' => $contaPadrao->id,
                    'titulo_id' => $titulo->id,
                    'usuario_id' => $vendedor->id,
                    'tipo_movimento' => 'ENTRADA',
                    'valor' => $totalLiquidoPedido,
                    'saldo_anterior' => $saldoAnterior,
                    'saldo_posterior' => $saldoPosterior,
                    'forma_pagamento' => $pagamentosPayload[0]['forma_pagamento'] ?? 'DINHEIRO',
                    'data_movimento' => now()->toDateString(),
                    'descricao' => "Entrada PDV: Pedido #{$numeroPedido}",
                    'created_at' => now(),
                ]);
            }

            // Atualizar valores consolidados do pedido
            $pedido->update([
                'valor_subtotal_itens' => $subtotalItens,
                'valor_total_liquido' => $totalLiquidoPedido,
                'status' => 'FATURADO',
            ]);

            return $pedido;
        });
    }
}