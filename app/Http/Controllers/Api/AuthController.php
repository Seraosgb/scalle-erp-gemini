<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CREDENTIALS',
                    'message' => 'Credenciais de acesso incorretas.',
                ]
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->is_ativo) {
            return response()->json([
                'error' => [
                    'code' => 'USER_INACTIVE',
                    'message' => 'Usuário desativado no sistema.',
                ]
            ], Response::HTTP_FORBIDDEN);
        }

        $token = $user->createToken('scalle_auth_token')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'tenant_id' => $user->tenant_id,
                    'perfil' => $user->perfil?->nome,
                    'is_admin' => $user->perfil?->is_admin ?? false,
                ]
            ]
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'data' => [
                'message' => 'Sessão encerrada com sucesso.'
            ]
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->load('perfil', 'empresaPadrao')
        ]);
    }
}