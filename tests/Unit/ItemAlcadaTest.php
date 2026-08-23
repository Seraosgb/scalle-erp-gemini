<?php

namespace Tests\Unit;

use App\Models\Item;
use App\Models\Perfil;
use App\Models\Tenant;
use App\Models\User;
use App\Services\MotorAlcadaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class ItemAlcadaTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastro_de_item_com_parametros_fiscais(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Produtos',
            'razao_social' => 'Produtos LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $item = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'SKU-COMP-01',
            'nome' => 'Compressor Rotativo 12000 BTUs',
            'preco_venda' => 850.00,
            'preco_custo' => 500.00,
            'ncm' => '84143091',
            'controla_estoque' => true,
        ]);

        $this->assertDatabaseHas('pro_itens', [
            'id' => $item->id,
            'tenant_id' => $tenant->id,
            'codigo_sku' => 'SKU-COMP-01',
        ]);
    }

    public function test_desconto_acima_de_dez_por_cento_exige_aprovacao_de_alcada(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Vendas',
            'razao_social' => 'Vendas LTDA',
            'documento' => '98765432000188',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $perfilVendedor = Perfil::create([
            'nome' => 'Vendedor Balcão',
            'slug' => 'vendedor',
            'is_admin' => false,
        ]);

        $vendedor = User::create([
            'name' => 'Vendedor Teste',
            'email' => 'vendedor@scalle.com.br',
            'password' => 'senha123',
            'perfil_id' => $perfilVendedor->id,
        ]);

        $pedidoId = (string) Str::uuid();

        // 1. Desconto permitido (5%)
        $resultado5 = MotorAlcadaService::validarDesconto($vendedor, 'pedidos', $pedidoId, 5.00, 50.00);
        $this->assertFalse($resultado5['requer_aprovacao']);

        // 2. Desconto bloqueado (15%)
        $resultado15 = MotorAlcadaService::validarDesconto($vendedor, 'pedidos', $pedidoId, 15.00, 150.00);
        $this->assertTrue($resultado15['requer_aprovacao']);
        $this->assertDatabaseHas('sis_alcadas_aprovacoes', [
            'id' => $resultado15['solicitacao_id'],
            'status' => 'PENDENTE',
            'percentual_solicitado' => 15.00,
        ]);
    }
}