<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Projeto;
use App\Models\Tarefa;
use App\Models\Etapa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class KanbanController extends Controller
{
    /**
     * Retorna o quadro completo com Etapas e Tarefas aninhadas.
     */
    public function board(Request $request, string $projetoId): JsonResponse
    {
        $projeto = Projeto::with(['etapas.tarefas' => function($query) {
            $query->orderBy('prioridade', 'desc')->orderBy('created_at', 'desc');
        }])->findOrFail($projetoId);

        return response()->json(['data' => $projeto]);
    }

    /**
     * Move uma tarefa dinamicamente entre as etapas (Drag and Drop).
     */
    public function moverTarefa(Request $request, string $tarefaId): JsonResponse
    {
        $validated = $request->validate([
            'nova_etapa_id' => 'required|uuid|exists:prj_etapas,id'
        ]);

        $tarefa = Tarefa::findOrFail($tarefaId);
        $tarefa->update(['etapa_id' => $validated['nova_etapa_id']]);

        return response()->json(['message' => 'Tarefa movida com sucesso!', 'tarefa' => $tarefa]);
    }

    /**
     * Adiciona uma nova tarefa ao final da coluna do Kanban.
     */
    public function adicionarTarefa(Request $request, string $etapaId): JsonResponse {
        $validated = $request->validate([
            'titulo' => 'required|string|max:200',
            'prioridade' => 'nullable|string|in:BAIXA,MEDIA,ALTA,CRITICA'
        ]);

        $etapa = Etapa::findOrFail($etapaId);

        $tarefa = Tarefa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'projeto_id' => $etapa->projeto_id,
            'etapa_id' => $etapa->id,
            'titulo' => $validated['titulo'],
            'prioridade' => $validated['prioridade'] ?? 'MEDIA',
        ]);

        return response()->json(['data' => $tarefa], 201);
    }
}
