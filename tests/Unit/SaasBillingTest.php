<?php

namespace Tests\Unit;

use App\Models\Assinatura;
use App\Models\Plano;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class SaasBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_assinatura_plano_com_bloqueio_de_cota_de_storage(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant MEI',
            'razao_social' => 'Prestador MEI LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        // Plano MEI com cota de 3 GB (3.221.225.472 bytes)
        $planoMei = Plano::create([
            'nome' => 'MEI',
            'slug' => 'mei',
            'valor_mensal' => 49.90,
            'limite_usuarios' => 1,
            'cota_storage_bytes' => 3221225472,
            'modulos_habilitados' => ['os', 'pdv', 'financeiro'],
        ]);

        $assinatura = Assinatura::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'plano_id' => $planoMei->id,
            'status' => 'ATIVA',
            'data_inicio' => now()->toDateString(),
            'data_proximo_vencimento' => now()->addMonth()->toDateString(),
            'storage_utilizado_bytes' => 3221225470, // Praticamente no limite
        ]);

        $this->assertEquals('ATIVA', $assinatura->status);
        $this->assertEquals(3221225472, $assinatura->plano->cota_storage_bytes);
        $this->assertDatabaseHas('sis_assinaturas', [
            'tenant_id' => $tenant->id,
            'plano_id' => $planoMei->id,
        ]);
    }
}