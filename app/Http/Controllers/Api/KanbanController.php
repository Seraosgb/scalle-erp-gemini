<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Projeto;
use App\Models\Tarefa;
use App\Models\Etapa;
use App\Models\PrjTarefaChecklist;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KanbanController extends Controller
{
    /**
     * Retorna o quadro completo com Etapas e Tarefas aninhadas.
     */
    public function board(Request $request, string $projetoId): JsonResponse
    {
        $user = $request->user();
        $usuarioId = $user->id;

        $projeto = Projeto::with(['etapas.tarefas' => function($query) {
            $query->orderBy('prioridade', 'desc')->orderBy('created_at', 'desc');
        }])->findOrFail($projetoId);

        // MÁGICA: Injeta os anexos (GED), checklists, dependências e apontamentos diretamente na resposta
        // Isso evita erros 500 por falta de mapeamento de relacionamentos complexos nos Models.
        $tarefaIds = [];
        foreach ($projeto->etapas as $etapa) {
            foreach ($etapa->tarefas as $tarefa) {
                $tarefaIds[] = $tarefa->id;
            }
        }

        if (count($tarefaIds) > 0) {
            // Anexos do Cofre Digital (GED)
            $anexos = \App\Models\GedDocumento::where('tenant_id', $user->tenant_id)
                ->where('entidade_vinculada_type', 'App\Models\Tarefa')
                ->whereIn('entidade_vinculada_id', $tarefaIds)
                ->get()
                ->groupBy('entidade_vinculada_id');

            // Checklists
            $checklists = DB::table('prj_tarefa_checklists')
                ->whereIn('tarefa_id', $tarefaIds)
                ->get()
                ->groupBy('tarefa_id');

            // Apontamentos (lê os cronômetros ativos do próprio usuário logado)
            $apontamentos = DB::table('prj_apontamentos')
                ->whereIn('tarefa_id', $tarefaIds)
                ->where('usuario_id', $usuarioId)
                ->whereNull('fim')
                ->whereNull('deleted_at')
                ->get()
                ->groupBy('tarefa_id');

            // Dependências (Blockers)
            $dependencias = DB::table('prj_tarefa_dependencias')
                ->join('prj_tarefas', 'prj_tarefa_dependencias.depende_de_id', '=', 'prj_tarefas.id')
                ->whereIn('prj_tarefa_dependencias.tarefa_id', $tarefaIds)
                ->select('prj_tarefa_dependencias.tarefa_id', 'prj_tarefas.titulo', 'prj_tarefa_dependencias.depende_de_id as id')
                ->get()
                ->groupBy('tarefa_id');

            // Amarração em Memória
            foreach ($projeto->etapas as $etapa) {
                foreach ($etapa->tarefas as $tarefa) {
                    $tarefa->anexos = $anexos->get($tarefa->id, []);
                    $tarefa->checklists = $checklists->get($tarefa->id, []);
                    $tarefa->apontamentos = $apontamentos->get($tarefa->id, []);
                    $tarefa->dependencias = $dependencias->get($tarefa->id, []);
                }
            }
        }

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
    public function adicionarTarefa(Request $request, string $etapaId): JsonResponse
    {
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
            'id' => (string) Str::uuid(),
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
