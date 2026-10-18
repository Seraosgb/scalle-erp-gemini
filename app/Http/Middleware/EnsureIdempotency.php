<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            return $next($request);
        }

        $idempotencyKey = $request->header('Idempotency-Key');
        if (empty($idempotencyKey)) {
            return $next($request);
        }

        $tenantId = $request->user()?->tenant_id ?? 'public';
        $cacheKey = "idemp:{$tenantId}:{$idempotencyKey}";

        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            return response()->json($cached['body'], $cached['status'])
                ->header('X-Idempotent-Replayed', 'true');
        }

        $response = $next($request);

        if ($response->isSuccessful()) {
            Cache::put($cacheKey, [
                'body' => json_decode($response->getContent(), true),
                'status' => $response->getStatusCode(),
            ], now()->addHours(24));
        }

        return $response;
    }
}
