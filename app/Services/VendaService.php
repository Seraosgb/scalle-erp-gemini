<?php

namespace App\Services;

use App\Models\AlcadaAprovacao;
use App\Models\ContaFinanceira;
use App\Models\Empresa;
use App\Models\EstoqueDeposito;
use App\Models\Item;
use App\Models\MovimentacaoExtrato;
use App\Models\PedidoVenda;
use App\Models\PedidoVendaItem;
use App\Models\PedidoVendaPagamento;
use App\Models\Pessoa;
use App\Models\TituloFinanceiro;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VendaService
{
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

            $cliente = Pessoa::findOrFail($clienteId);

            $ultimoNumero = PedidoVenda::where('empresa_id', $empresaId)->max('numero_pedido') ?? 1000;
            $numeroPedido = $ultimoNumero + 1;

            foreach ($itensPayload as $itemData) {
                $subtotalItens += ((float) $itemData['quantidade'] * (float) $itemData['preco_unitario']);
            }

            $totalLiquidoPedido = max(0.00, $subtotalItens - $descontoGeral);
            $percentualDesconto = $subtotalItens > 0 ? ($descontoGeral / $subtotalItens) * 100 : 0.00;

            // 1. Trava de Limite de Crédito para pagamentos a prazo
            $formasPrazo = ['BOLETO', 'CREDIARIO', 'A_PRAZO', 'FATURADO'];
            $temPagamentoPrazo = collect($pagamentosPayload)->contains(
                fn($p) => in_array(strtoupper($p['forma_pagamento'] ?? ''), $formasPrazo)
            );

            if ($temPagamentoPrazo && (float) ($cliente->limite_credito ?? 0) > 0) {
                $saldoDevedorAberto = TituloFinanceiro::where('pessoa_id', $cliente->id)
                    ->where('natureza', 'RECEBER')
                    ->whereIn('status', ['ABERTO', 'PARCIAL'])
                    ->sum('valor_saldo_aberto') ?? 0.00;

                if (($saldoDevedorAberto + $totalLiquidoPedido) > (float) $cliente->limite_credito) {
                    $disponivel = max(0.00, (float) $cliente->limite_credito - $saldoDevedorAberto);
                    throw new Exception("Limite de crédito excedido. Limite: R$ {$cliente->limite_credito} | Disponível: R$ {$disponivel} | Solicitado: R$ {$totalLiquidoPedido}");
                }
            }

            // 2. Validação de Alçada de Desconto
            $validacaoAlcada = MotorAlcadaService::validarDesconto(
                $vendedor,
                'pedidos',
                $pedidoId,
                $percentualDesconto,
                $descontoGeral
            );

            $statusInicial = $validacaoAlcada['requer_aprovacao'] ? 'AGUARDANDO_APROVACAO' : 'FATURADO';

            // 3. Cálculo de Comissão do Vendedor (2.5% padrão)
            $pctComissao = 2.50;
            $valorComissao = $statusInicial === 'FATURADO' ? round($totalLiquidoPedido * ($pctComissao / 100), 2) : 0.00;

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
                'data_emissao' => now(),
                'valor_subtotal_itens' => $subtotalItens,
                'percentual_desconto' => $percentualDesconto,
                'valor_desconto' => $descontoGeral,
                'valor_total_liquido' => $totalLiquidoPedido,
                'percentual_comissao_vendedor' => $pctComissao,
                'valor_comissao_vendedor' => $valorComissao,
            ]);

            foreach ($itensPayload as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $precoUnitario = (float) $itemData['preco_unitario'];
                $descontoItem = (float) ($itemData['desconto_unitario'] ?? 0.00);
                $precoFinal = max(0.00, $precoUnitario - $descontoItem);

                PedidoVendaItem::create([
                    'id' => (string) Str::uuid(),
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

            foreach ($pagamentosPayload as $pagamentoData) {
                $valorPago = (float) $pagamentoData['valor_pago'];

                PedidoVendaPagamento::create([
                    'id' => (string) Str::uuid(),
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
                'data_emissao' => now(),
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
                    'id' => (string) Str::uuid(),
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

                // Reserva atômica de saldo no WMS
                $estoque = EstoqueDeposito::where('deposito_id', $depositoId)
                    ->where('item_id', $itemData['item_id'])
                    ->lockForUpdate()
                    ->first();

                if ($estoque) {
                    $estoque->increment('quantidade_reservada', $quantidade);
                }
            }

            return $orcamento;
        });
    }

    public static function converterOrcamento(PedidoVenda $orcamento, array $pagamentosPayload, User $usuario): PedidoVenda
    {
        return DB::transaction(function () use ($orcamento, $pagamentosPayload, $usuario) {
            if ($orcamento->status === 'FATURADO') {
                throw new Exception("Este orçamento já foi convertido e faturado anteriormente.");
            }

            foreach ($orcamento->itens as $item) {
                // Estorno de reserva
                $estoque = EstoqueDeposito::where('deposito_id', $orcamento->deposito_saida_id)
                    ->where('item_id', $item->item_id)
                    ->lockForUpdate()
                    ->first();

                if ($estoque) {
                    $estoque->decrement('quantidade_reservada', min((float) $estoque->quantidade_reservada, (float) $item->quantidade));
                }

                // Baixa física definitiva
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

            foreach ($pagamentosPayload as $pagamentoData) {
                PedidoVendaPagamento::create([
                    'id' => (string) Str::uuid(),
                    'pedido_id' => $orcamento->id,
                    'forma_pagamento' => $pagamentoData['forma_pagamento'],
                    'parcelas' => $pagamentoData['parcelas'] ?? 1,
                    'valor_pago' => (float) $pagamentoData['valor_pago'],
                    'valor_troco' => (float) ($pagamentoData['valor_troco'] ?? 0.00),
                    'status' => 'CONFIRMADO',
                ]);
            }

            // Comissão e Financeiro
            $pctComissao = 2.50;
            $valorComissao = round((float) $orcamento->valor_total_liquido * ($pctComissao / 100), 2);

            self::gerarFinanceiroVenda($orcamento, $pagamentosPayload, (float) $orcamento->valor_total_liquido, $usuario);

            $orcamento->update([
                'tipo_documento' => 'PEDIDO',
                'status' => 'FATURADO',
                'percentual_comissao_vendedor' => $pctComissao,
                'valor_comissao_vendedor' => $valorComissao,
            ]);

            return $orcamento;
        });
    }

    public static function cancelarVenda(PedidoVenda $pedido, string $motivo, User $usuario): PedidoVenda
    {
        return DB::transaction(function () use ($pedido, $motivo, $usuario) {
            if ($pedido->status === 'CANCELADO') {
                throw new Exception("Esta venda já se encontra cancelada.");
            }

            if ($pedido->status === 'FATURADO') {
                foreach ($pedido->itens as $item) {
                    EstoqueService::movimentar(
                        $pedido->deposito_saida_id,
                        $item->item_id,
                        (float) $item->quantidade,
                        'ENTRADA_COMPRA',
                        $usuario->id,
                        'vendas',
                        $pedido->id,
                        $item->lote,
                        (float) $item->preco_venda_unitario
                    );
                }

                TituloFinanceiro::where('origem_tipo', 'vendas')
                    ->where('origem_id', $pedido->id)
                    ->update(['status' => 'CANCELADO', 'historico' => "Cancelado: {$motivo}"]);
            } elseif ($pedido->status === 'ORCAMENTO') {
                foreach ($pedido->itens as $item) {
                    $estoque = EstoqueDeposito::where('deposito_id', $pedido->deposito_saida_id)
                        ->where('item_id', $item->item_id)
                        ->first();

                    if ($estoque) {
                        $estoque->decrement('quantidade_reservada', min((float) $estoque->quantidade_reservada, (float) $item->quantidade));
                    }
                }
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
            'data_emissao' => now(),
            'data_vencimento' => now()->toDateString(),
            'data_liquidacao' => now(),
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
    public function sincronizarLoteOffline(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vendas' => 'required|array|min:1',
            'vendas.*.offline_id' => 'required|string',
            'vendas.*.payload' => 'required|array',
        ]);

        $vendedor = $request->user();
        $processadas = [];
        $erros = [];

        foreach ($validated['vendas'] as $vendaItem) {
            $offlineId = $vendaItem['offline_id'];
            $payload = $vendaItem['payload'];

            // Idempotência: verifica se o lote offline já foi sincronizado
            $jaExiste = PedidoVenda::where('pdv_offline_uuid', $offlineId)->first();
            if ($jaExiste) {
                $processadas[] = ['offline_id' => $offlineId, 'numero_pedido' => $jaExiste->numero_pedido];
                continue;
            }

            try {
                $clienteId = self::resolverClienteId($payload['cliente_id'] ?? null, $vendedor->tenant_id);
                $empresaId = $vendedor->empresa_padrao_id ?? Empresa::where('tenant_id', $vendedor->tenant_id)->first()->id;

                $pedido = VendaService::faturarVenda(
                    $empresaId,
                    $clienteId,
                    $payload['deposito_id'],
                    $vendedor,
                    $payload['itens'],
                    $payload['pagamentos'],
                    (float) ($payload['desconto_geral'] ?? 0.00),
                    'PDV_OFFLINE'
                );

                $pedido->update([
                    'pdv_offline_uuid' => $offlineId,
                    'sincronizado_em' => now(),
                ]);

                $processadas[] = ['offline_id' => $offlineId, 'numero_pedido' => $pedido->numero_pedido];
            } catch (Exception $e) {
                $erros[] = ['offline_id' => $offlineId, 'erro' => $e->getMessage()];
            }
        }

        return response()->json([
            'data' => [
                'processadas' => $processadas,
                'erros' => $erros,
                'total_sincronizadas' => count($processadas),
            ]
        ]);
    }
}