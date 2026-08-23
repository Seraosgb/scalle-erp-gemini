<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
use App\Services\VendaService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $vendas = PedidoVenda::with(['cliente', 'vendedor', 'itens.item'])
            ->orderByDesc('created_at')
            ->paginate(15);

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
            'pagamentos' => 'required|array|min:1',
            'pagamentos.*.forma_pagamento' => 'required|string',
            'pagamentos.*.valor_pago' => 'required|numeric|min:0.01',
            'pagamentos.*.valor_troco' => 'nullable|numeric|min:0',
        ]);

        // Se o cliente não for informado, vincula ao Consumidor Final padrão
        $clienteId = $validated['cliente_id'];
        if (empty($clienteId)) {
            $consumidor = Pessoa::where('cpf_cnpj', '00000000000')->first();
            if (!$consumidor) {
                $consumidor = Pessoa::create([
                    'tipo_pessoa' => 'PF',
                    'nome_razao_social' => 'Consumidor Final',
                    'cpf_cnpj' => '00000000000',
                    'is_cliente' => true,
                ]);
            }
            $clienteId = $consumidor->id;
        }

        $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::first()->id;

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
                    'message' => 'Venda finalizada com sucesso!',
                    'pedido' => $pedido->load('itens.item', 'pagamentos'),
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