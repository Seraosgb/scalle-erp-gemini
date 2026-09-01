<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\BillingWebhookController;
use App\Models\Assinatura;
use App\Models\FaturaBilling;
use App\Models\Plano;
use App\Models\Tenant;
use App\Services\AsaasGatewayService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TestAsaasBillingCommand extends Command
{
    protected $signature = 'scalle:test-billing';
    protected $description = 'Executa o ciclo completo (Ida e Volta) do Billing SaaS no Sandbox do Asaas com CNPJ de teste';

    public function handle(AsaasGatewayService $asaasService): int
    {
        $this->info("🚀 Iniciando Teste Completo de Billing (Padrão Gemini)...");

        $tenantId = (string) Str::uuid();
        $planoId = (string) Str::uuid();
        $cnpjTeste = '35544341000102'; // 35.544.341/0001-02 limpo para envio à API

        // --- ETAPA 1: SETUP TEMPORÁRIO ---
        $this->line("1️⃣ Criando dados de teste no banco...");

        $plano = Plano::create([
            'id' => $planoId,
            'nome' => 'Plano Teste Sandbox',
            'slug' => 'sandbox-test-' . Str::random(4),
            'valor_mensal' => 99.90,
            'limite_usuarios' => 5,
            'cota_storage_bytes' => 1024,
            'is_ativo' => true,
        ]);

        $tenant = Tenant::create([
            'id' => $tenantId,
            'nome_fantasia' => 'Empresa Teste Sandbox',
            'razao_social' => 'Empresa Teste Sandbox LTDA',
            'documento' => $cnpjTeste,
            'status' => 'ativo',
        ]);

        $assinatura = Assinatura::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'plano_id' => $planoId,
            'status' => 'TRIAL',
            'data_inicio' => now()->toDateString(),
            'data_proximo_vencimento' => now()->toDateString(),
            'storage_utilizado_bytes' => 0,
        ]);

        try {
            // --- ETAPA 2: A "IDA" (Criação no Asaas) ---
            $this->line("2️⃣ Enviando Customer para o Asaas...");
            $customerId = $asaasService->criarOuAtualizarCliente($tenant);
            $this->info("✔ Customer criado com Sucesso! ID: {$customerId}");

            $this->line("3️⃣ Gerando Assinatura Híbrida no Asaas...");
            $assinaturaAsaas = $asaasService->criarAssinatura($customerId, $plano, 0);
            $subscriptionId = $assinaturaAsaas['id'];
            $this->info("✔ Assinatura criada! ID: {$subscriptionId}");

            // --- ETAPA 3: A "VOLTA" (Simulação do Webhook) ---
            $this->line("4️⃣ Simulando recebimento de Webhook (PAYMENT_RECEIVED)...");

            $paymentFakeId = 'pay_' . Str::random(10);
            $webhookPayload = [
                'event' => 'PAYMENT_RECEIVED',
                'payment' => [
                    'id' => $paymentFakeId,
                    'customer' => $customerId,
                    'externalReference' => $tenantId,
                    'value' => 99.90,
                    'netValue' => 98.90,
                    'billingType' => 'PIX',
                    'status' => 'RECEIVED',
                    'dueDate' => now()->toDateString(),
                    'paymentDate' => now()->toDateString(),
                    'invoiceUrl' => "https://sandbox.asaas.com/i/{$paymentFakeId}",
                ]
            ];

            $request = Request::create('/api/billing/asaas-webhook', 'POST', $webhookPayload);
            $request->headers->set('asaas-access-token', config('services.asaas.webhook_token', env('ASAAS_WEBHOOK_TOKEN')));

            $webhookController = app(BillingWebhookController::class);
            $response = $webhookController->handleAsaas($request);

            if ($response->getStatusCode() === 200) {
                $this->info("✔ Webhook processado com Sucesso!");
            } else {
                $this->error("❌ Falha no Webhook: " . $response->getContent());
            }

            // --- ETAPA 4: VERIFICAÇÃO FINAL ---
            $this->line("5️⃣ Auditando resultados no Banco de Dados...");
            $fatura = FaturaBilling::withoutGlobalScopes()->where('gateway_payment_id', $paymentFakeId)->first();
            $assinaturaAtualizada = Assinatura::withoutGlobalScopes()->find($assinatura->id);

            if ($fatura && $fatura->status === 'RECEIVED' && $assinaturaAtualizada->status === 'ATIVO') {
                $this->info("🏆 SUCESSO TOTAL! Fatura baixada e Assinatura ativada pelo Webhook!");
            } else {
                $this->error("❌ Alguma etapa falhou na persistência de dados.");
            }

        } catch (\Exception $e) {
            $this->error("❌ Erro Crítico durante o teste: " . $e->getMessage());
        } finally {
            // --- ETAPA 5: CLEANUP ---
            $this->line("🧹 Limpando dados de teste do banco...");
            FaturaBilling::withoutGlobalScopes()->where('tenant_id', $tenantId)->forceDelete();
            $assinatura->forceDelete();
            $tenant->forceDelete();
            $plano->forceDelete();
            $this->info("✔ Ambiente limpo.");
        }

        return Command::SUCCESS;
    }
}
