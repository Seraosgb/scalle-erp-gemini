<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Projeto;
use App\Models\Tarefa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

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
}
