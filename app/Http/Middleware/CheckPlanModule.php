<?php

namespace App\Http\Middleware;

use App\Models\Assinatura;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPlanModule
{
    public function handle(Request $request, Closure $next, string $moduloRequerido): Response
    {
        $user = $request->user();
        if (!$user || $user->is_master) {
            return $next($request);
        }

        $assinatura = Assinatura::withoutGlobalScopes()
            ->where('tenant_id', $user->tenant_id)
            ->with('plano')
            ->first();

        $modulosPermitidos = $assinatura?->plano?->modulos_habilitados;

        // Se a lista de módulos do plano for definida e não contiver '*' nem o módulo atual, bloqueia
        if (is_array($modulosPermitidos) && !empty($modulosPermitidos) && !in_array('*', $modulosPermitidos)) {
            if (!in_array(strtolower($moduloRequerido), array_map('strtolower', $modulosPermitidos))) {
                return response()->json([
                    'error' => [
                        'code' => 'MODULE_NOT_INCLUDED_IN_PLAN',
                        'message' => "O módulo (" . strtoupper($moduloRequerido) . ") não está incluído no seu plano atual ({$assinatura->plano->nome}). Faça um upgrade em Minha Assinatura para desbloquear.",
                    ]
                ], Response::HTTP_PAYMENT_REQUIRED);
            }
        }

        return $next($request);
    }
}
