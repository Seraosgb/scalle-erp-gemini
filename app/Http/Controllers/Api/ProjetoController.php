<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Projeto;
use App\Models\Etapa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjetoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $projetos = Projeto::where('tenant_id', $tenantId)
            ->withCount('tarefas')
            ->with('etapas')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($projetos);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:200',
            'descricao' => 'nullable|string',
            'cliente_id' => 'nullable|uuid|exists:pes_pessoas,id',
            'orcamento_previsto' => 'nullable|numeric|min:0'
        ]);

        $projeto = DB::transaction(function () use ($validated, $tenantId) {
            $proj = Projeto::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'nome' => $validated['nome'],
                'descricao' => $validated['descricao'] ?? null,
                'cliente_id' => $validated['cliente_id'] ?? null,
                'orcamento_previsto' => $validated['orcamento_previsto'] ?? 0.00,
            ]);

            // Scaffolding dinâmico: Cria as colunas iniciais do Kanban para o projeto não nascer vazio
            $etapasPadrao = [
                ['nome' => 'Backlog', 'cor_hex' => '#64748b'],
                ['nome' => 'A Fazer', 'cor_hex' => '#e2e8f0'],
                ['nome' => 'Em Andamento', 'cor_hex' => '#3b82f6'],
                ['nome' => 'Revisão', 'cor_hex' => '#f59e0b'],
                ['nome' => 'Concluído', 'cor_hex' => '#10b981'],
            ];

            foreach ($etapasPadrao as $index => $e) {
                Etapa::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'projeto_id' => $proj->id,
                    'nome' => $e['nome'],
                    'ordem' => $index + 1,
                    'cor_hex' => $e['cor_hex'],
                ]);
            }

            return $proj;
        });

        return response()->json([
            'data' => [
                'message' => 'Projeto criado com pipeline Kanban gerado com sucesso!',
                'projeto' => $projeto->load('etapas')
            ]
        ], 201);
    }
    public function atualizarOrcamento(Request $request, string $projetoId): JsonResponse {
        $validated = $request->validate(['orcamento_previsto' => 'required|numeric|min:0']);
        $projeto = Projeto::where('tenant_id', $request->user()->tenant_id)->findOrFail($projetoId);
        $projeto->update(['orcamento_previsto' => $validated['orcamento_previsto']]);
        return response()->json(['data' => $projeto]);
    }
}
