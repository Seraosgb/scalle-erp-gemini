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

    public function atualizarOrcamento(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate(['orcamento_previsto' => 'required|numeric|min:0']);
        $projeto = Projeto::where('tenant_id', $request->user()->tenant_id)->findOrFail($projetoId);
        $projeto->update(['orcamento_previsto' => $validated['orcamento_previsto']]);

        return response()->json(['data' => $projeto]);
    }

    // ==========================================
    // ABA: ALOCAÇÃO DE EQUIPA
    // ==========================================
    public function equipe(Request $request, string $projetoId): JsonResponse
    {
        $equipe = DB::table('prj_projeto_equipe')
            ->join('users', 'prj_projeto_equipe.usuario_id', '=', 'users.id')
            ->where('prj_projeto_equipe.projeto_id', $projetoId)
            ->select('prj_projeto_equipe.*', 'users.name as nome_usuario')
            ->get();

        return response()->json(['data' => $equipe]);
    }

    public function storeEquipe(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'usuario_id' => 'required|uuid',
            'custo_hora' => 'required|numeric|min:0'
        ]);

        DB::table('prj_projeto_equipe')->updateOrInsert(
            ['projeto_id' => $projetoId, 'usuario_id' => $validated['usuario_id']],
            [
                'id' => (string) Str::uuid(),
                'custo_hora' => $validated['custo_hora'],
                'created_at' => now(),
                'updated_at' => now()
            ]
        );

        return response()->json(['data' => ['message' => 'Membro alocado ao projeto com sucesso!']]);
    }

    // ==========================================
    // ABA: CUSTOS E DESPESAS EXTERNAS
    // ==========================================
    public function custos(Request $request, string $projetoId): JsonResponse
    {
        $custos = DB::table('prj_projeto_custos')
            ->where('projeto_id', $projetoId)
            ->orderByDesc('data_custo')
            ->get();

        return response()->json(['data' => $custos]);
    }

    public function storeCusto(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'descricao' => 'required|string|max:255',
            'valor' => 'required|numeric|min:0',
            'data_custo' => 'required|date'
        ]);

        DB::table('prj_projeto_custos')->insert([
            'id' => (string) Str::uuid(),
            'projeto_id' => $projetoId,
            'descricao' => $validated['descricao'],
            'valor' => $validated['valor'],
            'data_custo' => $validated['data_custo'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // GATILHO ENTERPRISE: Recalcula o Custo Total Real do Projeto imediatamente
        \App\Http\Controllers\Api\TimesheetController::recalcularCustoProjeto($projetoId);

        return response()->json(['data' => ['message' => 'Despesa externa lançada com sucesso!']]);
    }

    // ==========================================
    // ABA: ENTREGÁVEIS / MARCOS DE FATURAMENTO
    // ==========================================
    public function entregaveis(Request $request, string $projetoId): JsonResponse
    {
        $entregaveis = DB::table('prj_projeto_entregaveis')
            ->where('projeto_id', $projetoId)
            ->orderBy('data_prevista')
            ->get();

        return response()->json(['data' => $entregaveis]);
    }

    public function storeEntregavel(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'valor_faturamento' => 'required|numeric|min:0',
            'data_prevista' => 'nullable|date'
        ]);

        DB::table('prj_projeto_entregaveis')->insert([
            'id' => (string) Str::uuid(),
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

    // ==========================================
    // KANBAN: ADICIONAR TAREFA NA ETAPA
    // ==========================================
    public function storeTarefa(Request $request, string $etapaId): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'prioridade' => 'required|string|in:BAIXA,MEDIA,ALTA,URGENTE'
        ]);

        $etapa = DB::table('prj_etapas')->where('id', $etapaId)->first();

        if (!$etapa) {
            return response()->json(['error' => ['message' => 'Etapa não encontrada no Kanban.']], 404);
        }

        $tarefaId = (string) Str::uuid();

        DB::table('prj_tarefas')->insert([
            'id' => $tarefaId,
            'tenant_id' => $etapa->tenant_id,
            'projeto_id' => $etapa->projeto_id,
            'etapa_id' => $etapaId,
            'titulo' => $validated['titulo'],
            'prioridade' => $validated['prioridade'],
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['data' => ['message' => 'Tarefa criada com sucesso no quadro!']]);
    }
}
