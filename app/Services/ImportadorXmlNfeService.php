<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\Item;
use App\Models\Pessoa;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use SimpleXMLElement;

class ImportadorXmlNfeService
{
    /**
     * Realiza a leitura do XML da NF-e, vincula fornecedor/itens e lança a compra com entrada em estoque
     */
    public static function processarXml(string $xmlString, string $empresaId, string $depositoId, ?string $usuarioId = null): Compra
    {
        // Remove namespaces para facilitar a navegação limpa via SimpleXMLElement
        $xmlClean = preg_replace('/xmlns[^=]*="[^"]*"/i', '', $xmlString);
        $xml = new SimpleXMLElement($xmlClean);

        $infNFe = null;
        if (isset($xml->infNFe)) {
            $infNFe = $xml->infNFe;
        } elseif (isset($xml->NFe->infNFe)) {
            $infNFe = $xml->NFe->infNFe;
        }

        if (!$infNFe) {
            throw new Exception("Formato de XML de NF-e inválido ou não suportado.");
        }

        $chaveAcesso = str_replace('NFe', '', (string) $infNFe->attributes()->Id);
        
        // 1. Dados do Emitente / Fornecedor
        $cnpjFornecedor = (string) ($infNFe->emit->CNPJ ?? $infNFe->emit->CPF);
        $razaoSocialFornecedor = (string) $infNFe->emit->xNome;
        $nomeFantasiaFornecedor = (string) ($infNFe->emit->xFant ?? $razaoSocialFornecedor);

        return DB::transaction(function () use ($infNFe, $chaveAcesso, $cnpjFornecedor, $razaoSocialFornecedor, $nomeFantasiaFornecedor, $empresaId, $depositoId, $usuarioId, $xmlString) {
            // Localizar ou cadastrar automaticamente o fornecedor
            $fornecedor = Pessoa::firstOrCreate(
                ['cpf_cnpj' => $cnpjFornecedor],
                [
                    'tipo_pessoa' => strlen($cnpjFornecedor) === 14 ? 'PJ' : 'PF',
                    'nome_razao_social' => $razaoSocialFornecedor,
                    'nome_fantasia_apelido' => $nomeFantasiaFornecedor,
                    'is_fornecedor' => true,
                    'is_cliente' => false,
                ]
            );

            // 2. Criar o Registro Principal da Compra
            $compra = Compra::create([
                'id' => (string) Str::uuid(),
                'empresa_id' => $empresaId,
                'fornecedor_id' => $fornecedor->id,
                'deposito_destino_id' => $depositoId,
                'comprador_id' => $usuarioId,
                'numero_nota' => (string) $infNFe->ide->nNF,
                'serie_nota' => (string) $infNFe->ide->serie,
                'chave_acesso_nfe' => $chaveAcesso,
                'status' => 'RECEBIDO',
                'data_emissao' => substr((string) $infNFe->ide->dhEmi, 0, 10),
                'valor_produtos' => (float) $infNFe->total->ICMSTot->vProd,
                'valor_frete' => (float) $infNFe->total->ICMSTot->vFrete,
                'valor_total' => (float) $infNFe->total->ICMSTot->vNF,
                'xml_conteudo' => $xmlString,
            ]);

            // 3. Processar Itens da Nota
            foreach ($infNFe->det as $detalhe) {
                $prod = $detalhe->prod;
                $cProd = (string) $prod->cProd;
                $xProd = (string) $prod->xProd;
                $ncm = (string) $prod->NCM;
                $qCom = (float) $prod->qCom;
                $vUnCom = (float) $prod->vUnCom;
                $vProd = (float) $prod->vProd;
                $uCom = (string) $prod->uCom;

                // De-para de produto: busca por código SKU ou cria novo item
                $item = Item::firstOrCreate(
                    ['codigo_sku' => $cProd],
                    [
                        'nome' => $xProd,
                        'ncm' => $ncm,
                        'unidade_medida' => strtoupper($uCom),
                        'preco_custo' => $vUnCom,
                        'preco_venda' => $vUnCom * 1.5,
                        'controla_estoque' => true,
                    ]
                );

                // Criar item da compra
                CompraItem::create([
                    'compra_id' => $compra->id,
                    'item_id' => $item->id,
                    'codigo_fornecedor' => $cProd,
                    'descricao_fornecedor' => $xProd,
                    'unidade_fornecedor' => $uCom,
                    'fator_conversao' => 1.0000,
                    'quantidade_comercial' => $qCom,
                    'quantidade_estoque' => $qCom,
                    'valor_unitario' => $vUnCom,
                    'valor_total_item' => $vProd,
                ]);

                // 4. Executar Entrada Automática no Estoque via EstoqueService
                EstoqueService::movimentar(
                    $depositoId,
                    $item->id,
                    $qCom,
                    'ENTRADA_COMPRA',
                    $usuarioId,
                    'compras',
                    $compra->id,
                    null,
                    $vUnCom
                );
            }

            return $compra;
        });
    }
}