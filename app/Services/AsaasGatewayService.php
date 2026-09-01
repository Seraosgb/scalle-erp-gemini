<?php

namespace App\Services;

use App\Models\Plano;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Exception;

class AsaasGatewayService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.asaas.base_url', 'https://sandbox.asaas.com/api/v3');
        $this->apiKey = config('services.asaas.api_key', env('ASAAS_API_KEY'));
    }

    /**
     * Cria ou recupera o Customer no Asaas para o Tenant
     */
    public function criarOuAtualizarCliente(Tenant $tenant): string
    {
        $payload = [
            'name' => $tenant->razao_social,
            'cpfCnpj' => $tenant->documento,
            'externalReference' => $tenant->id, // Chave de ligação vital para o nosso Webhook
            'notificationDisabled' => false,
        ];

        $response = Http::withHeaders(['access_token' => $this->apiKey])
            ->post("{$this->baseUrl}/customers", $payload);

        if (!$response->successful()) {
            throw new Exception('Erro ao criar cliente no Asaas: ' . $response->body());
        }

        return $response->json('id');
    }

    /**
     * Gera a assinatura híbrida: aceita todos os meios e configura o trial dinâmico
     */
    public function criarAssinatura(string $customerId, Plano $plano, int $trialSemanas = 0): array
    {
        // Regra do Trial Híbrido: Se for 0, cobra hoje. Se for > 0, joga o primeiro vencimento para frente.
        $dataVencimento = $trialSemanas > 0
            ? now()->addWeeks($trialSemanas)->toDateString()
            : now()->toDateString();

        $payload = [
            'customer' => $customerId,
            'billingType' => 'UNDEFINED', // Permite PIX, Boleto e Cartão na mesma fatura
            'value' => (float) $plano->valor_mensal,
            'nextDueDate' => $dataVencimento,
            'cycle' => 'MONTHLY',
            'description' => "Assinatura Mensal Scalle ERP - {$plano->nome}",
        ];

        $response = Http::withHeaders(['access_token' => $this->apiKey])
            ->post("{$this->baseUrl}/subscriptions", $payload);

        if (!$response->successful()) {
            throw new Exception('Erro ao gerar assinatura no Asaas: ' . $response->body());
        }

        return $response->json();
    }
}
