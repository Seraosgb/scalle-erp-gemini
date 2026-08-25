<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PatrimonioBem;
use App\Models\PlanoPreventivo;
use App\Models\TabelaDominio;
use App\Models\Tenant;
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
            $query = PatrimonioBem::query()->with(['responsavel', 'cliente']);

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            if ($request->filled('cliente_id')) {
                $query->where('cliente_id', $request->get('cliente_id'));
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
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id ?? Tenant::first()?->id;
            
            $empresaId = $user->empresa_padrao_id 
                      ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                      ?? Empresa::first()?->id;

            $validated = $request->validate([
                'descricao' => 'required|string|max:200',
                'codigo_patrimonio' => 'required|string|max:50',
                'cliente_id' => 'nullable',
                'marca_modelo' => 'nullable|string|max:150',
                'numero_serie' => 'nullable|string|max:100',
                'localizacao_fisica' => 'nullable|string|max:150',
                'responsavel_atual_id' => 'nullable',
                'valor_aquisicao' => 'nullable',
                'data_aquisicao' => 'nullable',
            ]);

            $clienteId = (!empty($validated['cliente_id']) && Str::isUuid($validated['cliente_id'])) 
                ? $validated['cliente_id'] 
                : null;

            $responsavelId = (!empty($validated['responsavel_atual_id']) && Str::isUuid($validated['responsavel_atual_id'])) 
                ? $validated['responsavel_atual_id'] 
                : null;

            // Blindagem contra constraint NOT NULL do PostgreSQL
            $valorAquisicao = (isset($validated['valor_aquisicao']) && is_numeric($validated['valor_aquisicao'])) 
                ? (float) $validated['valor_aquisicao'] 
                : 0.00;

            $dataAquisicao = !empty($validated['data_aquisicao']) 
                ? $validated['data_aquisicao'] 
                : now()->toDateString();

            $codigoLimpo = strtoupper(trim($validated['codigo_patrimonio']));
            $qrHash = hash('sha256', "{$tenantId}|{$codigoLimpo}|" . Str::random(16));

            $ativo = PatrimonioBem::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'descricao' => $validated['descricao'],
                'codigo_patrimonio' => $codigoLimpo,
                'marca_modelo' => $validated['marca_modelo'] ?? null,
                'numero_serie' => $validated['numero_serie'] ?? null,
                'localizacao_fisica' => $validated['localizacao_fisica'] ?? null,
                'responsavel_atual_id' => $responsavelId,
                'qr_code_hash' => $qrHash,
                'valor_aquisicao' => $valorAquisicao,
                'data_aquisicao' => $dataAquisicao,
                'status' => 'ATIVO',
            ]);

            return response()->json(['data' => $ativo->load(['cliente', 'responsavel'])], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'ATIVO_STORE_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function planosPreventivos(Request $request): JsonResponse
    {
        try {
            if (!Schema::hasTable('os_planos_preventivos')) {
                return response()->json(['data' => []]);
            }

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
        $user = $request->user();
        $tenantId = $user->tenant_id ?? Tenant::first()?->id;
        $empresaId = $user->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()?->id;

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
            'empresa_id' => $empresaId,
            'cliente_id' => $validated['cliente_id'],
            'ativo_id' => !empty($validated['ativo_id']) ? $validated['ativo_id'] : null,
            'tecnico_padrao_id' => !empty($validated['tecnico_padrao_id']) ? $validated['tecnico_padrao_id'] : null,
            'titulo_plano' => $validated['titulo_plano'],
            'frequencia' => $validated['frequencia'],
            'proxima_execucao' => $validated['proxima_execucao'],
            'instrucoes_tecnicas' => $validated['instrucoes_tecnicas'] ?? null,
            'checklist_itens' => $validated['checklist_itens'] ?? [],
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $plano->load(['cliente', 'ativo', 'tecnicoPadrao'])], 201);
    }

    public function updatePlanoPreventivo(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $plano = PlanoPreventivo::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'cliente_id' => 'required|uuid|exists:pes_pessoas,id',
            'ativo_id' => 'nullable|uuid|exists:pat_bens,id',
            'tecnico_padrao_id' => 'nullable|uuid|exists:users,id',
            'titulo_plano' => 'required|string|max:150',
            'frequencia' => 'required|string',
            'proxima_execucao' => 'required|date',
            'instrucoes_tecnicas' => 'nullable|string',
        ]);

        $plano->update([
            'cliente_id' => $validated['cliente_id'],
            'ativo_id' => !empty($validated['ativo_id']) ? $validated['ativo_id'] : null,
            'tecnico_padrao_id' => !empty($validated['tecnico_padrao_id']) ? $validated['tecnico_padrao_id'] : null,
            'titulo_plano' => $validated['titulo_plano'],
            'frequencia' => $validated['frequencia'],
            'proxima_execucao' => $validated['proxima_execucao'],
            'instrucoes_tecnicas' => $validated['instrucoes_tecnicas'] ?? null,
        ]);

        return response()->json(['data' => $plano->load(['cliente', 'ativo', 'tecnicoPadrao'])]);
    }

    public function alterarStatusPlanoPreventivo(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $plano = PlanoPreventivo::where('tenant_id', $tenantId)->findOrFail($id);
        $plano->update(['is_ativo' => !$plano->is_ativo]);

        return response()->json(['data' => $plano]);
    }

    public function prioridades(Request $request): JsonResponse
    {
        $padroes = [
            ['id' => 'p-baixa', 'codigo' => 'BAIXA', 'nome' => 'Baixa (72h)', 'cor_hex' => '#64748b', 'ordem_exibicao' => 1, 'metadados' => ['horas_sla' => 72], 'is_ativo' => true],
            ['id' => 'p-normal', 'codigo' => 'NORMAL', 'nome' => 'Normal (24h)', 'cor_hex' => '#3b82f6', 'ordem_exibicao' => 2, 'metadados' => ['horas_sla' => 24], 'is_ativo' => true],
            ['id' => 'p-alta', 'codigo' => 'ALTA', 'nome' => 'Alta (12h)', 'cor_hex' => '#f59e0b', 'ordem_exibicao' => 3, 'metadados' => ['horas_sla' => 12], 'is_ativo' => true],
            ['id' => 'p-urgente', 'codigo' => 'URGENTE', 'nome' => 'Urgente (6h)', 'cor_hex' => '#ef4444', 'ordem_exibicao' => 4, 'metadados' => ['horas_sla' => 6], 'is_ativo' => true],
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
            // Retorna padrões em caso de erro
        }

        return response()->json(['data' => $padroes]);
    }

    public function storePrioridade(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? Tenant::first()?->id;
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

    public function updatePrioridade(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? Tenant::first()?->id;
        $prioridade = TabelaDominio::where('tenant_id', $tenantId)
            ->where('tipo_lista', 'PRIORIDADE_OS')
            ->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'cor_hex' => 'required|string|max:10',
            'horas_sla' => 'required|integer|min:1',
            'ordem_exibicao' => 'nullable|integer',
            'is_ativo' => 'boolean',
        ]);

        $prioridade->update([
            'nome' => $validated['nome'],
            'cor_hex' => $validated['cor_hex'],
            'ordem_exibicao' => $validated['ordem_exibicao'] ?? $prioridade->ordem_exibicao,
            'metadados' => ['horas_sla' => (int)$validated['horas_sla']],
            'is_ativo' => $validated['is_ativo'] ?? $prioridade->is_ativo,
        ]);

        return response()->json(['data' => $prioridade]);
    }
}