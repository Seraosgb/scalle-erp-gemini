<?php

namespace Tests\Unit;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Item;
use App\Models\Tenant;
use App\Services\EstoqueService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class EstoqueWmsTest extends TestCase
{
    use RefreshDatabase;

    public function test_movimentacao_de_entrada_e_saida_com_atualizacao_de_kardex(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Estoque',
            'razao_social' => 'Estoque LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Matriz RJ',
            'razao_social' => 'Matriz RJ LTDA',
            'cnpj' => '12345678000199',
        ]);

        $deposito = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Almoxarifado Principal',
            'codigo' => 'ALMOX-01',
            'is_padrao' => true,
        ]);

        $item = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'VALV-01',
            'nome' => 'Válvula de Expansão',
            'preco_venda' => 120.00,
            'preco_custo' => 60.00,
            'controla_estoque' => true,
        ]);

        // 1. Entrada de 10 unidades
        EstoqueService::movimentar($deposito->id, $item->id, 10.0000, 'ENTRADA_COMPRA', null, 'compras', null, null, 60.00);

        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $deposito->id,
            'item_id' => $item->id,
            'quantidade_saldo' => 10.0000,
        ]);

        // 2. Saída de 3 unidades
        EstoqueService::movimentar($deposito->id, $item->id, 3.0000, 'SAIDA_VENDA', null, 'vendas', null, null, 60.00);

        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $deposito->id,
            'item_id' => $item->id,
            'quantidade_saldo' => 7.0000,
        ]);

        $this->assertDatabaseCount('wms_movimentacoes', 2);
    }

    public function test_bloqueio_de_saida_quando_saldo_for_insuficiente(): void
    {
        $this->expectException(Exception::class);

        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Teste',
            'razao_social' => 'Teste LTDA',
            'documento' => '98765432000188',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Filial SP',
            'razao_social' => 'Filial SP LTDA',
            'cnpj' => '98765432000188',
        ]);

        $deposito = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Depósito SP',
            'codigo' => 'DEP-SP',
        ]);

        $item = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'CABO-PP',
            'nome' => 'Cabo PP 3x2,5mm',
            'preco_venda' => 15.00,
            'controla_estoque' => true,
        ]);

        // Tentativa de retirar 5 unidades de um estoque zerado
        EstoqueService::movimentar($deposito->id, $item->id, 5.0000, 'SAIDA_VENDA');
    }
}