<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Perfil;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class UsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $usuarios = User::where('tenant_id', $tenantId)
            ->with(['perfil', 'empresaPadrao'])
            ->orderBy('name')
            ->get();

        $perfis = Perfil::where('tenant_id', $tenantId)->get();

        return response()->json([
            'data' => [
                'usuarios' => $usuarios,
                'perfis' => $perfis,
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // 1. Validação de Cotas SaaS de Usuários do Plano
        $assinatura = Assinatura::where('tenant_id', $tenantId)->with('plano')->first();
        if ($assinatura && $assinatura->plano) {
            $totalUsuarios = User::where('tenant_id', $tenantId)->count();
            if ($totalUsuarios >= $assinatura->plano->limite_usuarios) {
                return response()->json([
                    'error' => [
                        'code' => 'USER_QUOTA_EXCEEDED',
                        'message' => "Limite de assentos atingido ({$assinatura->plano->limite_usuarios} usuários no plano {$assinatura->plano->nome}). Faça um upgrade para adicionar mais membros.",
                    ]
                ], Response::HTTP_PAYMENT_REQUIRED);
            }
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'telefone' => 'nullable|string|max:30',
            'perfil_id' => 'nullable|uuid|exists:sis_perfis,id',
            'empresa_padrao_id' => 'nullable|uuid|exists:sis_empresas,id',
        ]);

        $usuario = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'telefone' => $validated['telefone'] ?? null,
            'perfil_id' => $validated['perfil_id'] ?? null,
            'empresa_padrao_id' => $validated['empresa_padrao_id'] ?? $request->user()->empresa_padrao_id,
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $usuario->load('perfil', 'empresaPadrao')], 201);
    }
}