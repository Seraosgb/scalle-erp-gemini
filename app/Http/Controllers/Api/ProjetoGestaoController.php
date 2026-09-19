<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjetoEquipe;
use App\Models\ProjetoCusto;
use App\Models\Entregavel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjetoGestaoController extends Controller
{
    // === EQUIPE ===
    public function listarEquipe(Request $request, string $projetoId): JsonResponse {
        $tenantId = $request->user()->tenant_id;
        $equipe = ProjetoEquipe::where('prj_projeto_equipe.tenant_id', $tenantId) // <-- Correção aqui
            ->where('prj_projeto_equipe.projeto_id', $projetoId) // <-- Correção aqui
            ->leftJoin('users', 'prj_projeto_equipe.usuario_id', '=', 'users.id')
            ->select('prj_projeto_equipe.*', 'users.name as nome_usuario')
            ->get();
        return response()->json(['data' => $equipe]);
    }

    public function adicionarEquipe(Request $request, string $projetoId): JsonResponse {
        $validated = $request->validate([
            'usuario_id' => 'required|uuid|exists:users,id',
            'custo_hora' => 'required|numeric|min:0'
        ]);

        $membro = ProjetoEquipe::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'projeto_id' => $projetoId,
            'usuario_id' => $validated['usuario_id'],
            'custo_hora' => $validated['custo_hora']
        ]);
        return response()->json(['data' => $membro], 201);
    }

    // === CUSTOS ===
    public function listarCustos(Request $request, string $projetoId): JsonResponse {
        $tenantId = $request->user()->tenant_id;
        $custos = ProjetoCusto::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
            ->orderByDesc('data_custo')
            ->get();
        return response()->json(['data' => $custos]);
    }

    public function adicionarCusto(Request $request, string $projetoId): JsonResponse {
        $validated = $request->validate([
            'descricao' => 'required|string',
            'valor' => 'required|numeric|min:0.01',
            'data_custo' => 'required|date'
        ]);

        $custo = ProjetoCusto::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'projeto_id' => $projetoId,
            'valor' => $validated['valor'],
            'data_custo' => $validated['data_custo'],
            'descricao' => $validated['descricao']
        ]);

        // Atualizando o custo total real do projeto
        DB::statement("UPDATE prj_projetos SET custo_total_real = custo_total_real + ? WHERE id = ?", [$validated['valor'], $projetoId]);

        return response()->json(['data' => $custo], 201);
    }

    // === ENTREGÁVEIS ===
    public function listarEntregaveis(Request $request, string $projetoId): JsonResponse {
        $tenantId = $request->user()->tenant_id;
        $entregaveis = Entregavel::where('tenant_id', $tenantId)->where('projeto_id', $projetoId)->get();
        return response()->json(['data' => $entregaveis]);
    }
}
