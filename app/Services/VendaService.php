<?php

namespace App\Services;

use App\Models\PedidoVenda;
use App\Models\PedidoVendaItem;
use App\Models\PedidoVendaPagamento;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VendaService
{
    /**
     * Cria e fatura uma venda/PDV com baixa atômica de estoque
     */
    public static function faturarVenda(
        string $empresaId,
        string $clienteId,
        string $depositoId,
        User $vendedor,
        array $itensPayload,
        array $pagamentosPayload,
        float $descontoGeral = 0.00,
        string $tipoDocumento = 'PEDIDO'
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
            $pedidoId = (string) Str::uuid();
            $subtotalItens = 0.00;

            // 1. Instanciar o Pedido
            $pedido = PedidoVenda::create([
                'id' => $pedidoId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'vendedor_id' => $vendedor->id,
                'deposito_saida_id' => $depositoId,
                'tipo_documento' => $tipoDocumento,
                'status' => 'APROVADO',
                'data_emissao' => now()->toDateString(),
                'valor_subtotal_itens' => 0.00,
                'valor_desconto' => $descontoGeral,
                'valor_total_liquido' => 0.00,
            ]);

            // 2. Processar Itens
            foreach ($itensPayload as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $precoUnitario = (float) $itemData['preco_unitario'];
                $descontoItem = (float) ($itemData['desconto_unitario'] ?? 0.00);
                $precoFinal = $precoUnitario - $descontoItem;
                
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

                // Baixa imediata de estoque caso seja fatura direta
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

            // 3. Processar Pagamentos
            $totalPago = 0.00;
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

            // Atualizar valores consolidados
            $pedido->update([
                'valor_subtotal_itens' => $subtotalItens,
                'valor_total_liquido' => $totalLiquidoPedido,
                'status' => 'FATURADO',
            ]);

            return $pedido;
        });
    }
}