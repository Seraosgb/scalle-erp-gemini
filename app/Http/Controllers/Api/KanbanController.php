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
     * Retorna as prioridades configuradas para o Tenant
     */
    public function listarPrioridades(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $prioridades = DB::table('prj_prioridades_tarefas')
            ->where('tenant_id', $tenantId)
            ->orderBy('peso', 'desc')
            ->get();

        // Fallback robusto caso o tenant seja novo e não tenha prioridades cadastradas
        if ($prioridades->isEmpty()) {
            $basicos = [
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Crítica', 'peso' => 100, 'cor_hex' => '#ef4444'],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Alta', 'peso' => 75, 'cor_hex' => '#f97316'],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Média', 'peso' => 50, 'cor_hex' => '#3b82f6'],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Baixa', 'peso' => 25, 'cor_hex' => '#64748b'],
            ];
            DB::table('prj_prioridades_tarefas')->insert($basicos);
            $prioridades = collect($basicos);
        }

        return response()->json(['data' => $prioridades]);
    }

    /**
     * Retorna o quadro completo com Etapas e Tarefas aninhadas.
     */
    public function board(Request $request, string $projetoId): JsonResponse
    {
        $user = $request->user();
        $usuarioId = $user->id;

        // O fallback na ordenação garante retrocompatibilidade com tarefas legadas que só têm 'prioridade' int
        $projeto = Projeto::with(['etapas.tarefas' => function($query) {
            $query->orderBy('prioridade', 'desc')->orderBy('created_at', 'desc');
        }])->findOrFail($projetoId);

        $tarefaIds = [];
        foreach ($projeto->etapas as $etapa) {
            foreach ($etapa->tarefas as $tarefa) {
                $tarefaIds[] = $tarefa->id;
            }
        }

        if (count($tarefaIds) > 0) {
            $anexos = \App\Models\GedDocumento::where('tenant_id', $user->tenant_id)
                ->where('entidade_vinculada_type', 'App\Models\Tarefa')
                ->whereIn('entidade_vinculada_id', $tarefaIds)
                ->get()
                ->groupBy('entidade_vinculada_id');

            $checklists = DB::table('prj_tarefa_checklists')
                ->whereIn('tarefa_id', $tarefaIds)
                ->get()
                ->groupBy('tarefa_id');

            $apontamentos = DB::table('prj_apontamentos')
                ->whereIn('tarefa_id', $tarefaIds)
                ->where('usuario_id', $usuarioId)
                ->whereNull('fim')
                ->whereNull('deleted_at')
                ->get()
                ->groupBy('tarefa_id');

            $dependencias = DB::table('prj_tarefa_dependencias')
                ->join('prj_tarefas', 'prj_tarefa_dependencias.depende_de_id', '=', 'prj_tarefas.id')
                ->whereIn('prj_tarefa_dependencias.tarefa_id', $tarefaIds)
                ->select('prj_tarefa_dependencias.tarefa_id', 'prj_tarefas.titulo', 'prj_tarefa_dependencias.depende_de_id as id')
                ->get()
                ->groupBy('tarefa_id');

            // Busca dados ricos da prioridade dinâmica para colorir o card
            $dictPrioridades = DB::table('prj_prioridades_tarefas')->where('tenant_id', $user->tenant_id)->get()->keyBy('id');

            foreach ($projeto->etapas as $etapa) {
                foreach ($etapa->tarefas as $tarefa) {
                    $tarefa->anexos = $anexos->get($tarefa->id, []);
                    $tarefa->checklists = $checklists->get($tarefa->id, []);
                    $tarefa->apontamentos = $apontamentos->get($tarefa->id, []);
                    $tarefa->dependencias = $dependencias->get($tarefa->id, []);

                    // Acopla os metadados visuais da prioridade dinâmica
                    if ($tarefa->prioridade_id && $dictPrioridades->has($tarefa->prioridade_id)) {
                        $tarefa->prioridade_dinamica = $dictPrioridades[$tarefa->prioridade_id];
                    }
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
            'prioridade_id' => 'nullable|uuid|exists:prj_prioridades_tarefas,id'
        ]);

        $etapa = Etapa::findOrFail($etapaId);

        $tarefa = Tarefa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'projeto_id' => $etapa->projeto_id,
            'etapa_id' => $etapa->id,
            'titulo' => $validated['titulo'],
            'prioridade' => 2, // Legado de ordenação visual mantido para compatibilidade
            'prioridade_id' => $validated['prioridade_id'] ?? null, // Nova tabela de domínio
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
        $validated = $request->validate(['descricao' => 'required|string|max:255']);

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
        $validated = $request->validate(['depende_de_id' => 'required|uuid|exists:prj_tarefas,id']);
        $tarefa = Tarefa::findOrFail($tarefaId);
        $tarefa->dependencias()->syncWithoutDetaching([$validated['depende_de_id']]);

        return response()->json(['message' => 'Dependência adicionada com sucesso.']);
    }

    public function removerDependencia(Request $request, string $tarefaId, string $dependeDeId): JsonResponse
    {
        $tarefa = Tarefa::findOrFail($tarefaId);
        $tarefa->dependencias()->detach($dependeDeId);

        return response()->json(['message' => 'Dependência removida com sucesso.']);
    }

    public function alterarPrioridade(Request $request, $tarefaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'prioridade_id' => 'required|uuid|exists:prj_prioridades_tarefas,id'
        ]);

        $tarefa = Tarefa::where('tenant_id', $tenantId)->findOrFail($tarefaId);
        $tarefa->update(['prioridade_id' => $validated['prioridade_id']]);

        return response()->json(['message' => 'Prioridade atualizada com sucesso!']);
    }

    public function criarEtapa(Request $request, $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'cor_hex' => 'nullable|string|max:7'
        ]);

        $ordem = Etapa::where('projeto_id', $projetoId)->max('ordem') + 1;

        $etapa = Etapa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $projetoId,
            'nome' => $validated['nome'],
            'cor_hex' => $validated['cor_hex'] ?? '#3b82f6',
            'ordem' => $ordem
        ]);

        return response()->json(['message' => 'Etapa criada com sucesso!', 'data' => $etapa], 201);
    }

    public function renomearEtapa(Request $request, $etapaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'cor_hex' => 'nullable|string|max:7'
        ]);

        $etapa = Etapa::where('tenant_id', $tenantId)->findOrFail($etapaId);
        $etapa->update([
            'nome' => $validated['nome'],
            'cor_hex' => $validated['cor_hex'] ?? $etapa->cor_hex
        ]);

        return response()->json(['message' => 'Etapa atualizada com sucesso!']);
    }

    public function excluirEtapa(Request $request, $etapaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $etapa = Etapa::where('tenant_id', $tenantId)->findOrFail($etapaId);

        if ($etapa->tarefas()->count() > 0) {
            return response()->json(['message' => 'Não é possível excluir uma etapa com tarefas. Mova ou apague as tarefas primeiro.'], 400);
        }

        $etapa->delete();
        return response()->json(['message' => 'Etapa excluída com sucesso!']);
    }
}
