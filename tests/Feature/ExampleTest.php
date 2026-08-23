<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_rota_raiz_redireciona_para_app_spa(): void
    {
        $response = $this->get('/');
        $response->assertRedirect('/app/');
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
}