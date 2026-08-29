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
        $search = trim((string) $request->get('search'));

        $query = OrdemProducao::where('tenant_id', $tenantId)
            ->with(['produto', 'responsavel', 'depositoOrigem', 'depositoDestino']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if (!empty($search)) {
            // Extrai apenas dígitos caso o usuário pesquise por "OP-1001" ou "1001"
            $apenasNumero = preg_replace('/[^0-9]/', '', $search);

            $query->where(function ($q) use ($search, $apenasNumero) {
                if (!empty($apenasNumero)) {
                    $q->where('numero_op', (int) $apenasNumero);
                }
                $q->orWhereHas('produto', function ($sub) use ($search) {
                    $sub->where('nome', 'ILIKE', "%{$search}%")
                        ->orWhere('codigo_sku', 'ILIKE', "%{$search}%");
                });
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
            $op = DB::transaction(function () use ($validated, $tenantId, $empresaId, $user) {
                $ultimoNumero = OrdemProducao::withoutGlobalScopes()
                    ->where('empresa_id', $empresaId)
                    ->max('numero_op') ?? 1000;

                $novaOp = OrdemProducao::create([
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

                // Reserva atômica no WMS
                ProducaoPcpService::reservarInsumos($novaOp);

                return $novaOp;
            });

            return response()->json([
                'data' => [
                    'message' => "Ordem de Produção OP-{$op->numero_op} criada e insumos reservados!",
                    'op' => $op->load(['produto', 'responsavel']),
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function updateOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        if ($op->status === 'CONCLUIDA' || $op->status === 'CANCELADA') {
            return response()->json(['error' => ['message' => "Não é permitido editar uma OP com status {$op->status}."]], 422);
        }

        $validated = $request->validate([
            'deposito_origem_id' => 'required|uuid|exists:wms_depositos,id',
            'deposito_destino_id' => 'required|uuid|exists:wms_depositos,id',
            'quantidade_planejada' => 'required|numeric|min:0.0001',
            'data_inicio_prevista' => 'nullable|date',
            'data_fim_prevista' => 'nullable|date',
            'observacoes' => 'nullable|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($op, $validated) {
                // Estorna reserva antiga e reaplica nova
                ProducaoPcpService::estornarReservaInsumos($op);

                $op->update([
                    'deposito_origem_id' => $validated['deposito_origem_id'],
                    'deposito_destino_id' => $validated['deposito_destino_id'],
                    'quantidade_planejada' => (float) $validated['quantidade_planejada'],
                    'data_inicio_prevista' => $validated['data_inicio_prevista'] ?? $op->data_inicio_prevista,
                    'data_fim_prevista' => $validated['data_fim_prevista'] ?? $op->data_fim_prevista,
                    'observacoes' => $validated['observacoes'] ?? $op->observacoes,
                ]);

                ProducaoPcpService::reservarInsumos($op);
            });

            return response()->json([
                'data' => [
                    'message' => "OP-{$op->numero_op} atualizada com sucesso!",
                    'op' => $op->fresh(['produto', 'responsavel']),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function cancelarOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        if ($op->status === 'CONCLUIDA') {
            return response()->json(['error' => ['message' => 'Uma OP já finalizada não pode ser cancelada.']], 422);
        }

        if ($op->status === 'CANCELADA') {
            return response()->json(['error' => ['message' => 'Esta OP já se encontra cancelada.']], 422);
        }

        $validated = $request->validate([
            'motivo' => 'required|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($op, $validated) {
                ProducaoPcpService::estornarReservaInsumos($op);

                $op->update([
                    'status' => 'CANCELADA',
                    'observacoes' => ($op->observacoes ? $op->observacoes . ' | ' : '') . "Cancelada: {$validated['motivo']}",
                ]);
            });

            return response()->json([
                'data' => [
                    'message' => "OP-{$op->numero_op} cancelada e reservas estornadas com sucesso!",
                    'op' => $op->fresh(['produto', 'responsavel']),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function destroyOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        if ($op->status === 'CONCLUIDA') {
            return response()->json(['error' => ['message' => 'Não é permitido excluir uma Ordem de Produção concluída com impacto contábil/fiscal.']], 422);
        }

        try {
            DB::transaction(function () use ($op) {
                if ($op->status !== 'CANCELADA') {
                    ProducaoPcpService::estornarReservaInsumos($op);
                }
                // Soft Delete
                $op->delete();
            });

            return response()->json(['data' => ['message' => "OP-{$op->numero_op} removida do planejamento com sucesso."]]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function finalizarOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        if ($op->status === 'CONCLUIDA') {
            return response()->json(['error' => ['message' => 'Esta Ordem de Produção já foi finalizada.']], 422);
        }

        if ($op->status === 'CANCELADA') {
            return response()->json(['error' => ['message' => 'Não é possível finalizar uma OP cancelada.']], 422);
        }

        $validated = $request->validate([
            'quantidade_produzida' => 'required|numeric|min:0',
            'quantidade_refugo' => 'nullable|numeric|min:0',
        ]);

        try {
            $opFinalizada = ProducaoPcpService::finalizarProducao(
                $op,
                (float) $validated['quantidade_produzida'],
                (float) ($validated['quantidade_refugo'] ?? 0.00),
                $request->user()
            );

            return response()->json([
                'data' => [
                    'message' => "OP-{$opFinalizada->numero_op} finalizada com sucesso! Insumos consumidos e produto acabado disponibilizado no estoque.",
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
        $search = trim((string) $request->get('search'));

        $query = EstruturaItem::where('tenant_id', $tenantId)
            ->with(['insumo', 'produtoPai']);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('insumo', function ($sub) use ($search) {
                    $sub->where('nome', 'ILIKE', "%{$search}%")
                        ->orWhere('codigo_sku', 'ILIKE', "%{$search}%");
                })->orWhereHas('produtoPai', function ($sub) use ($search) {
                    $sub->where('nome', 'ILIKE', "%{$search}%")
                        ->orWhere('codigo_sku', 'ILIKE', "%{$search}%");
                });
            });
        }

        $estruturas = $query->get()->groupBy('produto_pai_id');

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

    public function destroyEstruturaItem(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $est = EstruturaItem::where('tenant_id', $tenantId)->findOrFail($id);
        $est->delete();

        return response()->json(['data' => ['message' => 'Insumo desvinculado da Ficha Técnica.']]);
    }

    public function metricasKpi(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $totalOps = OrdemProducao::where('tenant_id', $tenantId)->count();
        $opsConcluidas = OrdemProducao::where('tenant_id', $tenantId)->where('status', 'CONCLUIDA')->count();
        $opsPlanejadas = OrdemProducao::where('tenant_id', $tenantId)->where('status', 'PLANEJADA')->count();
        $opsCanceladas = OrdemProducao::where('tenant_id', $tenantId)->where('status', 'CANCELADA')->count();

        $custoTotalProducao = OrdemProducao::where('tenant_id', $tenantId)->where('status', 'CONCLUIDA')->sum('custo_total_real') ?? 0.00;
        $totalPecasProduzidas = OrdemProducao::where('tenant_id', $tenantId)->where('status', 'CONCLUIDA')->sum('quantidade_produzida') ?? 0;

        return response()->json([
            'data' => [
                'total_ops' => (int) $totalOps,
                'ops_concluidas' => (int) $opsConcluidas,
                'ops_planejadas' => (int) $opsPlanejadas,
                'ops_canceladas' => (int) $opsCanceladas,
                'custo_total_producao' => (float) $custoTotalProducao,
                'total_pecas_produzidas' => (float) $totalPecasProduzidas,
            ]
        ]);
    }
    public function apontarOrdemProducao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'quantidade_produzida' => 'required|numeric|min:0',
            'quantidade_refugo' => 'nullable|numeric|min:0',
            'horas_mod' => 'nullable|numeric|min:0',
            'custo_hora_mod' => 'nullable|numeric|min:0',
            'horas_cif' => 'nullable|numeric|min:0',
            'custo_hora_cif' => 'nullable|numeric|min:0',
            'observacoes' => 'nullable|string|max:255',
        ]);

        try {
            $apontamento = ProducaoPcpService::apontarProducao(
                $op,
                (float) $validated['quantidade_produzida'],
                (float) ($validated['quantidade_refugo'] ?? 0.00),
                (float) ($validated['horas_mod'] ?? 0.00),
                (float) ($validated['custo_hora_mod'] ?? 45.00),
                (float) ($validated['horas_cif'] ?? 0.00),
                (float) ($validated['custo_hora_cif'] ?? 25.00),
                $validated['observacoes'] ?? null,
                $request->user()
            );

            return response()->json([
                'data' => [
                    'message' => "Apontamento de {$validated['quantidade_produzida']} UN registrado com sucesso!",
                    'apontamento' => $apontamento,
                    'op' => $op->fresh(['produto', 'responsavel', 'apontamentos.operador']),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function showOrdemProducao(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $op = OrdemProducao::where('tenant_id', $tenantId)
            ->with(['produto', 'responsavel', 'depositoOrigem', 'depositoDestino', 'apontamentos.operador'])
            ->findOrFail($id);

        return response()->json(['data' => $op]);
    }
    public function analiseMrp(Request $request): JsonResponse
    {
        $user = $request->user();
        $empresaId = $user->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $user->tenant_id)->first()?->id;

        $sugestoes = \App\Services\ProducaoPcpService::executarCalculoMrp($user->tenant_id, $empresaId, $user->id);

        return response()->json(['data' => $sugestoes]);
    }

    public function gerarCotacaoMrp(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;
        $empresaId = $user->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()?->id;

        $validated = $request->validate([
            'deposito_id' => 'required|uuid|exists:wms_depositos,id',
            'itens' => 'required|array|min:1',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
        ]);

        $cotacao = \DB::transaction(function () use ($validated, $tenantId, $empresaId, $user) {
            $cot = \App\Models\CotacaoCompra::create([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'solicitante_id' => $user->id,
                'deposito_destino_id' => $validated['deposito_id'],
                'titulo' => 'Cotação Automática MRP (Demanda de Produção) - ' . date('d/m/Y H:i'),
                'status' => 'ABERTA',
            ]);

            foreach ($validated['itens'] as $i) {
                \App\Models\CotacaoCompraItem::create([
                    'cotacao_id' => $cot->id,
                    'item_id' => $i['item_id'],
                    'quantidade' => (float) $i['quantidade'],
                ]);
            }

            return $cot;
        });

        return response()->json([
            'data' => [
                'message' => 'Cotação de compras gerada pelo motor MRP com sucesso!',
                'cotacao' => $cotacao->load('itens.item')
            ]
        ], 201);
    }

    public function genealogiaLote(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $rastreamento = \App\Models\PcpLoteRastreabilidade::where('tenant_id', $tenantId)
            ->where('ordem_producao_id', $id)
            ->with(['insumo'])
            ->get();

        return response()->json(['data' => $rastreamento]);
    }
}