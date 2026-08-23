<?php

namespace Tests\Unit;

use App\Models\Perfil;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_retorna_token_sanctum_valido(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant API Teste',
            'razao_social' => 'API Teste LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $perfil = Perfil::create([
            'nome' => 'Administrador',
            'slug' => 'admin',
            'is_admin' => true,
        ]);

        $user = User::create([
            'name' => 'Bruno Dev',
            'email' => 'bruno@scalle.com.br',
            'password' => Hash::make('senhaSegura123'),
            'perfil_id' => $perfil->id,
            'is_ativo' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        $this->assertNotEmpty($token);
        $this->assertTrue($user->is_ativo);
    }
}