<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user || !$user->hasPermission($permission)) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN_ACCESS',
                    'message' => 'Você não possui permissão para executar esta ação.',
                ]
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}