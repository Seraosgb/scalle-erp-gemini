<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Projeto;
use App\Models\Etapa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Tarefa;

class ProjetoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Projeto::where('tenant_id', $tenantId)
            ->withCount('tarefas')
            ->with('cliente:id,nome_razao_social,cpf_cnpj');

        if ($request->filled('status') && $request->status !== 'TODOS') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'ILIKE', "%{$search}%")
                  ->orWhere('descricao', 'ILIKE', "%{$search}%")
                  ->orWhereHas('cliente', fn($c) => $c->where('nome_razao_social', 'ILIKE', "%{$search}%"));
            });
        }

        $projetos = $query->orderByDesc('created_at')->paginate(20);

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

            $proj->status = 'ATIVO';
            $proj->save();

            // Scaffolding dinâmico Kanban
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
        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:200',
            'descricao' => 'nullable|string',
            'cliente_id' => 'nullable|uuid|exists:pes_pessoas,id',
        ]);

        $projeto->update([
            'nome' => $validated['nome'],
            'descricao' => $validated['descricao'] ?? null,
            'cliente_id' => $validated['cliente_id'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'message' => 'Configurações do projeto atualizadas com sucesso!',
                'projeto' => $projeto
            ]
        ]);
    }

    public function atualizarOrcamento(Request $request, string $projetoId): JsonResponse
    {
        $validated = $request->validate(['orcamento_previsto' => 'required|numeric|min:0']);
        $projeto = Projeto::where('tenant_id', $request->user()->tenant_id)->findOrFail($projetoId);
        $projeto->update(['orcamento_previsto' => $validated['orcamento_previsto']]);

        return response()->json(['data' => $projeto]);
    }
    public function gantt(Request $request, string $projetoId): \Illuminate\Http\JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $tarefas = \App\Models\Projetos\Tarefa::where('tenant_id', $tenantId)
            ->whereHas('etapa', function($q) use ($projetoId) {
                $q->where('projeto_id', $projetoId);
            })
            ->whereNotNull('data_inicio_prevista')
            ->whereNotNull('data_fim_prevista')
            ->with('responsavel:id,name')
            ->orderBy('data_inicio_prevista')
            ->get(['id', 'titulo', 'data_inicio_prevista', 'data_fim_prevista', 'responsavel_id', 'status']);

        return response()->json(['data' => $tarefas]);
    }

    public function capacidade(Request $request, string $projetoId): \Illuminate\Http\JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // Puxa as horas apontadas agrupadas por usuário neste projeto
        $apontamentos = \App\Models\Apontamento::where('tenant_id', $tenantId)
            ->whereHas('tarefa.etapa', function($q) use ($projetoId) {
                $q->where('projeto_id', $projetoId);
            })
            ->select('usuario_id', DB::raw('SUM(EXTRACT(EPOCH FROM (fim - inicio))/3600) as horas_realizadas'))
            ->whereNotNull('fim')
            ->groupBy('usuario_id')
            ->get()
            ->keyBy('usuario_id');

        // Cruzamento com o limite do usuário no projeto (Resource Planning)
        $equipe = DB::table('prj_projeto_usuarios')
            ->join('users', 'prj_projeto_usuarios.usuario_id', '=', 'users.id')
            ->where('prj_projeto_usuarios.projeto_id', $projetoId)
            ->select('users.id', 'users.name', 'prj_projeto_usuarios.limite_horas_semanais')
            ->get();

        $capacidade = $equipe->map(function($membro) use ($apontamentos) {
            $realizadas = $apontamentos->has($membro->id) ? (float) $apontamentos[$membro->id]->horas_realizadas : 0;
            $limite = (float) $membro->limite_horas_semanais;
            $percentual = $limite > 0 ? min(100, ($realizadas / $limite) * 100) : 0;

            return [
                'id' => $membro->id,
                'nome' => $membro->name,
                'limite_horas' => $limite,
                'horas_realizadas' => round($realizadas, 2),
                'percentual_uso' => round($percentual, 1),
                'status' => $percentual > 90 ? 'OVERBOOKED' : ($percentual > 70 ? 'ATENCAO' : 'OK')
            ];
        });

        return response()->json(['data' => $capacidade]);
    }
    public function alterarStatus(Request $request, $id): \Illuminate\Http\JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate(['status' => 'required|string']);

        $projeto = \App\Models\Projeto::where('tenant_id', $tenantId)->findOrFail($id);
        $projeto->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Status do projeto atualizado com sucesso!', 'data' => $projeto]);
    }
    public function listarStatus(Request $request): \Illuminate\Http\JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $status = \Illuminate\Support\Facades\DB::table('prj_status_projetos')
            ->where('tenant_id', $tenantId)
            ->orderBy('nome')
            ->get();

        // Fallback: Se o tenant não configurou nada, gera os básicos para não quebrar a UI
        if ($status->isEmpty()) {
            $basicos = [
                ['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'nome' => 'Ativo', 'cor_hex' => '#4f46e5'],
                ['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'nome' => 'Concluído', 'cor_hex' => '#10b981'],
                ['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'nome' => 'Pausado', 'cor_hex' => '#f59e0b']
            ];
            \Illuminate\Support\Facades\DB::table('prj_status_projetos')->insert($basicos);
            $status = collect($basicos);
        }

        return response()->json(['data' => $status]);
    }
}
