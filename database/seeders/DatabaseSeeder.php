<?php

namespace Database\Seeders;

use App\Models\Perfil;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Criação do Tenant Principal (coluna correta: 'documento')
        $tenant = Tenant::firstOrCreate(
            ['documento' => '00.000.000/0001-91'],
            [
                'id' => (string) Str::uuid(),
                'razao_social' => 'Scalle Enterprise Matriz',
                'nome_fantasia' => 'Scalle Matriz',
                'status' => 'ativo',
            ]
        );

        // 2. Perfil de Acesso Administrador
        $adminPerfil = Perfil::firstOrCreate(
            ['tenant_id' => $tenant->id, 'nome' => 'ADMINISTRADOR'],
            [
                'id' => (string) Str::uuid(),
                'slug' => 'administrador',
                'descricao' => 'Acesso total administrativo',
                'is_admin' => true,
                'is_sistema' => true,
            ]
        );

        // 3. Usuário Administrador Master (SaaS Owner)
        User::firstOrCreate(
            ['email' => 'admin@scalle.com.br'],
            [
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'perfil_id' => $adminPerfil->id,
                'name' => 'Administrador Scalle',
                'password' => Hash::make('Scalle@2026'),
                'is_ativo' => true,
                'is_master' => false,
            ]
        );

        // 4. Executa seeders complementares
        $this->call([
            ItemSeeder::class,
        ]);
    }
}
