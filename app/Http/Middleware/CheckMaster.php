<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaster
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_master) {
            return response()->json([
                'error' => [
                    'code' => 'MASTER_ACCESS_REQUIRED',
                    'message' => 'Acesso restrito ao Administrador Global (SaaS Owner).',
                ]
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}