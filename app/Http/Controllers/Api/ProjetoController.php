<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Entregavel;
use App\Models\Etapa;
use App\Models\Pessoa;
use App\Models\Projeto;
use App\Models\ProjetoCusto;
use App\Models\ProjetoEquipe;
use App\Models\Tarefa;
use App\Services\FinanceiroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ProjetoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Projeto::where('tenant_id', $tenantId)
            ->withCount('tarefas')
            ->with(['etapas', 'cliente']);

        if ($request->filled('status') && $request->get('status') !== 'TODOS') {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where(function ($q) use ($s) {
                $q->where('nome', 'ILIKE', "%{$s}%")
                  ->orWhere('descricao', 'ILIKE', "%{$s}%");
            });
        }

        $projetos = $query->orderByDesc('created_at')->paginate(15);
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
                'status' => 'ATIVO',
            ]);

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
            return response()->json(['error' => 'O campo status é obrigatório.'], 422);
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
        $status = DB::table('prj_status_projetos')->where('tenant_id', $tenantId)->orderBy('nome')->get();

        if ($status->isEmpty()) {
            $basicos = [
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Ativo', 'cor_hex' => '#4f46e5', 'created_at' => now(), 'updated_at' => now()],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Concluído', 'cor_hex' => '#10b981', 'created_at' => now(), 'updated_at' => now()],
                ['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Pausado', 'cor_hex' => '#f59e0b', 'created_at' => now(), 'updated_at' => now()]
            ];
            DB::table('prj_status_projetos')->insert($basicos);
            $status = collect($basicos);
        }

        return response()->json(['data' => $status]);
    }

    public function gantt(Request $request, string $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tarefas = Tarefa::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
            ->with('etapa:id,nome,cor_hex')
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $tarefas]);
    }

    public function capacidade(Request $request, string $projetoId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $equipe = ProjetoEquipe::where('tenant_id', $tenantId)
            ->where('projeto_id', $projetoId)
            ->with('usuario:id,name')
            ->get();

        return response()->json(['data' => $equipe]);
    }

    public function custos(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $custos = ProjetoCusto::where('tenant_id', $tenantId)
            ->where('projeto_id', $id)
            ->orderByDesc('data_custo')
            ->get();

        return response()->json(['data' => $custos]);
    }

    public function storeCusto(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()->id;
        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'descricao' => 'required|string|max:255',
            'valor' => 'required|numeric|min:0.01',
            'data_custo' => 'required|date'
        ]);

        DB::transaction(function () use ($validated, $id, $tenantId, $empresaId, $projeto) {
            $custo = ProjetoCusto::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'projeto_id' => $id,
                'descricao' => $validated['descricao'],
                'valor' => $validated['valor'],
                'data_custo' => $validated['data_custo'],
            ]);

            $fornecedorGenerico = Pessoa::firstOrCreate(
                ['tenant_id' => $tenantId, 'cpf_cnpj' => '00000000000000'],
                [
                    'id' => (string) Str::uuid(),
                    'tipo_pessoa' => 'PJ',
                    'nome_razao_social' => 'Despesas Operacionais de Projetos',
                    'is_fornecedor' => true,
                    'is_ativo' => true,
                ]
            );

            // Uso exclusivo do Contrato de Serviço Financeiro (Zero SQL direto)
            FinanceiroService::registrarTitulo([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pessoa_id' => $fornecedorGenerico->id,
                'natureza' => 'PAGAR',
                'documento_numero' => 'PRJ-CST-' . substr($custo->id, 0, 6),
                'origem_tipo' => 'projetos_custo',
                'origem_id' => $id,
                'data_vencimento' => $validated['data_custo'],
                'valor_original' => (float) $validated['valor'],
                'historico' => "Custo de Projeto [{$projeto->nome}]: {$validated['descricao']}",
            ]);

            if (Schema::hasColumn('prj_projetos', 'custo_total_real')) {
                TimesheetController::recalcularCustoProjeto($id, $tenantId);
            }
        });

        return response()->json(['data' => ['message' => 'Custo lançado e Contas a Pagar gerado com sucesso!']]);
    }

    public function entregaveis(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $entregaveis = Entregavel::where('tenant_id', $tenantId)
            ->where('projeto_id', $id)
            ->orderBy('data_prevista')
            ->get();

        return response()->json(['data' => $entregaveis]);
    }

    public function storeEntregavel(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'valor_faturamento' => 'required|numeric|min:0.01',
            'data_prevista' => 'nullable|date'
        ]);

        Entregavel::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'projeto_id' => $id,
            'titulo' => $validated['titulo'],
            'valor_faturamento' => $validated['valor_faturamento'],
            'data_prevista' => $validated['data_prevista'],
            'status' => 'PENDENTE',
        ]);

        return response()->json(['data' => ['message' => 'Marco de faturamento planejado com sucesso.']]);
    }

    public function faturarEntregavel(Request $request, string $entregavelId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()->id;

        $entregavel = Entregavel::where('tenant_id', $tenantId)->find($entregavelId);

        if (!$entregavel) return response()->json(['error' => 'Entregável não encontrado.'], 404);
        if ($entregavel->status === 'FATURADO') return response()->json(['error' => 'Este marco já foi faturado.'], 422);

        $projeto = Projeto::where('tenant_id', $tenantId)->findOrFail($entregavel->projeto_id);

        if (!$projeto->cliente_id) {
            return response()->json(['error' => 'O projeto não possui um cliente vinculado para emitir a cobrança.'], 422);
        }

        DB::transaction(function () use ($entregavel, $projeto, $tenantId, $empresaId) {
            $entregavel->update(['status' => 'FATURADO']);

            FinanceiroService::registrarTitulo([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pessoa_id' => $projeto->cliente_id,
                'natureza' => 'RECEBER',
                'documento_numero' => 'PRJ-FAT-' . substr($entregavel->id, 0, 6),
                'origem_tipo' => 'projetos_faturamento',
                'origem_id' => $projeto->id,
                'data_vencimento' => now()->addDays(15)->toDateString(),
                'valor_original' => (float) $entregavel->valor_faturamento,
                'historico' => "Faturamento do Projeto [{$projeto->nome}]: Marco {$entregavel->titulo}",
            ]);
        });

        return response()->json(['data' => ['message' => 'Fatura gerada com sucesso e injetada no Contas a Receber!']]);
    }
}
