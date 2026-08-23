<?php

namespace Tests\Unit;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Tenant;
use App\Services\ImportadorXmlNfeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class ImportadorXmlNfeTest extends TestCase
{
    use RefreshDatabase;

    public function test_importacao_de_xml_nfe_com_criacao_de_fornecedor_itens_e_saldo_estoque(): void
    {
        $tenant = Tenant::create([
            'nome_fantasia' => 'Tenant Compras',
            'razao_social' => 'Compras LTDA',
            'documento' => '12345678000199',
        ]);

        App::instance('current_tenant_id', $tenant->id);

        $empresa = Empresa::create([
            'nome_fantasia' => 'Matriz RJ',
            'razao_social' => 'Matriz RJ LTDA',
            'cnpj' => '12345678000199',
        ]);

        $deposito = Deposito::create([
            'empresa_id' => $empresa->id,
            'nome' => 'Almoxarifado Geral',
            'codigo' => 'ALMOX-GERAL',
        ]);

        // Simulação de payload de XML de NF-e válido
        $xmlSimulado = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe33260804252011000110550010000012341000012345">
        <ide>
            <nNF>1234</nNF>
            <serie>1</serie>
            <dhEmi>2026-08-22T10:00:00-03:00</dhEmi>
        </ide>
        <emit>
            <CNPJ>04252011000110</CNPJ>
            <xNome>Fornecedor de Pecas LTDA</xNome>
            <xFant>Mega Pecas</xFant>
        </emit>
        <det nItem="1">
            <prod>
                <cProd>GAS-R410A</cProd>
                <xProd>Gas Refrigerante R410A Botijao 11.3KG</xProd>
                <NCM>38247800</NCM>
                <qCom>2.0000</qCom>
                <vUnCom>450.0000</vUnCom>
                <vProd>900.00</vProd>
                <uCom>UN</uCom>
            </prod>
        </det>
        <total>
            <ICMSTot>
                <vProd>900.00</vProd>
                <vFrete>0.00</vFrete>
                <vNF>900.00</vNF>
            </ICMSTot>
        </total>
    </infNFe>
</NFe>
XML;

        $compra = ImportadorXmlNfeService::processarXml($xmlSimulado, $empresa->id, $deposito->id);

        $this->assertDatabaseHas('cmp_compras', [
            'id' => $compra->id,
            'numero_nota' => '1234',
            'valor_total' => 900.00,
            'status' => 'RECEBIDO',
        ]);

        $this->assertDatabaseHas('pes_pessoas', [
            'cpf_cnpj' => '04252011000110',
            'is_fornecedor' => true,
        ]);

        $this->assertDatabaseHas('pro_itens', [
            'codigo_sku' => 'GAS-R410A',
        ]);

        $this->assertDatabaseHas('wms_estoque_deposito', [
            'deposito_id' => $deposito->id,
            'quantidade_saldo' => 2.0000,
        ]);
    }
}