<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entregavel;
use App\Models\ProjetoCusto;
use App\Models\ProjetoEquipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjetoGestaoController extends Controller
{
    public function listarEquipe(Request $request, string $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $equipe = ProjetoEquipe::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
            ->with('usuario:id,name')
            ->get()
            ->map(function ($membro) {
                $membro->nome_usuario = $membro->usuario?->name ?? 'Usuário';
                return $membro;
            });

        return response()->json(['data' => $equipe]);
    }

    public function adicionarEquipe(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'usuario_id' => 'required|uuid|exists:users,id',
            'custo_hora' => 'required|numeric|min:0'
        ]);

        $tenantId = $request->user()->tenant_id;

        ProjetoEquipe::updateOrCreate(
            ['tenant_id' => $tenantId, 'projeto_id' => $projetoId, 'usuario_id' => $validated['usuario_id']],
            ['id' => (string) Str::uuid(), 'custo_hora' => $validated['custo_hora']]
        );

        return response()->json(['data' => ['message' => 'Membro alocado ao projeto com sucesso!']]);
    }

    public function listarCustos(Request $request, string $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $custos = ProjetoCusto::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
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

        ProjetoCusto::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $projetoId,
            'descricao' => $validated['descricao'],
            'valor' => $validated['valor'],
            'data_custo' => $validated['data_custo'],
        ]);

        TimesheetController::recalcularCustoProjeto($projetoId, $tenantId);

        return response()->json(['data' => ['message' => 'Despesa lançada com sucesso!']]);
    }

    public function listarEntregaveis(Request $request, string $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $entregaveis = Entregavel::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
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

        Entregavel::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $projetoId,
            'titulo' => $validated['titulo'],
            'valor_faturamento' => $validated['valor_faturamento'],
            'data_prevista' => $validated['data_prevista'],
            'status' => 'PENDENTE',
        ]);

        return response()->json(['data' => ['message' => 'Marco de faturamento mapeado com sucesso!']]);
    }
}
