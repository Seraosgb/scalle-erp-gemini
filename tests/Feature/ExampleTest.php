<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_rota_raiz_e_acessivel(): void
    {
        $response = $this->get('/');
        // Aceita 200 (se carregar a view diretamente) ou 302 (se redirecionar para /app/)
        $this->assertTrue(in_array($response->getStatusCode(), [200, 302]));
    }

    public function test_health_check_retorna_status_200(): void
    {
        $response = $this->get('/health');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'OK',
                'sistema' => 'Scalle ERP',
                'versao' => '2.0.0 Enterprise'
            ]);
    }

    public function test_rota_app_spa_carrega_index(): void
    {
        $response = $this->get('/app');
        $this->assertTrue(in_array($response->getStatusCode(), [200, 301, 302]));
    }
}