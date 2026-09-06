<?php

namespace App\Http\Middleware;

use App\Models\Empresa;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class IdentifyEmpresa
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $tenantId = $user->tenant_id ?? (App::bound('current_tenant_id') ? App::make('current_tenant_id') : null);

            // Permite header explícito X-Empresa-Id ou fallback para a empresa padrão do operador
            $headerEmpresaId = $request->header('X-Empresa-Id');

            $empresaId = null;
            if (!empty($headerEmpresaId)) {
                $existe = Empresa::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('id', $headerEmpresaId)
                    ->exists();

                if ($existe) {
                    $empresaId = $headerEmpresaId;
                }
            }

            if (!$empresaId) {
                $empresaId = $user->empresa_padrao_id
                    ?? Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->orderByDesc('is_matriz')->value('id');
            }

            if ($empresaId) {
                App::instance('current_empresa_id', $empresaId);
            }
        }

        return $next($request);
    }
}
