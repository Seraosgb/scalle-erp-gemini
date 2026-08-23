<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !empty($user->tenant_id)) {
            // Injeta o tenant_id ativo no container da aplicação para os Global Scopes
            App::instance('current_tenant_id', $user->tenant_id);
        }

        return $next($request);
    }
}