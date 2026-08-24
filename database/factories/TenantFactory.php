<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'nome_fantasia' => fake()->company(),
            'razao_social' => fake()->company() . ' LTDA',
            'documento' => fake()->numerify('##############'),
            'status' => 'ativo',
            'configuracoes' => [],
        ];
    }
}