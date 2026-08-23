<?php

namespace Tests\Unit;

use App\Models\Colaborador;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\Tenant;
use App\Services\PontoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class PontoRhTest extends TestCase
{
    use RefreshDatabase;

    public function test_registro_de_ponto_georreferenciado_com_hash_sha256(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant RH Teste',
            'razao_social' => 'RH Teste LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Sede Rio',
            'razao_social' => 'Sede Rio LTDA',
            'cnpj' => '12345678000199',
        ]);

        $pessoa = Pessoa::create([
            'tipo_pessoa' => 'PF',
            'nome_razao_social' => 'Marcio Silva',
            'cpf_cnpj' => '12345678909',
        ]);

        $colaborador = Colaborador::create([
            'id' => (string) Str::uuid(),
            'empresa_id' => $empresa->id,
            'pessoa_id' => $pessoa->id,
            'matricula' => 'FUNC-001',
            'cargo' => 'Técnico de Refrigeração',
            'departamento' => 'Operações / Campo',
            'data_admissao' => now()->subMonths(6)->toDateString(),
            'salario_base' => 3500.00,
        ]);

        $ponto = PontoService::registrarPonto(
            $colaborador,
            'ENTRADA',
            -22.753300,
            -43.398800,
            '189.120.45.10',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'
        );

        $this->assertEquals(64, strlen($ponto->hash_registro));
        $this->assertEquals('ENTRADA', $ponto->tipo_registro);

        $this->assertDatabaseHas('rh_pontos', [
            'id' => $ponto->id,
            'colaborador_id' => $colaborador->id,
            'tipo_registro' => 'ENTRADA',
        ]);
    }
}