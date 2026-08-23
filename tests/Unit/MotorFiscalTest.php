<?php

namespace Tests\Unit;

use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\RegraTributaria;
use App\Models\Tenant;
use App\Services\MotorFiscalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class MotorFiscalTest extends TestCase
{
    use RefreshDatabase;

    public function test_emissao_de_documento_fiscal_com_calculo_tributario_e_geracao_de_chave(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Fiscal',
            'razao_social' => 'Fiscal LTDA',
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
            'nome_razao_social' => 'Cliente Destinatario SA',
            'cpf_cnpj' => '04252011000110',
            'is_cliente' => true,
        ]);

        // Matriz de impostos (ICMS 18%, PIS 1.65%, COFINS 7.6%, IBS 1%, CBS 0.9%)
        RegraTributaria::create([
            'empresa_id' => $empresa->id,
            'descricao' => 'Venda de Mercadorias Dentro do Estado',
            'cfop' => '5102',
            'aliquota_icms' => 18.00,
            'aliquota_pis' => 1.65,
            'aliquota_cofins' => 7.60,
            'aliquota_ibs' => 1.00,
            'aliquota_cbs' => 0.90,
        ]);

        $itens = [
            [
                'tipo_item' => 'PRODUTO',
                'cfop' => '5102',
                'valor_total' => 1000.00,
            ]
        ];

        $docFiscal = MotorFiscalService::emitirDocumento($empresa, $cliente, '55', $itens, 'vendas');

        $this->assertEquals('AUTORIZADO', $docFiscal->status);
        $this->assertEquals(1000.00, (float) $docFiscal->valor_total_documento);
        $this->assertEquals(180.00, (float) $docFiscal->valor_icms);
        $this->assertEquals(16.50, (float) $docFiscal->valor_pis);
        $this->assertEquals(76.00, (float) $docFiscal->valor_cofins);
        $this->assertEquals(10.00, (float) $docFiscal->valor_ibs);
        $this->assertEquals(9.00, (float) $docFiscal->valor_cbs);

        $this->assertEquals(44, strlen($docFiscal->chave_acesso));
    }
}