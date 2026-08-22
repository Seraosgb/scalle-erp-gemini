<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_a_nao_pode_ler_empresas_do_tenant_b(): void
    {
        // 1. Criar Tenant A e Tenant B
        $tenantA = Tenant::create([
            'nome_fantasia' => 'Empresa Alfa',
            'razao_social' => 'Alfa LTDA',
            'documento' => '11111111000111',
        ]);

        $tenantB = Tenant::create([
            'nome_fantasia' => 'Empresa Beta',
            'razao_social' => 'Beta LTDA',
            'documento' => '22222222000122',
        ]);

        // 2. Criar empresa no contexto do Tenant B
        App::instance('current_tenant_id', $tenantB->id);
        Empresa::create([
            'nome_fantasia' => 'Filial Beta 1',
            'razao_social' => 'Beta Filial LTDA',
            'cnpj' => '22222222000200',
        ]);

        // 3. Trocar o contexto ativo para o Tenant A
        App::instance('current_tenant_id', $tenantA->id);

        // 4. Asserção: Tenant A deve listar 0 empresas
        $empresasVisiveisParaA = Empresa::all();

        $this->assertCount(0, $empresasVisiveisParaA);
    }
}