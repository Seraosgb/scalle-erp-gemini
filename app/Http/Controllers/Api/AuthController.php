<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TotpService;
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
            'mfa_code' => 'nullable|string|size:6',
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

        // Validação de Segundo Fator (MFA)
        if ($user->mfa_ativo) {
            if (!$request->filled('mfa_code')) {
                return response()->json([
                    'data' => [
                        'mfa_requerido' => true,
                        'message' => 'Segundo fator de autenticação (MFA) obrigatório.',
                    ]
                ], Response::HTTP_OK);
            }

            if (!TotpService::validarCodigo($user->mfa_secret, $request->mfa_code)) {
                return response()->json([
                    'error' => [
                        'code' => 'INVALID_MFA_CODE',
                        'message' => 'Código de autenticação TOTP inválido ou expirado.',
                    ]
                ], Response::HTTP_UNAUTHORIZED);
            }
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
                    'mfa_ativo' => (bool) $user->mfa_ativo,
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

    public function mfaSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = TotpService::gerarSecret();
        $qrCodeUrl = TotpService::gerarQrCodeUrl($user->email, $secret);

        // Guarda temporariamente o segredo no usuário até a confirmação
        $user->update(['mfa_secret' => $secret]);

        return response()->json([
            'data' => [
                'secret' => $secret,
                'qr_code_url' => $qrCodeUrl,
            ]
        ]);
    }

    public function mfaConfirmar(Request $request): JsonResponse
    {
        $request->validate([
            'codigo' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (empty($user->mfa_secret)) {
            return response()->json(['error' => ['message' => 'Configure o MFA antes de confirmar.']], 422);
        }

        if (!TotpService::validarCodigo($user->mfa_secret, $request->codigo)) {
            return response()->json(['error' => ['message' => 'Código inválido. Tente novamente com o código atual do seu aplicativo autenticador.']], 422);
        }

        $user->update(['mfa_ativo' => true]);

        return response()->json([
            'data' => [
                'message' => 'Autenticação em Dois Fatores (MFA) ativada com sucesso!',
                'mfa_ativo' => true,
            ]
        ]);
    }

    public function mfaDesativar(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['error' => ['message' => 'Senha incorreta.']], 422);
        }

        $user->update([
            'mfa_ativo' => false,
            'mfa_secret' => null,
        ]);

        return response()->json([
            'data' => [
                'message' => 'Autenticação em Dois Fatores (MFA) desativada.',
                'mfa_ativo' => false,
            ]
        ]);
    }
}