<?php

namespace App\Http\Middleware;

use App\Models\Assinatura;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionStatus
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        if ($tenantId) {
            $assinatura = Assinatura::where('tenant_id', $tenantId)->first();

            if ($assinatura) {
                $statusBloqueio = in_array($assinatura->status, ['SOFT_LOCK', 'SUSPENSO', 'INADIMPLENTE']);
                $isMutacao = in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']);

                // Rotas financeiras de upgrade/pagamento permanecem liberadas
                $isRotaExcecao = $request->is('api/billing/*') || $request->is('api/empresas/trocar-contexto') || $request->is('api/auth/*');

                if ($statusBloqueio && $isMutacao && !$isRotaExcecao) {
                    return response()->json([
                        'error' => [
                            'code' => 'ACCOUNT_SOFT_LOCKED',
                            'message' => 'Sua conta está em modo Somente Leitura (Soft-Lock). Regularize sua assinatura para realizar novas operações.',
                        ]
                    ], Response::HTTP_PAYMENT_REQUIRED);
                }
            }
        }

        return $next($request);
    }
}