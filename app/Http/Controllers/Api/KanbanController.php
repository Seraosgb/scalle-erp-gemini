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
        $usuarioId = $request->user()->id;

        $projeto = Projeto::with(['etapas.tarefas' => function($query) use ($usuarioId) {
            $query->orderBy('prioridade', 'desc')
                  ->orderBy('created_at', 'desc')
                  ->with([
                      'checklists',
                      'dependencias',
                      'anexos', // Prepara o terreno para o GED
                      'apontamentos' => function($q) use ($usuarioId) {
                          $q->whereNull('fim')->where('usuario_id', $usuarioId);
                      }
                  ]);
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

        // Converte a string do React para o integer que o banco espera
        $prioridadeInt = match ($validated['prioridade'] ?? 'MEDIA') {
            'CRITICA' => 1,
            'ALTA' => 2,
            'MEDIA' => 3,
            'BAIXA' => 4,
            default => 3,
        };

        $tarefa = Tarefa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'projeto_id' => $etapa->projeto_id,
            'etapa_id' => $etapa->id,
            'titulo' => $validated['titulo'],
            'prioridade' => $prioridadeInt,
        ]);

        return response()->json(['data' => $tarefa], 201);
    }
    /**
     * ==========================================
     * MICRO-GESTÃO DO CARD (Enterprise)
     * ==========================================
     */

    public function adicionarChecklist(Request $request, string $tarefaId): JsonResponse
    {
        $validated = $request->validate([
            'descricao' => 'required|string|max:255'
        ]);

        $item = PrjTarefaChecklist::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tarefa_id' => $tarefaId,
            'descricao' => $validated['descricao'],
            'concluido' => false,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function toggleChecklist(Request $request, string $checklistId): JsonResponse
    {
        $item = PrjTarefaChecklist::findOrFail($checklistId);
        $item->concluido = !$item->concluido;
        $item->save();

        return response()->json(['data' => $item]);
    }

    public function adicionarDependencia(Request $request, string $tarefaId): JsonResponse
    {
        $validated = $request->validate([
            'depende_de_id' => 'required|uuid|exists:prj_tarefas,id'
        ]);

        $tarefa = Tarefa::findOrFail($tarefaId);

        // Evita duplicidade usando o syncWithoutDetaching
        $tarefa->dependencias()->syncWithoutDetaching([$validated['depende_de_id']]);

        return response()->json(['message' => 'Dependência adicionada com sucesso.']);
    }

    public function removerDependencia(Request $request, string $tarefaId, string $dependeDeId): JsonResponse
    {
        $tarefa = Tarefa::findOrFail($tarefaId);
        $tarefa->dependencias()->detach($dependeDeId);

        return response()->json(['message' => 'Dependência removida com sucesso.']);
    }
}
