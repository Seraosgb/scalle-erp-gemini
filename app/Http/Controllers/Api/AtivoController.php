<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PatrimonioBem;
use App\Models\PlanoPreventivo;
use App\Models\TabelaDominio;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AtivoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = PatrimonioBem::query()->with('responsavel');

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            if ($request->filled('search')) {
                $search = $request->get('search');
                $query->where(function ($q) use ($search) {
                    $q->where('descricao', 'ILIKE', "%{$search}%")
                      ->orWhere('codigo_patrimonio', 'ILIKE', "%{$search}%")
                      ->orWhere('numero_serie', 'ILIKE', "%{$search}%")
                      ->orWhere('marca_modelo', 'ILIKE', "%{$search}%");
                });
            }

            $ativos = $query->orderBy('descricao')->get();
            return response()->json(['data' => $ativos]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first() ?? Empresa::first();

        $validated = $request->validate([
            'descricao' => 'required|string|max:200',
            'codigo_patrimonio' => 'required|string|max:50',
            'marca_modelo' => 'nullable|string|max:150',
            'numero_serie' => 'nullable|string|max:100',
            'localizacao_fisica' => 'nullable|string|max:150',
            'responsavel_atual_id' => 'nullable|uuid|exists:users,id',
            'valor_aquisicao' => 'nullable|numeric',
            'data_aquisicao' => 'nullable|date',
        ]);

        $ativo = PatrimonioBem::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa?->id,
            'descricao' => $validated['descricao'],
            'codigo_patrimonio' => strtoupper($validated['codigo_patrimonio']),
            'marca_modelo' => $validated['marca_modelo'] ?? null,
            'numero_serie' => $validated['numero_serie'] ?? null,
            'localizacao_fisica' => $validated['localizacao_fisica'] ?? null,
            'responsavel_atual_id' => $validated['responsavel_atual_id'] ?? null,
            'valor_aquisicao' => $validated['valor_aquisicao'] ?? null,
            'data_aquisicao' => $validated['data_aquisicao'] ?? now()->toDateString(),
            'status' => 'ATIVO',
        ]);

        return response()->json(['data' => $ativo], 201);
    }

    public function planosPreventivos(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = PlanoPreventivo::query()->with(['cliente', 'ativo', 'tecnicoPadrao']);

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            $planos = $query->orderBy('proxima_execucao')->get();
            return response()->json(['data' => $planos]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function storePlanoPreventivo(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first() ?? Empresa::first();

        $validated = $request->validate([
            'cliente_id' => 'required|uuid|exists:pes_pessoas,id',
            'ativo_id' => 'nullable|uuid|exists:pat_bens,id',
            'tecnico_padrao_id' => 'nullable|uuid|exists:users,id',
            'titulo_plano' => 'required|string|max:150',
            'frequencia' => 'required|string|in:SEMANAL,QUINZENAL,MENSAL,BIMESTRAL,TRIMESTRAL,SEMESTRAL,ANUAL',
            'proxima_execucao' => 'required|date',
            'instrucoes_tecnicas' => 'nullable|string',
            'checklist_itens' => 'nullable|array',
        ]);

        $plano = PlanoPreventivo::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa?->id,
            'cliente_id' => $validated['cliente_id'],
            'ativo_id' => $validated['ativo_id'] ?? null,
            'tecnico_padrao_id' => $validated['tecnico_padrao_id'] ?? null,
            'titulo_plano' => $validated['titulo_plano'],
            'frequencia' => $validated['frequencia'],
            'proxima_execucao' => $validated['proxima_execucao'],
            'instrucoes_tecnicas' => $validated['instrucoes_tecnicas'] ?? null,
            'checklist_itens' => $validated['checklist_itens'] ?? [],
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $plano->load(['cliente', 'ativo', 'tecnicoPadrao'])], 201);
    }

    public function prioridades(Request $request): JsonResponse
    {
        $padroes = [
            ['id' => 'p-baixa', 'codigo' => 'BAIXA', 'nome' => 'Baixa (72h)', 'cor_hex' => '#64748b', 'ordem_exibicao' => 1, 'metadados' => ['horas_sla' => 72]],
            ['id' => 'p-normal', 'codigo' => 'NORMAL', 'nome' => 'Normal (24h)', 'cor_hex' => '#3b82f6', 'ordem_exibicao' => 2, 'metadados' => ['horas_sla' => 24]],
            ['id' => 'p-alta', 'codigo' => 'ALTA', 'nome' => 'Alta (12h)', 'cor_hex' => '#f59e0b', 'ordem_exibicao' => 3, 'metadados' => ['horas_sla' => 12]],
            ['id' => 'p-urgente', 'codigo' => 'URGENTE', 'nome' => 'Urgente (6h)', 'cor_hex' => '#ef4444', 'ordem_exibicao' => 4, 'metadados' => ['horas_sla' => 6]],
        ];

        try {
            $user = $request->user();
            $tenantId = $user?->tenant_id;

            if ($tenantId && Schema::hasTable('sis_tabelas_dominio')) {
                $existentes = TabelaDominio::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('tipo_lista', 'PRIORIDADE_OS')
                    ->orderBy('ordem_exibicao')
                    ->get();

                if ($existentes->isEmpty()) {
                    foreach ($padroes as $p) {
                        TabelaDominio::create([
                            'id' => (string) Str::uuid(),
                            'tenant_id' => $tenantId,
                            'tipo_lista' => 'PRIORIDADE_OS',
                            'codigo' => $p['codigo'],
                            'nome' => $p['nome'],
                            'cor_hex' => $p['cor_hex'],
                            'ordem_exibicao' => $p['ordem_exibicao'],
                            'metadados' => $p['metadados'],
                            'is_ativo' => true,
                            'is_sistema' => true,
                        ]);
                    }
                    $existentes = TabelaDominio::where('tenant_id', $tenantId)
                        ->where('tipo_lista', 'PRIORIDADE_OS')
                        ->orderBy('ordem_exibicao')
                        ->get();
                }

                return response()->json(['data' => $existentes]);
            }
        } catch (Exception $e) {
            // Retorna padrão em caso de erro
        }

        return response()->json(['data' => $padroes]);
    }

    public function storePrioridade(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'codigo' => 'required|string|max:50',
            'cor_hex' => 'required|string|max:10',
            'horas_sla' => 'required|integer|min:1',
            'ordem_exibicao' => 'nullable|integer',
        ]);

        $prioridade = TabelaDominio::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'tipo_lista' => 'PRIORIDADE_OS',
            'codigo' => strtoupper($validated['codigo']),
            'nome' => $validated['nome'],
            'cor_hex' => $validated['cor_hex'],
            'ordem_exibicao' => $validated['ordem_exibicao'] ?? 1,
            'metadados' => ['horas_sla' => (int)$validated['horas_sla']],
            'is_ativo' => true,
            'is_sistema' => false,
        ]);

        return response()->json(['data' => $prioridade], 201);
    }
}