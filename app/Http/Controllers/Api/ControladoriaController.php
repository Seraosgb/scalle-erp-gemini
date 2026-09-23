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
}
