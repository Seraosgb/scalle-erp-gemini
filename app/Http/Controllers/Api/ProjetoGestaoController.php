<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjetoGestaoController extends Controller
{
    // ==========================================
    // ABA: ALOCAÇÃO DE EQUIPA
    // ==========================================
    public function listarEquipe(Request $request, string $projetoId): JsonResponse
    {
        $equipe = DB::table('prj_projeto_equipe')
            ->join('users', 'prj_projeto_equipe.usuario_id', '=', 'users.id')
            ->where('prj_projeto_equipe.projeto_id', $projetoId)
            ->whereNull('prj_projeto_equipe.deleted_at')
            ->select('prj_projeto_equipe.*', 'users.name as nome_usuario')
            ->get();

        return response()->json(['data' => $equipe]);
    }

    public function adicionarEquipe(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'usuario_id' => 'required|uuid',
            'custo_hora' => 'required|numeric|min:0'
        ]);

        $tenantId = $request->user()->tenant_id;

        DB::table('prj_projeto_equipe')->updateOrInsert(
            ['projeto_id' => $projetoId, 'usuario_id' => $validated['usuario_id']],
            [
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'custo_hora' => $validated['custo_hora'],
                'created_at' => now(),
                'updated_at' => now(),
                'deleted_at' => null
            ]
        );

        return response()->json(['data' => ['message' => 'Membro alocado ao projeto com sucesso!']]);
    }

    // ==========================================
    // ABA: CUSTOS E DESPESAS EXTERNAS
    // ==========================================
    public function listarCustos(Request $request, string $projetoId): JsonResponse
    {
        $custos = DB::table('prj_projeto_custos')
            ->where('projeto_id', $projetoId)
            ->whereNull('deleted_at')
            ->orderByDesc('data_custo')
            ->get();

        return response()->json(['data' => $custos]);
    }

    public function adicionarCusto(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'descricao' => 'required|string|max:255',
            'valor' => 'required|numeric|min:0',
            'data_custo' => 'required|date'
        ]);

        $tenantId = $request->user()->tenant_id;

        DB::table('prj_projeto_custos')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $projetoId,
            'descricao' => $validated['descricao'],
            'valor' => $validated['valor'],
            'data_custo' => $validated['data_custo'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Http\Controllers\Api\TimesheetController::recalcularCustoProjeto($projetoId);

        return response()->json(['data' => ['message' => 'Despesa externa lançada com sucesso!']]);
    }

    // ==========================================
    // ABA: ENTREGÁVEIS / MARCOS DE FATURAMENTO
    // ==========================================
    public function listarEntregaveis(Request $request, string $projetoId): JsonResponse
    {
        $entregaveis = DB::table('prj_projeto_entregaveis')
            ->where('projeto_id', $projetoId)
            ->whereNull('deleted_at')
            ->orderBy('data_prevista')
            ->get();

        return response()->json(['data' => $entregaveis]);
    }

    public function adicionarEntregavel(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'valor_faturamento' => 'required|numeric|min:0',
            'data_prevista' => 'nullable|date'
        ]);

        $tenantId = $request->user()->tenant_id;

        DB::table('prj_projeto_entregaveis')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $projetoId,
            'titulo' => $validated['titulo'],
            'valor_faturamento' => $validated['valor_faturamento'],
            'data_prevista' => $validated['data_prevista'],
            'status' => 'PENDENTE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['message' => 'Marco de faturamento mapeado com sucesso!']]);
    }
}
