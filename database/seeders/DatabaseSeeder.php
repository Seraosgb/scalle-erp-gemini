<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tenant;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Criação do Tenant Principal
        $tenant = Tenant::firstOrCreate(
            ['documento_federal' => '00.000.000/0001-91'],
            [
                'id' => (string) Str::uuid(),
                'razao_social' => 'Scalle Enterprise Matriz',
                'nome_fantasia' => 'Scalle Matriz',
                'regime_tributario' => 'LUCRO_PRESUMIDO',
                'plano_assinatura' => 'ENTERPRISE',
                'is_ativo' => true,
            ]
        );

        // 2. Perfil de Acesso Administrador Total
        $adminRole = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'nome_regra' => 'ADMIN'],
            [
                'id' => (string) Str::uuid(),
                'descricao' => 'Administrador Geral do Sistema com Acesso Irrestrito',
                'permissoes' => ['*'],
            ]
        );

        // 3. Usuário Administrador Master
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@scalle.com.br'],
            [
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'name' => 'Administrador Scalle',
                'password' => Hash::make('Scalle@2026'),
                'is_ativo' => true,
            ]
        );

        // Vincula a role ao usuário se existir relação
        if (method_exists($adminUser, 'roles')) {
            $adminUser->roles()->syncWithoutDetaching([$adminRole->id]);
        }
    }
}