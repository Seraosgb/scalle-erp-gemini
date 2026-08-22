<?php

namespace Tests\Unit;

use App\Models\Perfil;
use App\Models\Permissao;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class UserPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_com_perfil_admin_possui_todas_as_permissoes(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Teste',
            'razao_social' => 'Tenant Teste LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $perfilAdmin = Perfil::create([
            'nome' => 'Administrador Geral',
            'slug' => 'admin',
            'is_admin' => true,
        ]);

        $user = User::create([
            'name' => 'Bruno Gestor',
            'email' => 'gestor@scalle.com.br',
            'password' => 'senha123',
            'perfil_id' => $perfilAdmin->id,
        ]);

        $this->assertTrue($user->hasPermission('financeiro.pagar.excluir'));
    }

    public function test_usuario_comum_bloqueado_sem_permissao_especifica(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Teste 2',
            'razao_social' => 'Tenant Teste 2 LTDA',
            'documento' => '98765432000188',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $perfilOperador = Perfil::create([
            'nome' => 'Operador Comercial',
            'slug' => 'operador',
            'is_admin' => false,
        ]);

        $permissaoVender = Permissao::create([
            'modulo' => 'vendas',
            'slug' => 'vendas.pedidos.criar',
            'nome' => 'Criar Pedidos',
        ]);

        $perfilOperador->permissoes()->attach($permissaoVender->id);

        $user = User::create([
            'name' => 'Operador Balcao',
            'email' => 'operador@scalle.com.br',
            'password' => 'senha123',
            'perfil_id' => $perfilOperador->id,
        ]);

        $this->assertTrue($user->hasPermission('vendas.pedidos.criar'));
        $this->assertFalse($user->hasPermission('financeiro.pagar.excluir'));
    }
}