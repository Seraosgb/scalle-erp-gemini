<?php

namespace App\Http\Middleware;

use App\Models\Assinatura;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStorageQuota
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        if ($tenantId && $request->hasFile('file') || $request->hasFile('xml_file')) {
            $assinatura = Assinatura::where('tenant_id', $tenantId)->with('plano')->first();

            if ($assinatura && $assinatura->plano) {
                $tamanhoUpload = 0;
                foreach ($request->allFiles() as $arquivo) {
                    $tamanhoUpload += is_array($arquivo) ? 0 : $arquivo->getSize();
                }

                $novoTotal = $assinatura->storage_utilizado_bytes + $tamanhoUpload;

                if ($novoTotal > $assinatura->plano->cota_storage_bytes) {
                    return response()->json([
                        'error' => [
                            'code' => 'STORAGE_QUOTA_EXCEEDED',
                            'message' => 'Limite de armazenamento do plano atingido (' . round($assinatura->plano->cota_storage_bytes / 1073741824, 1) . ' GB). Faça um upgrade para continuar.',
                        ]
                    ], Response::HTTP_PAYMENT_REQUIRED);
                }
            }
        }

        return $next($request);
    }
}