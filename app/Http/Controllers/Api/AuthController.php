<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
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

        $user = User::withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('email', $request->email)
            ->first();

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

        if (!empty($user->tenant_id)) {
            \Illuminate\Support\Facades\App::instance('current_tenant_id', $user->tenant_id);
        }

        $perfil = null;
        if (!empty($user->perfil_id)) {
            $perfil = \App\Models\Perfil::withoutGlobalScopes()->find($user->perfil_id);
        }

        // CARREGA OS MÓDULOS DO PLANO ATUAL DO TENANT
        $modulosHabilitados = ['*'];
        if (!$user->is_master) {
            $assinatura = Assinatura::withoutGlobalScopes()
                ->where('tenant_id', $user->tenant_id)
                ->with('plano')
                ->first();

            $modulosHabilitados = $assinatura?->plano?->modulos_habilitados ?? [];
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
                    'perfil' => $perfil?->nome,
                    'is_admin' => $perfil?->is_admin ?? false,
                    'mfa_ativo' => (bool) $user->mfa_ativo,
                    'is_master' => (bool) $user->is_master,
                    'modulos_habilitados' => $modulosHabilitados,
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
        $user = $request->user()->load('perfil', 'empresaPadrao');

        // CARREGA OS MÓDULOS NO REFRESH DE PÁGINA (F5)
        $modulosHabilitados = ['*'];
        if (!$user->is_master) {
            $assinatura = Assinatura::withoutGlobalScopes()
                ->where('tenant_id', $user->tenant_id)
                ->with('plano')
                ->first();

            $modulosHabilitados = $assinatura?->plano?->modulos_habilitados ?? [];
        }

        $userData = $user->toArray();
        $userData['modulos_habilitados'] = $modulosHabilitados;

        return response()->json([
            'data' => $userData
        ]);
    }

    public function mfaSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = TotpService::gerarSecret();
        $qrCodeUrl = TotpService::gerarQrCodeUrl($user->email, $secret);

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

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'senha_atual' => 'required|string',
            'nova_senha' => 'required|string|min:6|different:senha_atual',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['senha_atual'], $user->password)) {
            return response()->json(['error' => ['message' => 'A senha atual informada está incorreta.']], 422);
        }

        $user->update(['password' => $validated['nova_senha']]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json(['data' => ['message' => 'Senha atualizada com sucesso. Demais dispositivos foram desconectados.']]);
    }

    public function solicitarRecuperacaoSenha(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $user = User::withoutGlobalScopes()->where('email', $request->email)->first();

        if ($user) {
            $token = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::random(6));
            \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );

            \Illuminate\Support\Facades\Log::info("[RECUPERAÇÃO DE SENHA SCALLE] E-mail: {$user->email} | Código: {$token}");
        }

        return response()->json([
            'data' => [
                'message' => 'Se o e-mail pertencer a uma conta ativa, um código de verificação de 6 caracteres foi enviado.'
            ]
        ]);
    }

    public function redefinirSenha(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'codigo' => 'required|string|size:6',
            'nova_senha' => 'required|string|min:6',
        ]);

        $registro = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$registro || !Hash::check(strtoupper($validated['codigo']), $registro->token)) {
            return response()->json(['error' => ['message' => 'Código de recuperação inválido ou expirado.']], 422);
        }

        $user = User::withoutGlobalScopes()->where('email', $validated['email'])->firstOrFail();
        $user->update(['password' => $validated['nova_senha']]);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return response()->json(['data' => ['message' => 'Senha redefinida com sucesso! Você já pode acessar o sistema.']]);
    }
}
