<?php

namespace Tests\Feature;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Item;
use App\Models\OrdemServico;
use App\Models\Pessoa;
use App\Models\Tenant;
use App\Models\TituloFinanceiro;
use App\Models\User;
use App\Services\EstoqueService;
use App\Services\OrdemServicoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrdemServicoIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_ciclo_completo_cmms_com_baixa_wms_assinatura_e_faturamento(): void
    {
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome_fantasia' => 'Tenant CMMS Teste',
            'razao_social' => 'Tenant CMMS Teste LTDA',
            'documento' => '12345678000100',
            'status' => 'ativo',
        ]);
        app()->instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'nome_fantasia' => 'Matriz',
            'razao_social' => 'Matriz LTDA',
            'cnpj' => '12345678000100',
            'regime_tributario' => 'simples_nacional',
            'is_matriz' => true,
        ]);

        $tecnico = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'empresa_padrao_id' => $empresa->id,
            'name' => 'Técnico Especialista',
            'email' => 'tecnico@scalle.com',
            'password' => '123456',
            'is_ativo' => true,
        ]);

        $cliente = Pessoa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Cliente Corporativo',
            'cpf_cnpj' => '98765432000199',
            'is_cliente' => true,
            'is_ativo' => true,
        ]);

        $deposito = Deposito::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'empresa_id' => $empresa->id,
            'nome' => 'Almoxarifado Peças',
            'codigo' => 'ALMOX-01',
            'is_padrao' => true,
            'is_ativo' => true,
        ]);

        $peca = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'nome' => 'Válvula de Expansão',
            'codigo_sku' => 'VALV-EXP',
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 150.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
            'is_ativo' => true,
        ]);

        EstoqueService::movimentar($deposito->id, $peca->id, 10.0, 'ENTRADA_COMPRA', $tecnico->id, 'teste', null, null, 80.00);

        // 1. Abertura da OS
        $os = OrdemServico::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'empresa_id' => $empresa->id,
            'cliente_id' => $cliente->id,
            'tecnico_responsavel_id' => $tecnico->id,
            'deposito_saida_id' => $deposito->id,
            'numero_os' => 1001,
            'status' => 'ABERTA',
            'prioridade' => 'ALTA',
            'tipo_manutencao' => 'CORRETIVA',
            'equipamento_descricao' => 'Chiller 100TR',
            'defeito_reclamado' => 'Baixa pressão de sucção',
            'data_abertura' => now(),
        ]);

        // 2. Conclusão da OS com Peças e Assinatura MP 2.200-2
        $itensUtilizados = [
            ['item_id' => $peca->id, 'tipo_item' => 'PRODUTO', 'quantidade' => 2.0, 'valor_unitario' => 150.00],
        ];

        $osConcluida = OrdemServicoService::concluirOrdemServico(
            $os,
            $itensUtilizados,
            'Substituição de válvula e teste de estanqueidade realizado.',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'Carlos Alberto Gerente',
            '123.456.789-00',
            $tecnico,
            -22.7654,
            -43.3987,
            '189.100.20.5'
        );

        // 3. Validações de Sucesso
        $this->assertEquals('CONCLUIDA', $osConcluida->status);
        $this->assertEquals(300.00, $osConcluida->valor_total);
        $this->assertNotEmpty($osConcluida->hash_assinatura_sha256);

        // Verifica baixa física no Kardex do depósito
        $saldoPeca = \App\Models\EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $peca->id)->first();
        $this->assertEquals(8.0, (float) $saldoPeca->quantidade_saldo);

        // Verifica geração do Contas a Receber
        $titulo = TituloFinanceiro::where('origem_tipo', 'os')->where('origem_id', $osConcluida->id)->first();
        $this->assertNotNull($titulo);
        $this->assertEquals(300.00, (float) $titulo->valor_original);
    }
}