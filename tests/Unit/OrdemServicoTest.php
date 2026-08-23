<?php

namespace Tests\Unit;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Item;
use App\Models\OrdemServico;
use App\Models\Pessoa;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EstoqueService;
use App\Services\OrdemServicoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrdemServicoTest extends TestCase
{
    use RefreshDatabase;

    public function test_conclusao_de_os_com_baixa_de_pecas_em_estoque_e_assinatura(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Climatizacao',
            'razao_social' => 'Climatizacao e Servicos LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Filial Rio',
            'razao_social' => 'Filial Rio LTDA',
            'cnpj' => '12345678000199',
        ]);

        $deposito = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Van Tecnica 01',
            'codigo' => 'VAN-01',
        ]);

        $cliente = Pessoa::create([
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Clinica de Diagnosticos SA',
            'cpf_cnpj' => '04252011000110',
            'is_cliente' => true,
        ]);

        $tecnico = User::create([
            'name' => 'Tecnico Bruno',
            'email' => 'tecnico@scalle.com.br',
            'password' => 'senha123',
        ]);

        // 1. Cadastrar Peça e Serviço
        $pecaCapacitor = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'CAP-45UF',
            'nome' => 'Capacitor Duplo 45+5uF',
            'preco_venda' => 80.00,
            'controla_estoque' => true,
        ]);

        $servicoManutencao = Item::create([
            'tipo_item' => 'SERVICO',
            'codigo_sku' => 'SERV-HIG-01',
            'nome' => 'Higienizacao e Carga de Gas',
            'preco_venda' => 250.00,
            'controla_estoque' => false,
        ]);

        // Abastecer 10 capacitores na Van
        EstoqueService::movimentar($deposito->id, $pecaCapacitor->id, 10.0000, 'ENTRADA_COMPRA');

        // 2. Abrir Ordem de Serviço
        $os = OrdemServico::create([
            'id' => (string) Str::uuid(),
            'empresa_id' => $empresa->id,
            'cliente_id' => $cliente->id,
            'tecnico_responsavel_id' => $tecnico->id,
            'deposito_saida_id' => $deposito->id,
            'equipamento_descricao' => 'Ar Condicionado Split 30000 BTUs',
            'defeito_reclamado' => 'Equipamento nao gela e ventilador externo parado',
            'status' => 'EM_ANDAMENTO',
        ]);

        // 3. Concluir OS com 1 Capacitor e 1 Mão de Obra
        $osConcluida = OrdemServicoService::concluirOrdemServico(
            $os,
            [
                [
                    'item_id' => $pecaCapacitor->id,
                    'tipo_item' => 'PRODUTO',
                    'quantidade' => 1.0000,
                    'valor_unitario' => 80.00,
                ],
                [
                    'item_id' => $servicoManutencao->id,
                    'tipo_item' => 'SERVICO',
                    'quantidade' => 1.0000,
                    'valor_unitario' => 250.00,
                ]
            ],
            'Substituido capacitor duplo em curto e realizada limpeza quimica.',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
            'Dr. Carlos Eduardo',
            '12345678900',
            $tecnico
        );

        $this->assertEquals('CONCLUIDA', $osConcluida->status);
        $this->assertEquals(330.00, (float) $osConcluida->valor_total);

        // O saldo do capacitor na Van deve cair de 10 para 9
        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $deposito->id,
            'item_id' => $pecaCapacitor->id,
            'quantidade_saldo' => 9.0000,
        ]);
    }
}