<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\Empresa;
use App\Models\TituloFinanceiro;
use App\Services\EstoqueService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Compra::query()->with(['fornecedor', 'depositoDestino', 'itens.item']);

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->get('status'));
            }

            $compras = $query->orderByDesc('created_at')->paginate(15);
            return response()->json($compras);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fornecedor_id' => 'required|uuid|exists:pes_pessoas,id',
            'deposito_destino_id' => 'required|uuid|exists:wms_depositos,id',
            'numero_nota' => 'nullable|string|max:30',
            'serie_nota' => 'nullable|string|max:10',
            'data_emissao' => 'nullable|date',
            'data_vencimento' => 'nullable|date',
            'valor_frete' => 'nullable|numeric|min:0',
            'valor_desconto' => 'nullable|numeric|min:0',
            'itens' => 'required|array|min:1',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
            'itens.*.valor_unitario' => 'required|numeric|min:0',
            'itens.*.lote' => 'nullable|string|max:50',
            'itens.*.data_validade' => 'nullable|date',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        try {
            $compra = DB::transaction(function () use ($validated, $tenantId, $empresaId, $request) {
                $valorProdutos = 0.00;

                foreach ($validated['itens'] as $item) {
                    $valorProdutos += ((float) $item['quantidade'] * (float) $item['valor_unitario']);
                }

                $frete = (float) ($validated['valor_frete'] ?? 0.00);
                $desconto = (float) ($validated['valor_desconto'] ?? 0.00);
                $valorTotal = max(0.00, ($valorProdutos + $frete) - $desconto);

                $compraId = (string) Str::uuid();

                $compra = Compra::create([
                    'id' => $compraId,
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'fornecedor_id' => $validated['fornecedor_id'],
                    'deposito_destino_id' => $validated['deposito_destino_id'],
                    'comprador_id' => $request->user()->id,
                    'numero_nota' => $validated['numero_nota'] ?? null,
                    'serie_nota' => $validated['serie_nota'] ?? '1',
                    'status' => 'RECEBIDO',
                    'data_emissao' => $validated['data_emissao'] ?? now()->toDateString(),
                    'data_entrada' => now()->toDateString(),
                    'valor_produtos' => $valorProdutos,
                    'valor_frete' => $frete,
                    'valor_desconto' => $desconto,
                    'valor_total' => $valorTotal,
                ]);

                foreach ($validated['itens'] as $itemData) {
                    $qtd = (float) $itemData['quantidade'];
                    $vlr = (float) $itemData['valor_unitario'];
                    $tot = $qtd * $vlr;

                    CompraItem::create([
                        'id' => (string) Str::uuid(),
                        'compra_id' => $compra->id,
                        'item_id' => $itemData['item_id'],
                        'quantidade_comercial' => $qtd,
                        'quantidade_estoque' => $qtd,
                        'valor_unitario' => $vlr,
                        'valor_total_item' => $tot,
                        'lote' => $itemData['lote'] ?? null,
                        'data_validade' => $itemData['data_validade'] ?? null,
                    ]);

                    EstoqueService::movimentar(
                        $validated['deposito_destino_id'],
                        $itemData['item_id'],
                        $qtd,
                        'ENTRADA_COMPRA',
                        $request->user()->id,
                        'compras',
                        $compra->id,
                        $itemData['lote'] ?? null,
                        $vlr
                    );
                }

                TituloFinanceiro::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'pessoa_id' => $validated['fornecedor_id'],
                    'natureza' => 'PAGAR',
                    'documento_numero' => $validated['numero_nota'] ?? ('COMP-' . substr($compra->id, 0, 8)),
                    'parcela_numero' => 1,
                    'total_parcelas' => 1,
                    'origem_tipo' => 'compras',
                    'origem_id' => $compra->id,
                    'data_emissao' => $validated['data_emissao'] ?? now()->toDateString(),
                    'data_vencimento' => $validated['data_vencimento'] ?? now()->addDays(30)->toDateString(),
                    'valor_original' => $valorTotal,
                    'valor_saldo_aberto' => $valorTotal,
                    'valor_pago_acumulado' => 0.00,
                    'status' => 'ABERTO',
                    'historico' => "Entrada de Compras/NF: " . ($validated['numero_nota'] ?? 'Doc Interno'),
                ]);

                return $compra;
            });

            return response()->json([
                'data' => [
                    'message' => 'Compra registrada, estoque provisionado e contas a pagar gerado com sucesso!',
                    'compra' => $compra->load('itens.item', 'fornecedor'),
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'PURCHASE_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }
}