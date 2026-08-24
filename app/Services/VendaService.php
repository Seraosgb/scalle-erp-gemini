<?php

namespace App\Services;

use App\Models\AlcadaAprovacao;
use App\Models\ContaFinanceira;
use App\Models\MovimentacaoEstoque;
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
     * Fatura uma venda direta ou PDV com baixa atômica e financeiro
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

            $ultimoNumero = PedidoVenda::where('empresa_id', $empresaId)->max('numero_pedido') ?? 1000;
            $numeroPedido = $ultimoNumero + 1;

            // 1. Calcular subtotal e validar desconto
            foreach ($itensPayload as $itemData) {
                $subtotalItens += ((float) $itemData['quantidade'] * (float) $itemData['preco_unitario']);
            }

            $totalLiquidoPedido = max(0.00, $subtotalItens - $descontoGeral);
            $percentualDesconto = $subtotalItens > 0 ? ($descontoGeral / $subtotalItens) * 100 : 0.00;

            // 2. Validação do Motor de Alçadas
            $validacaoAlcada = MotorAlcadaService::validarDesconto(
                $vendedor,
                'pedidos',
                $pedidoId,
                $percentualDesconto,
                $descontoGeral
            );

            $statusInicial = $validacaoAlcada['requer_aprovacao'] ? 'AGUARDANDO_APROVACAO' : 'FATURADO';

            // 3. Criar Pedido
            $pedido = PedidoVenda::create([
                'id' => $pedidoId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'vendedor_id' => $vendedor->id,
                'deposito_saida_id' => $depositoId,
                'tipo_documento' => $tipoDocumento,
                'numero_pedido' => $numeroPedido,
                'status' => $statusInicial,
                'data_emissao' => now()->toDateString(),
                'valor_subtotal_itens' => $subtotalItens,
                'percentual_desconto' => $percentualDesconto,
                'valor_desconto' => $descontoGeral,
                'valor_total_liquido' => $totalLiquidoPedido,
            ]);

            // 4. Processar Itens
            foreach ($itensPayload as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $precoUnitario = (float) $itemData['preco_unitario'];
                $descontoItem = (float) ($itemData['desconto_unitario'] ?? 0.00);
                $precoFinal = max(0.00, $precoUnitario - $descontoItem);
                
                PedidoVendaItem::create([
                    'pedido_id' => $pedido->id,
                    'item_id' => $itemData['item_id'],
                    'quantidade' => $quantidade,
                    'preco_tabela_unitario' => $precoUnitario,
                    'valor_desconto_unitario' => $descontoItem,
                    'preco_venda_unitario' => $precoFinal,
                    'valor_total_bruto' => $quantidade * $precoUnitario,
                    'valor_total_liquido' => $quantidade * $precoFinal,
                    'lote' => $itemData['lote'] ?? null,
                ]);

                // Só realiza baixa imediata se a venda não estiver aguardando aprovação
                if (!$validacaoAlcada['requer_aprovacao']) {
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
            }

            // 5. Processar Pagamentos e Financeiro (se faturado direto)
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
                    'status' => $validacaoAlcada['requer_aprovacao'] ? 'PENDENTE' : 'CONFIRMADO',
                ]);
            }

            if (!$validacaoAlcada['requer_aprovacao']) {
                self::gerarFinanceiroVenda($pedido, $pagamentosPayload, $totalLiquidoPedido, $vendedor);
            }

            return $pedido;
        });
    }

    /**
     * Cria um Orçamento / Proposta Comercial sem baixa de estoque
     */
    public static function criarOrcamento(
        string $empresaId,
        string $clienteId,
        string $depositoId,
        User $vendedor,
        array $itensPayload,
        float $descontoGeral = 0.00,
        ?string $dataValidade = null
    ): PedidoVenda {
        return DB::transaction(function () use (
            $empresaId,
            $clienteId,
            $depositoId,
            $vendedor,
            $itensPayload,
            $descontoGeral,
            $dataValidade
        ) {
            $tenantId = $vendedor->tenant_id;
            $pedidoId = (string) Str::uuid();
            $subtotalItens = 0.00;

            $ultimoNumero = PedidoVenda::where('empresa_id', $empresaId)->max('numero_pedido') ?? 1000;
            $numeroPedido = $ultimoNumero + 1;

            foreach ($itensPayload as $itemData) {
                $subtotalItens += ((float) $itemData['quantidade'] * (float) $itemData['preco_unitario']);
            }

            $totalLiquido = max(0.00, $subtotalItens - $descontoGeral);
            $percentualDesconto = $subtotalItens > 0 ? ($descontoGeral / $subtotalItens) * 100 : 0.00;

            $orcamento = PedidoVenda::create([
                'id' => $pedidoId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'vendedor_id' => $vendedor->id,
                'deposito_saida_id' => $depositoId,
                'tipo_documento' => 'ORCAMENTO',
                'numero_pedido' => $numeroPedido,
                'status' => 'ORCAMENTO',
                'data_emissao' => now()->toDateString(),
                'data_validade_orcamento' => $dataValidade ?? now()->addDays(7)->toDateString(),
                'valor_subtotal_itens' => $subtotalItens,
                'percentual_desconto' => $percentualDesconto,
                'valor_desconto' => $descontoGeral,
                'valor_total_liquido' => $totalLiquido,
            ]);

            foreach ($itensPayload as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $precoUnitario = (float) $itemData['preco_unitario'];
                $descontoItem = (float) ($itemData['desconto_unitario'] ?? 0.00);
                $precoFinal = max(0.00, $precoUnitario - $descontoItem);

                PedidoVendaItem::create([
                    'pedido_id' => $orcamento->id,
                    'item_id' => $itemData['item_id'],
                    'quantidade' => $quantidade,
                    'preco_tabela_unitario' => $precoUnitario,
                    'valor_desconto_unitario' => $descontoItem,
                    'preco_venda_unitario' => $precoFinal,
                    'valor_total_bruto' => $quantidade * $precoUnitario,
                    'valor_total_liquido' => $quantidade * $precoFinal,
                    'lote' => $itemData['lote'] ?? null,
                ]);
            }

            return $orcamento;
        });
    }

    /**
     * Converte um orçamento em venda faturada com baixa no WMS
     */
    public static function converterOrcamento(PedidoVenda $orcamento, array $pagamentosPayload, User $usuario): PedidoVenda
    {
        return DB::transaction(function () use ($orcamento, $pagamentosPayload, $usuario) {
            if ($orcamento->status === 'FATURADO') {
                throw new Exception("Este orçamento já foi convertido e faturado anteriormente.");
            }

            // 1. Dar baixa em cada item no estoque
            foreach ($orcamento->itens as $item) {
                EstoqueService::movimentar(
                    $orcamento->deposito_saida_id,
                    $item->item_id,
                    (float) $item->quantidade,
                    'SAIDA_VENDA',
                    $usuario->id,
                    'vendas',
                    $orcamento->id,
                    $item->lote,
                    (float) $item->preco_venda_unitario
                );
            }

            // 2. Gravar pagamentos
            foreach ($pagamentosPayload as $pagamentoData) {
                PedidoVendaPagamento::create([
                    'pedido_id' => $orcamento->id,
                    'forma_pagamento' => $pagamentoData['forma_pagamento'],
                    'parcelas' => $pagamentoData['parcelas'] ?? 1,
                    'valor_pago' => (float) $pagamentoData['valor_pago'],
                    'valor_troco' => (float) ($pagamentoData['valor_troco'] ?? 0.00),
                    'status' => 'CONFIRMADO',
                ]);
            }

            // 3. Gerar Financeiro
            self::gerarFinanceiroVenda($orcamento, $pagamentosPayload, (float) $orcamento->valor_total_liquido, $usuario);

            $orcamento->update([
                'tipo_documento' => 'PEDIDO',
                'status' => 'FATURADO',
            ]);

            return $orcamento;
        });
    }

    /**
     * Cancela uma venda e estorna estoque e financeiro
     */
    public static function cancelarVenda(PedidoVenda $pedido, string $motivo, User $usuario): PedidoVenda
    {
        return DB::transaction(function () use ($pedido, $motivo, $usuario) {
            if ($pedido->status === 'CANCELADO') {
                throw new Exception("Esta venda já se encontra cancelada.");
            }

            // Se a venda estava faturada, devolve o estoque
            if ($pedido->status === 'FATURADO') {
                foreach ($pedido->itens as $item) {
                    EstoqueService::movimentar(
                        $pedido->deposito_saida_id,
                        $item->item_id,
                        (float) $item->quantidade,
                        'ENTRADA_COMPRA', // Devolução / Estorno
                        $usuario->id,
                        'vendas',
                        $pedido->id,
                        $item->lote,
                        (float) $item->preco_venda_unitario
                    );
                }

                // Cancela o título no contas a receber
                TituloFinanceiro::where('origem_tipo', 'vendas')
                    ->where('origem_id', $pedido->id)
                    ->update(['status' => 'CANCELADO', 'historico' => "Cancelado: {$motivo}"]);
            }

            $pedido->update([
                'status' => 'CANCELADO',
                'observacoes' => ($pedido->observacoes ? $pedido->observacoes . ' | ' : '') . "Cancelado: {$motivo}",
            ]);

            return $pedido;
        });
    }

    private static function gerarFinanceiroVenda(PedidoVenda $pedido, array $pagamentos, float $totalLiquido, User $vendedor): void
    {
        $contaPadrao = ContaFinanceira::where('tenant_id', $pedido->tenant_id)->where('is_ativo', true)->first();

        $titulo = TituloFinanceiro::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $pedido->tenant_id,
            'empresa_id' => $pedido->empresa_id,
            'pessoa_id' => $pedido->cliente_id,
            'conta_padrao_id' => $contaPadrao?->id,
            'natureza' => 'RECEBER',
            'documento_numero' => "VENDA-{$pedido->numero_pedido}",
            'parcela_numero' => 1,
            'total_parcelas' => 1,
            'origem_tipo' => 'vendas',
            'origem_id' => $pedido->id,
            'data_emissao' => now()->toDateString(),
            'data_vencimento' => now()->toDateString(),
            'data_liquidacao' => now()->toDateString(),
            'valor_original' => $totalLiquido,
            'valor_desconto' => (float) $pedido->valor_desconto,
            'valor_pago_acumulado' => $totalLiquido,
            'valor_saldo_aberto' => 0.00,
            'status' => 'LIQUIDADO',
            'historico' => "Recebimento da Venda #{$pedido->numero_pedido}",
        ]);

        if ($contaPadrao) {
            $saldoAnterior = (float) $contaPadrao->saldo_atual;
            $saldoPosterior = $saldoAnterior + $totalLiquido;
            $contaPadrao->update(['saldo_atual' => $saldoPosterior]);

            MovimentacaoExtrato::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $pedido->tenant_id,
                'conta_financeira_id' => $contaPadrao->id,
                'titulo_id' => $titulo->id,
                'usuario_id' => $vendedor->id,
                'tipo_movimento' => 'ENTRADA',
                'valor' => $totalLiquido,
                'saldo_anterior' => $saldoAnterior,
                'saldo_posterior' => $saldoPosterior,
                'forma_pagamento' => $pagamentos[0]['forma_pagamento'] ?? 'DINHEIRO',
                'data_movimento' => now()->toDateString(),
                'descricao' => "Entrada Venda #{$pedido->numero_pedido}",
                'created_at' => now(),
            ]);
        }
    }
}