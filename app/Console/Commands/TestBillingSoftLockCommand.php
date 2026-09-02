<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\BillingWebhookController;
use App\Http\Middleware\CheckSubscriptionStatus;
use App\Models\Assinatura;
use App\Models\FaturaBilling;
use App\Models\Plano;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;

class TestBillingSoftLockCommand extends Command
{
    protected $signature = 'scalle:test-softlock';
    protected $description = 'Valida o ciclo de inadimplência, Soft-Lock e bloqueio de mutações no ERP';

    public function handle(): int
    {
        $this->info("🚀 Iniciando Teste de Resiliência e Soft-Lock (Padrão Gemini)...");

        $tenantId = (string) Str::uuid();
        $planoId = (string) Str::uuid();
        $paymentFakeId = 'pay_' . Str::random(10);

        // --- ETAPA 1: SETUP DO TENANT E ASSINATURA ---
        $this->line("1️⃣ Criando Tenant e Assinatura ativa...");

        $plano = Plano::create([
            'id' => $planoId,
            'nome' => 'Plano Teste SoftLock',
            'slug' => 'softlock-test-' . Str::random(4),
            'valor_mensal' => 199.00,
            'limite_usuarios' => 5,
            'cota_storage_bytes' => 1024,
            'is_ativo' => true,
        ]);

        $tenant = Tenant::create([
            'id' => $tenantId,
            'nome_fantasia' => 'SoftLock Test Enterprise',
            'razao_social' => 'SoftLock Test Enterprise LTDA',
            'documento' => '35544341000102',
            'status' => 'ativo',
        ]);

        $assinatura = Assinatura::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'plano_id' => $planoId,
            'status' => 'ATIVO',
            'data_inicio' => now()->subMonth()->toDateString(),
            'data_proximo_vencimento' => now()->subDays(5)->toDateString(),
            'storage_utilizado_bytes' => 0,
        ]);

        $usuario = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'name' => 'Usuario Teste Inadimplente',
            'email' => 'teste.' . Str::random(5) . '@softlock.com',
            'password' => 'secret123',
            'is_ativo' => true,
            'is_master' => false,
        ]);

        try {
            // --- ETAPA 2: DISPARO DO EVENTO DE INADIMPLÊNCIA (PAYMENT_OVERDUE) ---
            $this->line("2️⃣ Simulando Webhook PAYMENT_OVERDUE do Asaas...");

            $webhookPayloadOverdue = [
                'event' => 'PAYMENT_OVERDUE',
                'payment' => [
                    'id' => $paymentFakeId,
                    'customer' => 'cus_test_softlock',
                    'externalReference' => $tenantId,
                    'value' => 199.00,
                    'billingType' => 'BOLETO',
                    'status' => 'OVERDUE',
                    'dueDate' => now()->subDays(5)->toDateString(),
                    'invoiceUrl' => "https://sandbox.asaas.com/i/{$paymentFakeId}",
                ]
            ];

            $requestOverdue = Request::create('/api/billing/asaas-webhook', 'POST', $webhookPayloadOverdue);
            $requestOverdue->headers->set('asaas-access-token', config('services.asaas.webhook_token', env('ASAAS_WEBHOOK_TOKEN')));

            $webhookController = app(BillingWebhookController::class);
            $webhookController->handleAsaas($requestOverdue);

            $assinaturaAtualizada = Assinatura::withoutGlobalScopes()->find($assinatura->id);

            if ($assinaturaAtualizada->status === 'SOFT_LOCK') {
                $this->info("✔ Assinatura colocada em SOFT_LOCK com sucesso!");
            } else {
                $this->error("❌ Falha: Assinatura não transitou para SOFT_LOCK.");
            }

            // --- ETAPA 3: TESTAR BLOQUEIO DE MUTAÇÃO VIA MIDDLEWARE ---
            $this->line("3️⃣ Testando bloqueio de mutação (POST /api/pessoas) no modo Soft-Lock...");

            App::instance('current_tenant_id', $tenantId);

            // Simula requisição POST bloqueada
            $requestMutacao = Request::create('/api/pessoas', 'POST', ['nome_razao_social' => 'Novo Cliente Tentativa']);
            $requestMutacao->setUserResolver(fn() => $usuario);

            $middleware = new CheckSubscriptionStatus();
            $respostaMiddleware = $middleware->handle($requestMutacao, fn() => response()->json(['data' => ['created' => true]], 201));

            if ($respostaMiddleware->getStatusCode() === 402) {
                $this->info("✔ Bloqueio Confirmado: Middleware barrou a requisição com 402 Payment Required!");
            } else {
                $this->error("❌ Falha de Segurança: Requisição de mutação passou no modo Soft-Lock.");
            }

            // Simula requisição GET permitida (Read-Only)
            $requestLeitura = Request::create('/api/pessoas', 'GET');
            $requestLeitura->setUserResolver(fn() => $usuario);

            $respostaLeitura = $middleware->handle($requestLeitura, fn() => response()->json(['data' => []], 200));

            if ($respostaLeitura->getStatusCode() === 200) {
                $this->info("✔ Read-Only Confirmado: Requisição de consulta (GET) liberada normalmente!");
            } else {
                $this->error("❌ Falha: Consulta foi indevidamente bloqueada no Soft-Lock.");
            }

            // --- ETAPA 4: SIMULAR PAGAMENTO E LIBERAÇÃO AUTOMÁTICA ---
            $this->line("4️⃣ Simulando Webhook PAYMENT_RECEIVED (Regularização da dívida)...");

            $webhookPayloadReceived = [
                'event' => 'PAYMENT_RECEIVED',
                'payment' => [
                    'id' => $paymentFakeId,
                    'customer' => 'cus_test_softlock',
                    'externalReference' => $tenantId,
                    'value' => 199.00,
                    'billingType' => 'PIX',
                    'status' => 'RECEIVED',
                    'dueDate' => now()->subDays(5)->toDateString(),
                    'paymentDate' => now()->toDateString(),
                    'invoiceUrl' => "https://sandbox.asaas.com/i/{$paymentFakeId}",
                ]
            ];

            $requestReceived = Request::create('/api/billing/asaas-webhook', 'POST', $webhookPayloadReceived);
            $requestReceived->headers->set('asaas-access-token', config('services.asaas.webhook_token', env('ASAAS_WEBHOOK_TOKEN')));

            $webhookController->handleAsaas($requestReceived);

            $assinaturaRegularizada = Assinatura::withoutGlobalScopes()->find($assinatura->id);
            $respostaMutacaoPosPagamento = $middleware->handle($requestMutacao, fn() => response()->json(['data' => ['created' => true]], 201));

            if ($assinaturaRegularizada->status === 'ATIVO' && $respostaMutacaoPosPagamento->getStatusCode() === 201) {
                $this->info("🏆 SUCESSO TOTAL! Conta reativada automaticamente e mutações liberadas!");
            } else {
                $this->error("❌ Falha na reativação da conta após confirmação de pagamento.");
            }

        } catch (\Exception $e) {
            $this->error("❌ Erro Crítico durante o teste de Soft-Lock: " . $e->getMessage());
        } finally {
            // --- ETAPA 5: LIMPEZA ---
            $this->line("🧹 Limpando dados de teste do banco...");
            FaturaBilling::withoutGlobalScopes()->where('tenant_id', $tenantId)->forceDelete();
            $usuario->forceDelete();
            $assinatura->forceDelete();
            $tenant->forceDelete();
            $plano->forceDelete();
            $this->info("✔ Ambiente limpo.");
        }

        return Command::SUCCESS;
    }
}
