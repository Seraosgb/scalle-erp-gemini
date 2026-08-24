<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EmpresaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresas = Empresa::where('tenant_id', $tenantId)->orderBy('razao_social')->get();

        return response()->json(['data' => $empresas]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // 1. Validação de Cotas SaaS do Plano
        $assinatura = Assinatura::where('tenant_id', $tenantId)->with('plano')->first();
        if ($assinatura && $assinatura->plano) {
            $totalEmpresas = Empresa::where('tenant_id', $tenantId)->count();
            if ($totalEmpresas >= $assinatura->plano->limite_empresas) {
                return response()->json([
                    'error' => [
                        'code' => 'PLAN_LIMIT_REACHED',
                        'message' => "Seu plano ({$assinatura->plano->nome}) permite até {$assinatura->plano->limite_empresas} empresa(s)/filial(is). Faça upgrade para adicionar mais unidades.",
                    ]
                ], Response::HTTP_PAYMENT_REQUIRED);
            }
        }

        $validated = $request->validate([
            'nome_fantasia' => 'required|string|max:150',
            'razao_social' => 'required|string|max:200',
            'cnpj' => 'required|string|max:20',
            'inscricao_estadual' => 'nullable|string|max:30',
            'regime_tributario' => 'required|string',
            'is_matriz' => 'boolean',
        ]);

        $validated['id'] = (string) Str::uuid();
        $validated['tenant_id'] = $tenantId;

        $empresa = Empresa::create($validated);

        return response()->json(['data' => $empresa], 201);
    }

    public function trocarContexto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_id' => 'required|uuid|exists:sis_empresas,id',
        ]);

        $user = $request->user();
        $empresa = Empresa::where('tenant_id', $user->tenant_id)->findOrFail($validated['empresa_id']);

        $user->update(['empresa_padrao_id' => $empresa->id]);

        return response()->json([
            'data' => [
                'message' => "Contexto alterado com sucesso para: {$empresa->nome_fantasia}",
                'empresa' => $empresa,
            ]
        ]);
    }
}