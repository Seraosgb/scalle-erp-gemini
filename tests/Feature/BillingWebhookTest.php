<?php

namespace Tests\Feature;

use App\Models\Assinatura;
use App\Models\Plano;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BillingWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_asaas_confirma_pagamento_e_reativa_tenant()
    {
        // 1. Força a configuração de um token válido apenas para o ambiente de testes
        $tokenTeste = 'token_secreto_asaas_123';
        config(['services.asaas.webhook_token' => $tokenTeste]);

        $plano = Plano::create([
            'id' => (string) Str::uuid(),
            'nome' => 'Plano Pro',
            'slug' => 'pro',
            'valor_mensal' => 199.00,
            'limite_usuarios' => 10,
            'limite_empresas' => 2,
            'cota_storage_bytes' => 21474836480,
            'is_ativo' => true,
        ]);

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome_fantasia' => 'Empresa Teste',
            'razao_social' => 'Empresa Teste LTDA',
            'documento' => '12345678000199',
            'status' => 'soft_lock', // Bloqueado por falta de pagamento
        ]);

        $assinatura = Assinatura::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'plano_id' => $plano->id,
            'status' => 'SOFT_LOCK',
            'data_inicio' => now()->subMonth(),
            'data_proximo_vencimento' => now()->subDays(5),
        ]);

        $payloadAsaas = [
            'event' => 'PAYMENT_RECEIVED',
            'payment' => [
                'id' => 'pay_test_998877',
                'externalReference' => $tenant->id,
                'value' => 199.00,
                'status' => 'RECEIVED',
                'billingType' => 'PIX',
                'paymentDate' => now()->toDateString(),
            ]
        ];

        // 2. Dispara a requisição enviando o HEADER de segurança que o Controller exige
        $response = $this->withHeaders([
            'asaas-access-token' => $tokenTeste,
        ])->postJson('/api/billing/webhook/asaas', $payloadAsaas);

        // 3. Validações
        $response->assertStatus(200);

        // Valida se o Tenant voltou a ficar Ativo e se a Assinatura foi prorrogada
        $this->assertDatabaseHas('sis_tenants', [
            'id' => $tenant->id,
            'status' => 'ativo',
        ]);

        $this->assertDatabaseHas('sis_assinaturas', [
            'id' => $assinatura->id,
            'status' => 'ATIVO',
        ]);
    }
}