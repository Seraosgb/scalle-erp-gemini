<?php

namespace Tests\Unit;

use App\Models\ContaFinanceira;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\Tenant;
use App\Models\TituloFinanceiro;
use App\Models\User;
use App\Services\FinanceiroService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Tests\TestCase;

class FinanceiroTest extends TestCase
{
    use RefreshDatabase;

    public function test_liquidacao_total_de_titulo_a_receber_com_atualizacao_de_saldo_e_extrato(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Financeiro',
            'razao_social' => 'Financeiro LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Matriz RJ',
            'razao_social' => 'Matriz RJ LTDA',
            'cnpj' => '12345678000199',
        ]);

        $cliente = Pessoa::create([
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Cliente Pagador SA',
            'cpf_cnpj' => '04252011000110',
            'is_cliente' => true,
        ]);

        $conta = ContaFinanceira::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Banco Itaú Principal',
            'tipo_conta' => 'CORRENTE',
            'saldo_inicial' => 1000.00,
            'saldo_atual' => 1000.00,
        ]);

        $titulo = TituloFinanceiro::create([
            'id' => (string) Str::uuid(),
            'empresa_id' => $empresa->id,
            'pessoa_id' => $cliente->id,
            'conta_padrao_id' => $conta->id,
            'natureza' => 'RECEBER',
            'documento_numero' => 'REC-5001',
            'data_vencimento' => now()->addDays(5)->toDateString(),
            'valor_original' => 500.00,
            'valor_saldo_aberto' => 500.00,
            'status' => 'ABERTO',
        ]);

        // Liquidar totalmente o título
        $tituloLiquidado = FinanceiroService::liquidarTitulo($titulo, $conta->id, 500.00, 0, 0, 0, 'PIX');

        $this->assertEquals('LIQUIDADO', $tituloLiquidado->status);
        $this->assertEquals(0.00, (float) $tituloLiquidado->valor_saldo_aberto);

        // Saldo da conta deve subir de 1000.00 para 1500.00
        $this->assertDatabaseHas('fin_contas_financeiras', [
            'id' => $conta->id,
            'saldo_atual' => 1500.00,
        ]);

        // Extrato registrado
        $this->assertDatabaseHas('fin_movimentacoes_extrato', [
            'conta_financeira_id' => $conta->id,
            'tipo_movimento' => 'ENTRADA',
            'valor' => 500.00,
            'saldo_posterior' => 1500.00,
        ]);
    }
}