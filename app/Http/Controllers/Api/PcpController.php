<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\EstruturaItem;
use App\Models\Item;
use App\Models\OrdemProducao;
use App\Services\ProducaoPcpService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PcpController extends Controller
{
    public function ordensProducao(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = OrdemProducao::where('tenant_id', $tenantId)
            ->with(['produto', 'responsavel']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('numero_op', 'ILIKE', "%{$search}%")
                  ->orWhereHas('produto', fn($p) => $p->where('nome', 'ILIKE', "%{$search}%"));
            });
        }

        $ops = $query->orderByDesc('created_at')->paginate(15);
        return response()->json($ops);
    }

    public function storeOrdemProducao(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'produto_id' => 'required|uuid|exists:pro_itens,id',
            'deposito_origem_id' => 'required|uuid|exists:wms_depositos,id',
            'deposito_destino_id' => 'required|uuid|exists:wms_depositos,id',
            'quantidade_planejada' => 'required|numeric|min:0.0001',
            'data_inicio_prevista' => 'nullable|date',
            'data_fim_prevista' => 'nullable|date',
            'observacoes' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $empresaId = $user->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()?->id;

        try {
            $ultimoNumero = OrdemProducao::withoutGlobalScopes()
                ->where('empresa_id', $empresaId)
                ->max('numero_op') ?? 1000;

            $op = OrdemProducao::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'produto_id' => $validated['produto_id'],
                'deposito_origem_id' => $validated['deposito_origem_id'],
                'deposito_destino_id' => $validated['deposito_destino_id'],
                'responsavel_id' => $user->id,
                'numero_op' => $ultimoNumero + 1,
                'status' => 'PLANEJADA',
                'quantidade_planejada' => (float) $validated['quantidade_planejada'],
                'quantidade_produzida' => 0.0000,
                'custo_total_estimado' => 0.00,
                'custo_total_real' => 0.00,
                'data_inicio_prevista' => $validated['data_inicio_prevista'] ?? now()->toDateString(),
                'data_fim_prevista' => $validated['data_fim_prevista'] ?? now()->addDays(2)->toDateString(),
                'observacoes' => $validated['observacoes'] ?? null,
            ]);

            return response()->json([
                'data' => [
                    'message' => "Ordem de Produção OP-{$op->numero_op} criada com sucesso!",
                    'op' => $op->load(['produto', 'responsavel']),
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'PCP_STORE_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function finalizarOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        if ($op->status === 'CONCLUIDA') {
            return response()->json(['error' => ['message' => 'Esta Ordem de Produção já foi finalizada.']], 422);
        }

        $validated = $request->validate([
            'quantidade_produzida' => 'required|numeric|min:0.0001',
        ]);

        try {
            $opFinalizada = ProducaoPcpService::finalizarProducao(
                $op,
                (float) $validated['quantidade_produzida'],
                $request->user()
            );

            return response()->json([
                'data' => [
                    'message' => "OP-{$opFinalizada->numero_op} finalizada, insumos consumidos e produto estocado com sucesso!",
                    'op' => $opFinalizada->load(['produto', 'responsavel']),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function estruturas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $estruturas = EstruturaItem::where('tenant_id', $tenantId)
            ->with(['insumo'])
            ->get()
            ->groupBy('produto_pai_id');

        $resultado = [];
        foreach ($estruturas as $produtoPaiId => $insumos) {
            $produtoPai = Item::find($produtoPaiId);
            if ($produtoPai) {
                $resultado[] = [
                    'produto_pai' => $produtoPai,
                    'insumos' => $insumos,
                ];
            }
        }

        return response()->json(['data' => $resultado]);
    }

    public function storeEstrutura(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'produto_pai_id' => 'required|uuid|exists:pro_itens,id',
            'insumo_filho_id' => 'required|uuid|exists:pro_itens,id|different:produto_pai_id',
            'quantidade_necessaria' => 'required|numeric|min:0.0001',
            'percentual_perda_estimada' => 'nullable|numeric|min:0|max:100',
        ]);

        $tenantId = $request->user()->tenant_id;

        $estrutura = EstruturaItem::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'produto_pai_id' => $validated['produto_pai_id'],
                'insumo_filho_id' => $validated['insumo_filho_id'],
            ],
            [
                'id' => (string) Str::uuid(),
                'quantidade_necessaria' => (float) $validated['quantidade_necessaria'],
                'percentual_perda_estimada' => (float) ($validated['percentual_perda_estimada'] ?? 0.00),
            ]
        );

        return response()->json(['data' => $estrutura->load('insumo')], 201);
    }
}