<?php

namespace Tests\Unit;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Item;
use App\Models\Pessoa;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EstoqueService;
use App\Services\VendaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class VendaPdvTest extends TestCase
{
    use RefreshDatabase;

    public function test_faturamento_de_venda_com_baixa_de_estoque_e_pagamento(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Vendas',
            'razao_social' => 'Vendas LTDA',
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
            'nome' => 'Depósito Loja',
            'codigo' => 'DEP-LOJA',
        ]);

        $cliente = Pessoa::create([
            'tipo_pessoa' => 'PF',
            'nome_razao_social' => 'Consumidor Final',
            'cpf_cnpj' => '12345678909',
            'is_cliente' => true,
        ]);

        $vendedor = User::create([
            'name' => 'Vendedor Loja',
            'email' => 'loja@scalle.com.br',
            'password' => 'senha123',
        ]);

        $item = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'MOTOR-12V',
            'nome' => 'Motor DC 12V 500RPM',
            'preco_venda' => 100.00,
            'preco_custo' => 50.00,
            'controla_estoque' => true,
        ]);

        // 1. Injetar estoque inicial de 5 unidades
        EstoqueService::movimentar($deposito->id, $item->id, 5.0000, 'ENTRADA_COMPRA');

        // 2. Faturar venda de 2 unidades
        $pedido = VendaService::faturarVenda(
            $empresa->id,
            $cliente->id,
            $deposito->id,
            $vendedor,
            [
                [
                    'item_id' => $item->id,
                    'quantidade' => 2.0000,
                    'preco_unitario' => 100.00,
                ]
            ],
            [
                [
                    'forma_pagamento' => 'PIX',
                    'valor_pago' => 200.00,
                ]
            ],
            0.00,
            'PDV'
        );

        $this->assertDatabaseHas('ven_pedidos', [
            'id' => $pedido->id,
            'status' => 'FATURADO',
            'valor_total_liquido' => 200.00,
        ]);

        // Estoque deve cair de 5 para 3
        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $deposito->id,
            'item_id' => $item->id,
            'quantidade_saldo' => 3.0000,
        ]);
    }
}