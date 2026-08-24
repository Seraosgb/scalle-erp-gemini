<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
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

        $vendas = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($vendas);
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
        ]);

        $tenantId = $request->user()->tenant_id;

        // Fallback automático para Consumidor Final padrão
        $clienteId = $validated['cliente_id'] ?? null;
        if (empty($clienteId)) {
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
            $clienteId = $consumidor->id;
        }

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

            return response()->json([
                'data' => [
                    'message' => "Venda #{$pedido->numero_pedido} faturada com sucesso!",
                    'pedido' => $pedido->load('itens.item', 'pagamentos', 'cliente'),
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
}