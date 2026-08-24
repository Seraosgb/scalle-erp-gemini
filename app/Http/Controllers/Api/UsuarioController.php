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
        $query = User::where('tenant_id', $tenantId)->with(['perfil', 'empresaPadrao']);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('telefone', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->filled('is_ativo')) {
            $query->where('is_ativo', filter_var($request->get('is_ativo'), FILTER_VALIDATE_BOOLEAN));
        }

        $usuarios = $query->orderBy('name')->get();
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

        $assinatura = Assinatura::where('tenant_id', $tenantId)->with('plano')->first();
        if ($assinatura && $assinatura->plano) {
            $totalUsuarios = User::where('tenant_id', $tenantId)->count();
            if ($totalUsuarios >= $assinatura->plano->limite_usuarios) {
                return response()->json([
                    'error' => [
                        'code' => 'USER_QUOTA_EXCEEDED',
                        'message' => "Limite de assentos atingido ({$assinatura->plano->limite_usuarios} usuários no plano {$assinatura->plano->nome}). Faça upgrade para adicionar mais membros.",
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

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $usuario = User::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => "required|email|unique:users,email,{$id},id",
            'password' => 'nullable|string|min:6',
            'telefone' => 'nullable|string|max:30',
            'perfil_id' => 'nullable|uuid|exists:sis_perfis,id',
            'empresa_padrao_id' => 'nullable|uuid|exists:sis_empresas,id',
            'is_ativo' => 'boolean',
        ]);

        $usuario->name = $validated['name'];
        $usuario->email = $validated['email'];
        $usuario->telefone = $validated['telefone'] ?? null;
        $usuario->perfil_id = $validated['perfil_id'] ?? null;
        $usuario->empresa_padrao_id = $validated['empresa_padrao_id'] ?? $usuario->empresa_padrao_id;

        if (isset($validated['is_ativo'])) {
            $usuario->is_ativo = $validated['is_ativo'];
        }

        if (!empty($validated['password'])) {
            $usuario->password = Hash::make($validated['password']);
        }

        $usuario->save();

        return response()->json(['data' => $usuario->load('perfil', 'empresaPadrao')]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $usuario = User::where('tenant_id', $tenantId)->findOrFail($id);

        if ($usuario->id === $request->user()->id) {
            return response()->json([
                'error' => [
                    'code' => 'SELF_DELETE_FORBIDDEN',
                    'message' => 'Você não pode excluir seu próprio usuário logado.',
                ]
            ], 422);
        }

        $usuario->delete();

        return response()->json(['data' => ['message' => 'Usuário removido com sucesso.']]);
    }
}