<?php

namespace Database\Seeders;

use App\Models\Plano;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MasterOwnerSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Provisionar Planos Padrão
        $planos = [
            ['nome' => 'MEI / Básico', 'slug' => 'mei', 'valor_mensal' => 49.90, 'limite_usuarios' => 2, 'limite_empresas' => 1, 'cota_storage_bytes' => 3221225472], // 3 GB
            ['nome' => 'Plano Pro (PMEs)', 'slug' => 'pro', 'valor_mensal' => 199.00, 'limite_usuarios' => 10, 'limite_empresas' => 2, 'cota_storage_bytes' => 21474836480], // 20 GB
            ['nome' => 'Enterprise B2B', 'slug' => 'enterprise', 'valor_mensal' => 599.00, 'limite_usuarios' => 100, 'limite_empresas' => 10, 'cota_storage_bytes' => 107374182400], // 100 GB
        ];

        foreach ($planos as $p) {
            Plano::firstOrCreate(['slug' => $p['slug']], array_merge($p, ['id' => (string) Str::uuid(), 'is_ativo' => true]));
        }

        // 2. Criar ou Atualizar Usuário Master
        User::updateOrCreate(
            ['email' => 'master@scalle.com.br'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'SaaS Master Owner',
                'password' => Hash::make('ScalleMaster@2026'),
                'is_ativo' => true,
                'is_master' => true,
                'tenant_id' => null,
            ]
        );
    }
}