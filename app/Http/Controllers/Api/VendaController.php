<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
use App\Services\MotorFiscalService;
use App\Services\VendaService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VendaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = PedidoVenda::where('tenant_id', $tenantId)
            ->with(['cliente', 'vendedor', 'itens.item', 'pagamentos']);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('numero_pedido', 'ILIKE', "%{$search}%")
                  ->orWhereHas('cliente', fn($c) => $c->where('nome_razao_social', 'ILIKE', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('tipo_documento')) {
            $query->where('tipo_documento', $request->get('tipo_documento'));
        }

        $vendas = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($vendas);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $pedido = PedidoVenda::where('tenant_id', $tenantId)
            ->with(['cliente', 'vendedor', 'deposito', 'itens.item', 'pagamentos'])
            ->findOrFail($id);

        return response()->json(['data' => $pedido]);
    }

    public function faturar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deposito_id' => 'required|uuid|exists:wms_depositos,id',
            'cliente_id' => 'nullable|uuid|exists:pes_pessoas,id',
            'desconto_geral' => 'nullable|numeric|min:0',
            'itens' => 'required|array|min:1',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
            'itens.*.preco_unitario' => 'required|numeric|min:0',
            'itens.*.desconto_unitario' => 'nullable|numeric|min:0',
            'itens.*.lote' => 'nullable|string|max:50',
            'pagamentos' => 'required|array|min:1',
            'pagamentos.*.forma_pagamento' => 'required|string',
            'pagamentos.*.valor_pago' => 'required|numeric|min:0.01',
            'pagamentos.*.valor_troco' => 'nullable|numeric|min:0',
            'emitir_cupom_fiscal' => 'nullable|boolean',
        ]);

        $tenantId = $request->user()->tenant_id;
        $clienteId = self::resolverClienteId($validated['cliente_id'] ?? null, $tenantId);

        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        try {
            $pedido = VendaService::faturarVenda(
                $empresaId,
                $clienteId,
                $validated['deposito_id'],
                $request->user(),
                $validated['itens'],
                $validated['pagamentos'],
                (float) ($validated['desconto_geral'] ?? 0.00),
                'PDV'
            );

            $docFiscal = null;
            if (!empty($validated['emitir_cupom_fiscal']) && $pedido->status === 'FATURADO') {
                $itensFiscal = $pedido->itens->map(fn($i) => [
                    'tipo_item' => 'PRODUTO',
                    'cfop' => $i->item->cfop_padrao ?? '5102',
                    'valor_total' => (float) $i->valor_total_liquido,
                ])->toArray();

                $docFiscal = MotorFiscalService::emitirDocumento(
                    Empresa::find($empresaId),
                    $pedido->cliente,
                    '65',
                    $itensFiscal,
                    'vendas',
                    $pedido->id
                );
            }

            return response()->json([
                'data' => [
                    'message' => $pedido->status === 'AGUARDANDO_APROVACAO' 
                        ? "Venda registrada, aguardando aprovação de alçada de desconto!" 
                        : "Venda #{$pedido->numero_pedido} faturada com sucesso!",
                    'pedido' => $pedido->load('itens.item', 'pagamentos', 'cliente'),
                    'documento_fiscal' => $docFiscal,
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'SALE_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function orcamento(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deposito_id' => 'required|uuid|exists:wms_depositos,id',
            'cliente_id' => 'required|uuid|exists:pes_pessoas,id',
            'desconto_geral' => 'nullable|numeric|min:0',
            'data_validade' => 'nullable|date',
            'itens' => 'required|array|min:1',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
            'itens.*.preco_unitario' => 'required|numeric|min:0',
            'itens.*.desconto_unitario' => 'nullable|numeric|min:0',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        try {
            $orcamento = VendaService::criarOrcamento(
                $empresaId,
                $validated['cliente_id'],
                $validated['deposito_id'],
                $request->user(),
                $validated['itens'],
                (float) ($validated['desconto_geral'] ?? 0.00),
                $validated['data_validade'] ?? null
            );

            return response()->json([
                'data' => [
                    'message' => "Orçamento #{$orcamento->numero_pedido} registrado com sucesso!",
                    'orcamento' => $orcamento->load('itens.item', 'cliente'),
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function converter(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pedido = PedidoVenda::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'pagamentos' => 'required|array|min:1',
            'pagamentos.*.forma_pagamento' => 'required|string',
            'pagamentos.*.valor_pago' => 'required|numeric|min:0.01',
            'pagamentos.*.valor_troco' => 'nullable|numeric|min:0',
        ]);

        try {
            $pedidoConvertido = VendaService::converterOrcamento($pedido, $validated['pagamentos'], $request->user());

            return response()->json([
                'data' => [
                    'message' => "Orçamento #{$pedidoConvertido->numero_pedido} convertido em venda faturada!",
                    'pedido' => $pedidoConvertido->load('itens.item', 'pagamentos', 'cliente'),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function cancelar(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pedido = PedidoVenda::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'motivo' => 'required|string|max:255',
        ]);

        try {
            $pedidoCancelado = VendaService::cancelarVenda($pedido, $validated['motivo'], $request->user());

            return response()->json([
                'data' => [
                    'message' => "Pedido #{$pedidoCancelado->numero_pedido} cancelado e estoque estornado com sucesso!",
                    'pedido' => $pedidoCancelado,
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function metricas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $hoje = now()->toDateString();
        $vendasHoje = PedidoVenda::where('tenant_id', $tenantId)
            ->where('status', 'FATURADO')
            ->whereDate('data_emissao', $hoje)
            ->sum('valor_total_liquido') ?? 0.00;

        $qtdHoje = PedidoVenda::where('tenant_id', $tenantId)
            ->where('status', 'FATURADO')
            ->whereDate('data_emissao', $hoje)
            ->count();

        $orcamentosAbertos = PedidoVenda::where('tenant_id', $tenantId)
            ->where('status', 'ORCAMENTO')
            ->count();

        $totalMes = PedidoVenda::where('tenant_id', $tenantId)
            ->where('status', 'FATURADO')
            ->whereMonth('data_emissao', now()->month)
            ->whereYear('data_emissao', now()->year)
            ->sum('valor_total_liquido') ?? 0.00;

        return response()->json([
            'data' => [
                'faturamento_hoje' => (float) $vendasHoje,
                'vendas_hoje_qtd' => (int) $qtdHoje,
                'orcamentos_abertos_qtd' => (int) $orcamentosAbertos,
                'faturamento_mes' => (float) $totalMes,
            ]
        ]);
    }

    private static function resolverClienteId(?string $clienteId, string $tenantId): string
    {
        if (!empty($clienteId)) {
            return $clienteId;
        }

        $consumidor = Pessoa::where('tenant_id', $tenantId)->where('cpf_cnpj', '00000000000')->first();
        if (!$consumidor) {
            $consumidor = Pessoa::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'tipo_pessoa' => 'PF',
                'nome_razao_social' => 'Consumidor Final',
                'cpf_cnpj' => '00000000000',
                'is_cliente' => true,
                'is_ativo' => true,
            ]);
        }
        return $consumidor->id;
    }
    public function listarAlcadasPendentes(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $alcadas = \App\Models\AlcadaAprovacao::where('tenant_id', $tenantId)
            ->where('status', 'PENDENTE')
            ->with(['solicitante'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $alcadas]);
    }

    public function responderAlcada(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $alcada = \App\Models\AlcadaAprovacao::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:APROVADO,REJEITADO',
            'justificativa' => 'nullable|string|max:255',
        ]);

        $statusAprov = $validated['status'];
        $user = $request->user();

        \DB::transaction(function () use ($alcada, $statusAprov, $validated, $user) {
            $alcada->update([
                'aprovador_id' => $user->id,
                'status' => $statusAprov,
                'justificativa_resposta' => $validated['justificativa'] ?? null,
                'respondido_em' => now(),
            ]);

            // Se for aprovado, libera o pedido e executa a baixa no WMS e financeiro
            if ($alcada->entidade_origem === 'pedidos' || $alcada->entidade_origem === 'vendas') {
                $pedido = \App\Models\PedidoVenda::find($alcada->registro_origem_id);
                if ($pedido) {
                    if ($statusAprov === 'APROVADO') {
                        $pedido->update(['status' => 'FATURADO']);

                        foreach ($pedido->itens as $item) {
                            \App\Services\EstoqueService::movimentar(
                                $pedido->deposito_saida_id,
                                $item->item_id,
                                (float) $item->quantidade,
                                'SAIDA_VENDA',
                                $user->id,
                                'vendas',
                                $pedido->id,
                                $item->lote,
                                (float) $item->preco_venda_unitario
                            );
                        }
                    } else {
                        $pedido->update(['status' => 'CANCELADO', 'observacoes' => 'Desconto rejeitado pela gerência']);
                    }
                }
            }
        });

        return response()->json([
            'data' => [
                'message' => "Solicitação de alçada {$statusAprov} com sucesso!",
                'alcada' => $alcada
            ]
        ]);
    }

    public function extratoComissoes(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $dtInicio = $request->get('data_inicio', now()->startOfMonth()->toDateString());
        $dtFim = $request->get('data_fim', now()->endOfMonth()->toDateString());

        $vendas = \App\Models\PedidoVenda::where('tenant_id', $tenantId)
            ->where('status', 'FATURADO')
            ->whereBetween('data_emissao', [$dtInicio, $dtFim])
            ->with(['vendedor', 'cliente'])
            ->orderByDesc('data_emissao')
            ->get();

        $totalComissoes = $vendas->sum('valor_comissao_vendedor') ?? 0.00;
        $totalVendas = $vendas->sum('valor_total_liquido') ?? 0.00;

        return response()->json([
            'data' => [
                'periodo' => ['inicio' => $dtInicio, 'fim' => $dtFim],
                'total_faturamento' => (float) $totalVendas,
                'total_comissoes' => (float) $totalComissoes,
                'vendas' => $vendas,
            ]
        ]);
    }
}