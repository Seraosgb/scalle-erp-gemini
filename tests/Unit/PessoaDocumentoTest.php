<?php

namespace Tests\Unit;

use App\Models\Pessoa;
use App\Models\Tenant;
use App\Services\ValidadorDocumentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class PessoaDocumentoTest extends TestCase
{
    use RefreshDatabase;

    public function test_validador_deve_identificar_cpf_e_cnpj_validos_e_invalidos(): void
    {
        // CPF/CNPJ com dígitos verificadores matematicamente válidos
        $this->assertTrue(ValidadorDocumentoService::validar('000.000.000-00') === false); // repetidos invalidos
        $this->assertTrue(ValidadorDocumentoService::validar('12345678909')); // CPF com DV matematicamente valido
        $this->assertTrue(ValidadorDocumentoService::validar('04.252.011/0001-10')); // CNPJ valido
        $this->assertFalse(ValidadorDocumentoService::validar('111.222.333-44')); // Invalido
    }

    public function test_cadastrar_pessoa_com_enderecos_no_contexto_do_tenant(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Clientes',
            'razao_social' => 'Clientes LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $pessoa = Pessoa::create([
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Fornecedor Central LTDA',
            'cpf_cnpj' => '04252011000110',
            'is_fornecedor' => true,
        ]);

        $pessoa->enderecos()->create([
            'tipo_endereco' => 'principal',
            'cep' => '26110000',
            'logradouro' => 'Avenida Principal',
            'numero' => '100',
            'bairro' => 'Centro',
            'cidade' => 'Belford Roxo',
            'uf' => 'RJ',
        ]);

        $this->assertDatabaseHas('pes_pessoas', [
            'id' => $pessoa->id,
            'tenant_id' => $tenant->id,
            'is_fornecedor' => true,
        ]);

        $this->assertDatabaseHas('pes_enderecos', [
            'pessoa_id' => $pessoa->id,
            'tenant_id' => $tenant->id,
            'cidade' => 'Belford Roxo',
        ]);
    }
}