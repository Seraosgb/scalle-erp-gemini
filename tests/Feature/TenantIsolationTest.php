<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Item;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase; // Reseta o banco SQLite em memória a cada teste

    private function criarEcossistemaTenant(string $nome): array
    {
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome_fantasia' => "Tenant {$nome}",
            'razao_social' => "Razão Social {$nome}",
            'documento' => '000000000001' . rand(10, 99),
            'status' => 'ativo',
        ]);

        $empresa = Empresa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'nome_fantasia' => "Empresa {$nome}",
            'razao_social' => "Empresa {$nome} LTDA",
            'cnpj' => $tenant->documento,
            'regime_tributario' => 'simples_nacional',
            'is_matriz' => true,
        ]);

        $user = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'empresa_padrao_id' => $empresa->id,
            'name' => "Admin {$nome}",
            'email' => "admin@{$nome}.com",
            'password' => Hash::make('password'),
            'is_ativo' => true,
        ]);

        return ['tenant' => $tenant, 'empresa' => $empresa, 'user' => $user];
    }

    public function test_usuario_tenant_a_nao_consegue_ver_itens_do_tenant_b()
    {
        // 1. Prepara o Terreno
        $ecossistemaA = $this->criarEcossistemaTenant('A');
        $ecossistemaB = $this->criarEcossistemaTenant('B');

        // Cria um item exclusivo para o Tenant B
        $itemTenantB = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $ecossistemaB['tenant']->id,
            'codigo_sku' => 'SKU-TENANT-B',
            'nome' => 'Produto Secreto B',
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 100.00,
            'unidade_medida' => 'UN',
            'is_ativo' => true,
        ]);

        // 2. Ação: Loga como Usuário do Tenant A e tenta listar itens
        $response = $this->actingAs($ecossistemaA['user'])->getJson('/api/itens');

        // 3. Validação: A resposta deve ser 200 OK, mas a lista NÃO DEVE conter o Produto B
        $response->assertStatus(200);
        $response->assertJsonMissing([
            'codigo_sku' => 'SKU-TENANT-B',
            'nome' => 'Produto Secreto B',
        ]);
    }

    public function test_usuario_tenant_a_recebe_404_ao_tentar_editar_item_do_tenant_b()
    {
        // 1. Prepara o Terreno
        $ecossistemaA = $this->criarEcossistemaTenant('A');
        $ecossistemaB = $this->criarEcossistemaTenant('B');

        $itemTenantB = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $ecossistemaB['tenant']->id,
            'codigo_sku' => 'SKU-B-PROTEGIDO',
            'nome' => 'Produto Intocável',
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 50.00,
            'unidade_medida' => 'UN',
            'is_ativo' => true,
        ]);

        // 2. Ação: Loga como Usuário do Tenant A e tenta atualizar o item do Tenant B passando o ID exato
        $payloadMalicioso = [
            'nome' => 'Produto Hackeado',
            'codigo_sku' => 'SKU-HACK',
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 1.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => false,
        ];

        $response = $this->actingAs($ecossistemaA['user'])
                         ->putJson("/api/itens/{$itemTenantB->id}", $payloadMalicioso);

        // 3. Validação: O GlobalScopeTenant deve ocultar a existência do registro e retornar 404 (Not Found)
        $response->assertStatus(404);
        
        // Verifica se o item original continua intacto no banco de dados
        $this->assertDatabaseHas('pro_itens', [
            'id' => $itemTenantB->id,
            'nome' => 'Produto Intocável',
        ]);
    }
}