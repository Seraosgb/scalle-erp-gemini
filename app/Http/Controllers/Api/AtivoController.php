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
            $tenantId = $request->user()->tenant_id;
            $query = PatrimonioBem::where('tenant_id', $tenantId)->with('responsavel');

            if ($request->filled('search')) {
                $search = $request->get('search');
                $query->where(function ($q) use ($search) {
                    $q->where('descricao', 'ILIKE', "%{$search}%")
                      ->orWhere('codigo_patrimonio', 'ILIKE', "%{$search}%")
                      ->orWhere('numero_serie', 'ILIKE', "%{$search}%");
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
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        $validated = $request->validate([
            'descricao' => 'required|string|max:200',
            'codigo_patrimonio' => 'required|string|max:50',
            'marca_modelo' => 'nullable|string|max:150',
            'numero_serie' => 'nullable|string|max:100',
            'localizacao_fisica' => 'nullable|string|max:150',
            'responsavel_atual_id' => 'nullable|uuid|exists:users,id',
        ]);

        $ativo = PatrimonioBem::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'descricao' => $validated['descricao'],
            'codigo_patrimonio' => strtoupper($validated['codigo_patrimonio']),
            'marca_modelo' => $validated['marca_modelo'] ?? null,
            'numero_serie' => $validated['numero_serie'] ?? null,
            'localizacao_fisica' => $validated['localizacao_fisica'] ?? null,
            'responsavel_atual_id' => $validated['responsavel_atual_id'] ?? null,
            'status' => 'ATIVO',
        ]);

        return response()->json(['data' => $ativo], 201);
    }

    public function planosPreventivos(Request $request): JsonResponse
    {
        try {
            if (!Schema::hasTable('os_planos_preventivos')) {
                return response()->json(['data' => []]);
            }

            $tenantId = $request->user()->tenant_id;
            $planos = PlanoPreventivo::where('tenant_id', $tenantId)
                ->with(['cliente', 'ativo', 'tecnicoPadrao'])
                ->orderBy('proxima_execucao')
                ->get();

            return response()->json(['data' => $planos]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function storePlanoPreventivo(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        $validated = $request->validate([
            'cliente_id' => 'required|uuid|exists:pes_pessoas,id',
            'ativo_id' => 'nullable|uuid|exists:pat_bens,id',
            'tecnico_padrao_id' => 'nullable|uuid|exists:users,id',
            'titulo_plano' => 'required|string|max:150',
            'frequencia' => 'required|string|in:MENSAL,BIMESTRAL,TRIMESTRAL,SEMESTRAL,ANUAL',
            'proxima_execucao' => 'required|date',
            'instrucoes_tecnicas' => 'nullable|string',
        ]);

        $plano = PlanoPreventivo::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'cliente_id' => $validated['cliente_id'],
            'ativo_id' => $validated['ativo_id'] ?? null,
            'tecnico_padrao_id' => $validated['tecnico_padrao_id'] ?? null,
            'titulo_plano' => $validated['titulo_plano'],
            'frequencia' => $validated['frequencia'],
            'proxima_execucao' => $validated['proxima_execucao'],
            'instrucoes_tecnicas' => $validated['instrucoes_tecnicas'] ?? null,
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $plano->load(['cliente', 'ativo', 'tecnicoPadrao'])], 201);
    }

    public function prioridades(Request $request): JsonResponse
    {
        $padroes = [
            ['codigo' => 'BAIXA', 'nome' => 'Baixa (72h)', 'cor_hex' => '#64748b', 'ordem' => 1],
            ['codigo' => 'NORMAL', 'nome' => 'Normal (24h)', 'cor_hex' => '#3b82f6', 'ordem' => 2],
            ['codigo' => 'ALTA', 'nome' => 'Alta (12h)', 'cor_hex' => '#f59e0b', 'ordem' => 3],
            ['codigo' => 'URGENTE', 'nome' => 'Urgente (6h)', 'cor_hex' => '#ef4444', 'ordem' => 4],
        ];

        try {
            $tenantId = $request->user()?->tenant_id;

            if ($tenantId && Schema::hasTable('sis_tabelas_dominio')) {
                $existentes = TabelaDominio::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('tipo_lista', 'PRIORIDADE_OS')
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
                            'ordem_exibicao' => $p['ordem'],
                            'is_ativo' => true,
                            'is_sistema' => true,
                        ]);
                    }
                }

                $prioridades = TabelaDominio::where('tenant_id', $tenantId)
                    ->where('tipo_lista', 'PRIORIDADE_OS')
                    ->where('is_ativo', true)
                    ->orderBy('ordem_exibicao')
                    ->get();

                return response()->json(['data' => $prioridades]);
            }
        } catch (Exception $e) {
            // Fallback seguro caso o banco ainda esteja migrando
        }

        return response()->json(['data' => $padroes]);
    }
}