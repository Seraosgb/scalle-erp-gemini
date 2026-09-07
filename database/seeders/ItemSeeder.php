<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ItemSeeder extends Seeder
{
    public function run(): void
    {
        // Pega o primeiro tenant ativo ou cria um de exemplo se não existir
        $tenantId = Tenant::first()?->id ?? (string) Str::uuid();

        $itens = [
            [
                'nome' => 'Sensor de Temperatura Termistor NTC 10K',
                'codigo_sku' => 'COMP-TERM-10K',
                'codigo_barras_ean' => '7891234567890',
                'tipo_item' => 'PRODUTO',
                'preco_venda' => 45.90,
                'preco_custo' => 18.50,
                'unidade_medida' => 'UN',
                'ncm' => '90251990',
                'cfop_padrao' => '5102',
                'controla_estoque' => true,
                'estoque_minimo' => 5.0000,
                'is_ativo' => true,
            ],
            [
                'nome' => 'Fluido Refrigerante R-410A (Cilindro 11.3kg)',
                'codigo_sku' => 'FLUIDO-R410A',
                'codigo_barras_ean' => '7899876543210',
                'tipo_item' => 'PRODUTO',
                'preco_venda' => 850.00,
                'preco_custo' => 520.00,
                'unidade_medida' => 'UN',
                'ncm' => '38247800',
                'cfop_padrao' => '5102',
                'controla_estoque' => true,
                'estoque_minimo' => 2.0000,
                'is_ativo' => true,
            ],
            [
                'nome' => 'Mão de Obra de Instalação de Ar Condicionado Split',
                'codigo_sku' => 'SERV-INST-SPLIT',
                'codigo_barras_ean' => null,
                'tipo_item' => 'SERVICO',
                'preco_venda' => 350.00,
                'preco_custo' => 0.00,
                'unidade_medida' => 'SV',
                'ncm' => null,
                'cfop_padrao' => '5933',
                'controla_estoque' => false,
                'estoque_minimo' => 0.0000,
                'is_ativo' => true,
            ],
            [
                'nome' => 'Disjuntor Tripolar 50A',
                'codigo_sku' => 'IND-INS-01',
                'codigo_barras_ean' => '7891112223334',
                'tipo_item' => 'MATERIA_PRIMA',
                'preco_venda' => 120.00,
                'preco_custo' => 80.00,
                'unidade_medida' => 'UN',
                'ncm' => '85362000',
                'cfop_padrao' => '5102',
                'controla_estoque' => true,
                'estoque_minimo' => 10.0000,
                'is_ativo' => true,
            ],
        ];

        foreach ($itens as $dados) {
            Item::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo_sku' => $dados['codigo_sku'],
                ],
                array_merge($dados, [
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                ])
            );
        }
    }
}
