<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CentroCusto;
use App\Models\PlanoConta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ControladoriaController extends Controller
{
    // ==========================================
    // PLANO DE CONTAS
    // ==========================================
    public function indexPlanosContas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // Retorna a árvore hierárquica (apenas raízes que carregam seus filhos)
        $planos = PlanoConta::where('tenant_id', $tenantId)
            ->whereNull('parent_id')
            ->with('children.children') // Até 3 níveis para exibição rápida
            ->orderBy('codigo')
            ->get();

        return response()->json(['data' => $planos]);
    }

    public function storePlanoConta(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'parent_id' => 'nullable|uuid|exists:fin_planos_contas,id',
            'codigo' => 'required|string|max:50',
            'nome' => 'required|string|max:150',
            'tipo' => 'required|string|in:RECEITA,DESPESA,ATIVO,PASSIVO',
            'is_sintetico' => 'boolean'
        ]);

        $plano = PlanoConta::create(array_merge($validated, ['tenant_id' => $tenantId]));

        return response()->json(['data' => $plano], 201);
    }

    // ==========================================
    // CENTROS DE CUSTO
    // ==========================================
    public function indexCentrosCustos(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $centros = CentroCusto::where('tenant_id', $tenantId)
            ->whereNull('parent_id')
            ->with('children.children')
            ->orderBy('codigo')
            ->get();

        return response()->json(['data' => $centros]);
    }

    public function storeCentroCusto(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'parent_id' => 'nullable|uuid|exists:fin_centros_custos,id',
            'codigo' => 'required|string|max:50',
            'nome' => 'required|string|max:150',
            'is_sintetico' => 'boolean'
        ]);

        $centro = CentroCusto::create(array_merge($validated, ['tenant_id' => $tenantId]));

        return response()->json(['data' => $centro], 201);
    }

    // ==========================================
    // ONBOARDING: GERADOR AUTOMÁTICO
    // ==========================================
    public function gerarEstruturaPadrao(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // Evita duplicidade se já houver plano de contas
        if (\App\Models\PlanoConta::where('tenant_id', $tenantId)->exists()) {
            return response()->json(['error' => ['message' => 'O Tenant já possui uma estrutura de contas cadastrada.']], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($tenantId) {
            // 1. RECEITAS
            $receitaId = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $receitaId, 'tenant_id' => $tenantId, 'codigo' => '1', 'nome' => 'Receitas', 'tipo' => 'RECEITA', 'is_sintetico' => true]);

            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $receitaId, 'codigo' => '1.01', 'nome' => 'Receitas Operacionais (Serviços)', 'tipo' => 'RECEITA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $receitaId, 'codigo' => '1.02', 'nome' => 'Receitas com Vendas (Produtos)', 'tipo' => 'RECEITA', 'is_sintetico' => false]);

            // 2. DESPESAS E CUSTOS
            $despesaId = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $despesaId, 'tenant_id' => $tenantId, 'codigo' => '2', 'nome' => 'Custos e Despesas', 'tipo' => 'DESPESA', 'is_sintetico' => true]);

            $custoOp = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $custoOp, 'tenant_id' => $tenantId, 'parent_id' => $despesaId, 'codigo' => '2.01', 'nome' => 'Custos Operacionais', 'tipo' => 'DESPESA', 'is_sintetico' => true]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $custoOp, 'codigo' => '2.01.01', 'nome' => 'Compra de Mercadorias / Insumos', 'tipo' => 'DESPESA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $custoOp, 'codigo' => '2.01.02', 'nome' => 'Folha de Pagamento e Encargos', 'tipo' => 'DESPESA', 'is_sintetico' => false]);

            $despesaAdm = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $despesaAdm, 'tenant_id' => $tenantId, 'parent_id' => $despesaId, 'codigo' => '2.02', 'nome' => 'Despesas Administrativas', 'tipo' => 'DESPESA', 'is_sintetico' => true]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $despesaAdm, 'codigo' => '2.02.01', 'nome' => 'Água, Luz, Telefone e Internet', 'tipo' => 'DESPESA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $despesaAdm, 'codigo' => '2.02.02', 'nome' => 'Softwares e Assinaturas (SaaS)', 'tipo' => 'DESPESA', 'is_sintetico' => false]);

            // 3. CENTRO DE CUSTO BASE
            $ccRaiz = (string) Str::uuid();
            \App\Models\CentroCusto::create(['id' => $ccRaiz, 'tenant_id' => $tenantId, 'codigo' => '01', 'nome' => 'Matriz Operacional', 'is_sintetico' => true]);
            \App\Models\CentroCusto::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $ccRaiz, 'codigo' => '01.01', 'nome' => 'Administrativo & Diretoria', 'is_sintetico' => false]);
            \App\Models\CentroCusto::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $ccRaiz, 'codigo' => '01.02', 'nome' => 'Operação & Logística', 'is_sintetico' => false]);
        });

        return response()->json(['data' => ['message' => 'Estrutura contábil e de centros de custo gerada com sucesso!']]);
    }
}
