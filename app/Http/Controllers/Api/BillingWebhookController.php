<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\FaturaBilling;
use App\Models\Tenant;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BillingWebhookController extends Controller
{
    public function handleAsaas(Request $request): JsonResponse
    {
        // 1. Validação do Token de Segurança do Webhook (configurado no painel do Asaas)
        $tokenEsperado = config('services.asaas.webhook_token', env('ASAAS_WEBHOOK_TOKEN'));
        $tokenEnviado = $request->header('asaas-access-token');

        if (!empty($tokenEsperado) && $tokenEnviado !== $tokenEsperado) {
            return response()->json(['error' => 'Acesso não autorizado ao webhook'], 401);
        }

        $evento = $request->input('event');
        $payment = $request->input('payment');

        if (empty($payment) || empty($payment['id'])) {
            return response()->json(['message' => 'Payload ignorado (sem identificador de pagamento)'], 200);
        }

        $paymentId = $payment['id'];
        $valor = (float) ($payment['value'] ?? 0.00);
        $statusGateway = $payment['status'] ?? 'UNKNOWN';

        Log::info("[Asaas Webhook] Evento: {$evento} para Payment ID: {$paymentId}");

        try {
            DB::transaction(function () use ($evento, $payment, $paymentId, $valor, $statusGateway, $request) {
                // Identifica se a fatura já existe ou cria o registro
                $fatura = FaturaBilling::withoutGlobalScopes()->where('gateway_payment_id', $paymentId)->first();

                // Busca o tenant pelo externalReference (enviado na criação da cobrança) ou pelo customer
                $tenantId = $payment['externalReference'] ?? null;
                if (!$fatura && !empty($tenantId)) {
                    $assinatura = Assinatura::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
                    $fatura = FaturaBilling::create([
                        'tenant_id' => $tenantId,
                        'assinatura_id' => $assinatura?->id,
                        'gateway_payment_id' => $paymentId,
                        'status' => 'PENDING',
                        'valor' => $valor,
                        'forma_pagamento' => $payment['billingType'] ?? 'PIX',
                        'data_vencimento' => $payment['dueDate'] ?? now()->toDateString(),
                        'url_fatura_gateway' => $payment['invoiceUrl'] ?? null,
                    ]);
                }

                if (!$fatura) {
                    return;
                }

                $fatura->update([
                    'payload_webhook' => $request->all(),
                ]);

                // Eventos de Confirmação de Pagamento
                if (in_array($evento, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])) {
                    $fatura->update([
                        'status' => 'RECEIVED',
                        'data_pagamento' => Carbon::parse($payment['paymentDate'] ?? now()),
                    ]);

                    // Renova a vigência da assinatura e ativa o Tenant
                    $assinatura = Assinatura::withoutGlobalScopes()->where('tenant_id', $fatura->tenant_id)->first();
                    if ($assinatura) {
                        $novoVencimento = Carbon::parse($assinatura->data_proximo_vencimento ?? now())->addMonth();
                        if ($novoVencimento->isPast()) {
                            $novoVencimento = now()->addMonth();
                        }

                        $assinatura->update([
                            'status' => 'ATIVO',
                            'data_proximo_vencimento' => $novoVencimento->toDateString(),
                        ]);
                    }

                    // Remove o bloqueio (soft_lock) do Tenant
                    $tenant = Tenant::withoutGlobalScopes()->find($fatura->tenant_id);
                    if ($tenant && in_array(strtolower($tenant->status), ['suspenso', 'soft_lock', 'soft-lock', 'inadimplente'])) {
                        $tenant->update(['status' => 'ativo']);
                    }
                }

                // Evento de Fatura Vencida
                if ($evento === 'PAYMENT_OVERDUE') {
                    $fatura->update(['status' => 'OVERDUE']);
                    
                    $assinatura = Assinatura::withoutGlobalScopes()->where('tenant_id', $fatura->tenant_id)->first();
                    if ($assinatura) {
                        $assinatura->update(['status' => 'SOFT_LOCK']);
                    }
                }
            });

            return response()->json(['data' => ['success' => true, 'message' => 'Webhook processado com sucesso']]);
        } catch (Exception $e) {
            Log::error("[Asaas Webhook Error] " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}