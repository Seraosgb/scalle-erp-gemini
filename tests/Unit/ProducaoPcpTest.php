<?php

namespace Tests\Unit;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\EstruturaItem;
use App\Models\Item;
use App\Models\OrdemProducao;
use App\Models\PatrimonioBem;
use App\Models\Tenant;
use App\Models\Veiculo;
use App\Services\EstoqueService;
use App\Services\ProducaoPcpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProducaoPcpTest extends TestCase
{
    use RefreshDatabase;

    public function test_producao_industrial_com_consumo_de_bom_e_entrada_de_produto_acabado(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Fabrica Teste',
            'razao_social' => 'Fabrica Teste SA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Planta Industrial',
            'razao_social' => 'Planta Industrial LTDA',
            'cnpj' => '12345678000199',
        ]);

        $depMateriaPrima = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Almoxarifado MP',
            'codigo' => 'ALMOX-MP',
        ]);

        $depAcabados = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Estoque Acabados',
            'codigo' => 'EST-ACAB',
        ]);

        // Criar Insumo e Produto Final
        $perfilAluminio = Item::create([
            'tipo_item' => 'MATERIA_PRIMA',
            'codigo_sku' => 'ALUM-BARRA',
            'nome' => 'Barra de Alumínio 6m',
            'preco_custo' => 50.00,
            'controla_estoque' => true,
        ]);

        $quadroPainel = Item::create([
            'tipo_item' => 'PRODUTO',
            'codigo_sku' => 'PAINEL-ELETRICO',
            'nome' => 'Quadro de Comando Montado',
            'preco_venda' => 300.00,
            'controla_estoque' => true,
        ]);

        // Ficha técnica: Cada Painel consome 2 Barras de Alumínio
        EstruturaItem::create([
            'produto_pai_id' => $quadroPainel->id,
            'insumo_filho_id' => $perfilAluminio->id,
            'quantidade_necessaria' => 2.0000,
            'percentual_perda_estimada' => 0.00,
        ]);

        // Abastecer 20 barras de alumínio no Almoxarifado MP
        EstoqueService::movimentar($depMateriaPrima->id, $perfilAluminio->id, 20.0000, 'ENTRADA_COMPRA', null, null, null, null, 50.00);

        // Criar Ordem de Produção para 5 painéis
        $op = OrdemProducao::create([
            'id' => (string) Str::uuid(),
            'empresa_id' => $empresa->id,
            'produto_id' => $quadroPainel->id,
            'deposito_origem_id' => $depMateriaPrima->id,
            'deposito_destino_id' => $depAcabados->id,
            'status' => 'EM_PRODUCAO',
            'quantidade_planejada' => 5.0000,
            'data_inicio_prevista' => now()->toDateString(),
            'data_fim_prevista' => now()->addDays(2)->toDateString(),
        ]);

        // Concluir a fabricação de 5 unidades (Consome 10 barras)
        $opConcluida = ProducaoPcpService::finalizarProducao($op, 5.0000);

        $this->assertEquals('CONCLUIDA', $opConcluida->status);
        $this->assertEquals(500.00, (float) $opConcluida->custo_total_real);

        // O estoque de barras de alumínio deve cair de 20 para 10
        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $depMateriaPrima->id,
            'item_id' => $perfilAluminio->id,
            'quantidade_saldo' => 10.0000,
        ]);

        // O estoque de painéis acabados deve subir para 5
        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $depAcabados->id,
            'item_id' => $quadroPainel->id,
            'quantidade_saldo' => 5.0000,
        ]);
    }

    public function test_cadastro_de_veiculo_e_patrimonio(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Frotas',
            'razao_social' => 'Frotas SA',
            'documento' => '98765432000188',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Filial Logistica',
            'razao_social' => 'Logistica LTDA',
            'cnpj' => '98765432000188',
        ]);

        $veiculo = Veiculo::create([
            'empresa_id' => $empresa->id,
            'placa' => 'RIO2A26',
            'marca_modelo' => 'Fiat Strada 1.3 Freedom',
            'ano_fabricacao' => 2026,
            'km_atual' => 15420.50,
        ]);

        $patrimonio = PatrimonioBem::create([
            'empresa_id' => $empresa->id,
            'codigo_patrimonio' => 'PAT-VACUOMETRO-01',
            'descricao' => 'Vacuômetro Digital Testo 552i',
            'qr_code_hash' => 'QR-HASH-998877',
            'valor_aquisicao' => 1250.00,
        ]);

        $this->assertDatabaseHas('fro_veiculos', ['placa' => 'RIO2A26']);
        $this->assertDatabaseHas('pat_bens', ['codigo_patrimonio' => 'PAT-VACUOMETRO-01']);
    }
}