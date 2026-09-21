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

            // Scaffolding dinâmico do Kanban
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

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:200',
            'descricao' => 'nullable|string',
            'cliente_id' => 'nullable|uuid|exists:pes_pessoas,id'
        ]);

        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($id);
        $projeto->update($validated);

        return response()->json(['message' => 'Projeto atualizado com sucesso!']);
    }

    public function alterarStatus(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // MÁGICA DA COMPATIBILIDADE RETROATIVA
        // Aceita 'status' legado ou o novo 'status_projeto_id' dinâmico
        $validated = $request->validate([
            'status_projeto_id' => 'nullable|uuid|exists:prj_status_projetos,id',
            'status' => 'nullable|string|max:50'
        ]);

        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($id);

        if (!empty($validated['status_projeto_id'])) {
            $projeto->update(['status_projeto_id' => $validated['status_projeto_id']]);
        } elseif (!empty($validated['status'])) {
            $projeto->update(['status' => $validated['status']]);
        } else {
            return response()->json(['error' => 'O campo status_projeto_id é obrigatório.'], 422);
        }

        return response()->json(['message' => 'Status do projeto atualizado com sucesso!']);
    }

    public function atualizarOrcamento(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'orcamento_previsto' => 'required|numeric|min:0'
        ]);

        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($id);
        $projeto->update(['orcamento_previsto' => $validated['orcamento_previsto']]);

        return response()->json(['message' => 'Orçamento do projeto atualizado com sucesso!']);
    }

    public function listarStatus(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $status = DB::table('prj_status_projetos')
            ->where('tenant_id', $tenantId)
            ->orderBy('nome')
            ->get();

        if ($status->isEmpty()) {
            $basicos = [
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Ativo', 'cor_hex' => '#4f46e5'],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Concluído', 'cor_hex' => '#10b981'],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Pausado', 'cor_hex' => '#f59e0b']
            ];
            DB::table('prj_status_projetos')->insert($basicos);
            $status = collect($basicos);
        }

        return response()->json(['data' => $status]);
    }
}
