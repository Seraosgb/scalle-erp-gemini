<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\CotacaoCompra;
use App\Models\CotacaoCompraItem;
use App\Models\CotacaoProposta;
use App\Models\CotacaoPropostaItem;
use App\Models\Empresa;
use App\Models\TituloFinanceiro;
use App\Services\EstoqueService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CotacaoCompraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $cotacoes = CotacaoCompra::where('tenant_id', $tenantId)
            ->with(['deposito', 'fornecedorVencedor', 'itens.item', 'propostas.fornecedor'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($cotacoes);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;
        $empresaId = $user->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'deposito_destino_id' => 'required|uuid|exists:wms_depositos,id',
            'data_limite_resposta' => 'nullable|date',
            'observacoes' => 'nullable|string',
            'itens' => 'required|array|min:1',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
        ]);

        $cotacao = DB::transaction(function () use ($validated, $tenantId, $empresaId, $user) {
            $cot = CotacaoCompra::create([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'solicitante_id' => $user->id,
                'deposito_destino_id' => $validated['deposito_destino_id'],
                'titulo' => $validated['titulo'],
                'data_limite_resposta' => $validated['data_limite_resposta'] ?? null,
                'observacoes' => $validated['observacoes'] ?? null,
                'status' => 'ABERTA',
            ]);

            foreach ($validated['itens'] as $item) {
                CotacaoCompraItem::create([
                    'cotacao_id' => $cot->id,
                    'item_id' => $item['item_id'],
                    'quantidade' => (float) $item['quantidade'],
                ]);
            }

            return $cot;
        });

        return response()->json([
            'data' => [
                'message' => 'Cotação de compras aberta com sucesso!',
                'cotacao' => $cotacao->load('itens.item', 'deposito'),
            ]
        ], 201);
    }

    public function adicionarProposta(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $cotacao = CotacaoCompra::where('tenant_id', $tenantId)->findOrFail($id);

        if ($cotacao->status !== 'ABERTA') {
            return response()->json(['error' => ['message' => 'Esta cotação já foi encerrada.']], 422);
        }

        $validated = $request->validate([
            'fornecedor_id' => 'required|uuid|exists:pes_pessoas,id',
            'valor_frete' => 'nullable|numeric|min:0',
            'prazo_entrega_dias' => 'required|integer|min:1',
            'condicoes_pagamento' => 'nullable|string|max:100',
            'observacoes' => 'nullable|string',
            'itens' => 'required|array|min:1',
            'itens.*.cotacao_item_id' => 'required|uuid|exists:cmp_cotacao_itens,id',
            'itens.*.valor_unitario' => 'required|numeric|min:0',
        ]);

        $proposta = DB::transaction(function () use ($validated, $cotacao) {
            $totalItens = 0.00;
            foreach ($validated['itens'] as $i) {
                $cotItem = CotacaoCompraItem::find($i['cotacao_item_id']);
                $totalItens += ((float) $cotItem->quantidade * (float) $i['valor_unitario']);
            }

            $frete = (float) ($validated['valor_frete'] ?? 0.00);
            $totalGeral = $totalItens + $frete;

            $prop = CotacaoProposta::create([
                'cotacao_id' => $cotacao->id,
                'fornecedor_id' => $validated['fornecedor_id'],
                'valor_total' => $totalGeral,
                'valor_frete' => $frete,
                'prazo_entrega_dias' => $validated['prazo_entrega_dias'],
                'condicoes_pagamento' => $validated['condicoes_pagamento'] ?? null,
                'observacoes' => $validated['observacoes'] ?? null,
            ]);

            foreach ($validated['itens'] as $i) {
                $cotItem = CotacaoCompraItem::find($i['cotacao_item_id']);
                $totItem = (float) $cotItem->quantidade * (float) $i['valor_unitario'];

                CotacaoPropostaItem::create([
                    'proposta_id' => $prop->id,
                    'cotacao_item_id' => $i['cotacao_item_id'],
                    'valor_unitario' => (float) $i['valor_unitario'],
                    'valor_total' => $totItem,
                ]);
            }

            return $prop;
        });

        return response()->json([
            'data' => [
                'message' => 'Proposta de fornecedor registrada no mapa comparativo!',
                'proposta' => $proposta->load('fornecedor', 'itens'),
            ]
        ], 201);
    }

    public function aprovarPropostaVencedora(Request $request, string $cotacaoId, string $propostaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $cotacao = CotacaoCompra::where('tenant_id', $tenantId)->with('itens.item')->findOrFail($cotacaoId);
        $proposta = CotacaoProposta::where('cotacao_id', $cotacao->id)->with('itens')->findOrFail($propostaId);

        if ($cotacao->status !== 'ABERTA') {
            return response()->json(['error' => ['message' => 'Esta cotação já se encontra finalizada.']], 422);
        }

        $compra = DB::transaction(function () use ($cotacao, $proposta, $request, $tenantId) {
            // Marca proposta vencedora
            CotacaoProposta::where('cotacao_id', $cotacao->id)->update(['is_vencedora' => false]);
            $proposta->update(['is_vencedora' => true]);

            $cotacao->update([
                'status' => 'CONCLUIDA',
                'fornecedor_vencedor_id' => $proposta->fornecedor_id,
            ]);

            // Gera Pedido de Compra PENDENTE DE RECEBIMENTO (Padrão 2 Etapas)
            $compraId = (string) Str::uuid();
            $compra = Compra::create([
                'id' => $compraId,
                'tenant_id' => $tenantId,
                'empresa_id' => $cotacao->empresa_id,
                'fornecedor_id' => $proposta->fornecedor_id,
                'deposito_destino_id' => $cotacao->deposito_destino_id,
                'comprador_id' => $request->user()->id,
                'numero_nota' => 'COT-' . substr($cotacao->id, 0, 8),
                'serie_nota' => '1',
                'status' => 'PENDENTE_RECEBIMENTO',
                'data_emissao' => now()->toDateString(),
                'valor_produtos' => (float) $proposta->valor_total - (float) $proposta->valor_frete,
                'valor_frete' => (float) $proposta->valor_frete,
                'valor_total' => (float) $proposta->valor_total,
                'observacoes' => "Pedido gerado via Mapa Comparativo da Cotação: {$cotacao->titulo}",
            ]);

            foreach ($proposta->itens as $propItem) {
                $cotItem = CotacaoCompraItem::find($propItem->cotacao_item_id);
                CompraItem::create([
                    'compra_id' => $compra->id,
                    'item_id' => $cotItem->item_id,
                    'quantidade_comercial' => $cotItem->quantidade,
                    'quantidade_estoque' => $cotItem->quantidade,
                    'valor_unitario' => $propItem->valor_unitario,
                    'valor_total_item' => $propItem->valor_total,
                ]);
            }

            return $compra;
        });

        return response()->json([
            'data' => [
                'message' => 'Proposta vencedora aprovada! Pedido de compra gerado como Pendente de Recebimento.',
                'compra' => $compra,
            ]
        ]);
    }
}