<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\FaturaBilling;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantBillingController extends Controller
{
    private function autorizarFinanceiro(Request $request): void
    {
        $usuario = $request->user();

        // 1. Libera imediatamente se for Master SaaS ou Admin do Tenant
        if ($usuario->is_master || ($usuario->perfil && $usuario->perfil->is_admin)) {
            return;
        }

        // 2. Normaliza o nome ou slug do perfil e verifica permissões permitidas
        $perfilNome = strtoupper(trim($usuario->perfil->nome ?? ''));
        $perfilSlug = strtoupper(trim($usuario->perfil->slug ?? ''));
        $role = strtoupper(trim($usuario->role ?? ''));

        $cargosPermitidos = ['ADMIN', 'ADMINISTRADOR', 'FINANCEIRO', 'GESTOR', 'GERENTE', 'DIRETOR', 'MASTER'];

        $autorizado = false;
        foreach ($cargosPermitidos as $cargo) {
            if (
                str_contains($perfilNome, $cargo) ||
                str_contains($perfilSlug, $cargo) ||
                str_contains($role, $cargo)
            ) {
                $autorizado = true;
                break;
            }
        }

        if (!$autorizado) {
            abort(403, 'Acesso restrito ao gestor financeiro ou administrador da conta.');
        }
    }

    public function minhaAssinatura(Request $request): JsonResponse
    {
        $this->autorizarFinanceiro($request);
        $tenantId = $request->user()->tenant_id;

        $assinatura = Assinatura::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->with('plano')
            ->first();

        if (!$assinatura) {
            return response()->json(['error' => 'Nenhuma assinatura localizada para este tenant.'], 404);
        }

        // Recupera a fatura atual em aberto para exibir o botão "Pagar Agora"
        $faturaAberta = FaturaBilling::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['PENDING', 'OVERDUE'])
            ->orderBy('data_vencimento')
            ->first();

        return response()->json([
            'data' => [
                'assinatura' => $assinatura,
                'fatura_aberta' => $faturaAberta ? [
                    'id' => $faturaAberta->id,
                    'valor' => (float) $faturaAberta->valor,
                    'vencimento' => $faturaAberta->data_vencimento,
                    'status' => $faturaAberta->status,
                    'link_pagamento' => $faturaAberta->url_fatura_gateway,
                ] : null,
                'metricas_uso' => [
                    'storage_utilizado_gb' => round(($assinatura->storage_utilizado_bytes ?? 0) / 1073741824, 2),
                    'storage_limite_gb' => round(($assinatura->plano->cota_storage_bytes ?? 0) / 1073741824, 2),
                ]
            ]
        ]);
    }

    public function historicoFaturas(Request $request): JsonResponse
    {
        $this->autorizarFinanceiro($request);

        $faturas = FaturaBilling::withoutGlobalScopes()
            ->where('tenant_id', $request->user()->tenant_id)
            ->orderByDesc('data_vencimento')
            ->paginate(12);

        return response()->json($faturas);
    }
}
