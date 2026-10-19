<?php

namespace Database\Seeders;

use App\Models\Plano;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MasterOwnerSeeder extends Seeder
{
    public function run(): void
    {
        $planos = [
            [
                'nome' => 'MEI / Básico',
                'slug' => 'mei',
                'valor_mensal' => 49.90,
                'limite_usuarios' => 2,
                'limite_empresas' => 1,
                'cota_storage_bytes' => 3221225472,
                'modulos_habilitados' => ['os', 'pdv', 'vendas', 'financeiro', 'pessoas', 'itens'],
            ],
            [
                'nome' => 'Plano Pro (PMEs)',
                'slug' => 'pro',
                'valor_mensal' => 199.00,
                'limite_usuarios' => 10,
                'limite_empresas' => 2,
                'cota_storage_bytes' => 21474836480,
                'modulos_habilitados' => ['os', 'pdv', 'vendas', 'compras', 'wms', 'financeiro', 'fiscal', 'frota', 'rh', 'crm', 'ged', 'pessoas', 'itens'],
            ],
            [
                'nome' => 'Enterprise B2B',
                'slug' => 'enterprise',
                'valor_mensal' => 599.00,
                'limite_usuarios' => 100,
                'limite_empresas' => 10,
                'cota_storage_bytes' => 107374182400,
                'modulos_habilitados' => ['*'],
            ],
        ];

        foreach ($planos as $p) {
            Plano::updateOrCreate(
                ['slug' => $p['slug']],
                array_merge($p, ['id' => Plano::where('slug', $p['slug'])->value('id') ?? (string) Str::uuid(), 'is_ativo' => true])
            );
        }

        User::withoutGlobalScopes()->updateOrCreate(
            ['email' => 'master@scalle.com.br'],
            [
                'id' => User::withoutGlobalScopes()->where('email', 'master@scalle.com.br')->value('id') ?? (string) Str::uuid(),
                'name' => 'SaaS Master Owner',
                'password' => 'ScalleMaster@2026', // Sem Hash::make() pois o Model User aplica o cast 'hashed'
                'is_ativo' => true,
                'is_master' => true,
                'tenant_id' => null,
            ]
        );
    }
}
