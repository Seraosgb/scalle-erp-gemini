<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use App\Models\Endereco;
use App\Models\Item;
use Exception;
use Illuminate\Support\Str;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;

class NfePhpDriver implements FiscalDriverInterface
{
    private Tools $tools;
    private array $config;

    public function configurar(
        string $certificadoBinario,
        string $senha,
        string $uf,
        int $tpAmb = 2,
        string $cnpj = '',
        string $razaoSocial = '',
        string $csc = 'GPQCGX3M46MGEHUX4JPRR8FQQ1H7WJ1E',
        string $cscId = '000001'
    ): self {
        $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpj);
        if (empty($cnpjLimpo) || strlen($cnpjLimpo) !== 14) {
            $cnpjLimpo = str_pad($cnpjLimpo, 14, '0', STR_PAD_LEFT);
        }

        $this->config = [
            "atualizacao" => now()->format('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb,
            "razaosocial" => empty($razaoSocial) ? "Empresa Emissora" : substr($razaoSocial, 0, 60),
            "siglaUF" => $uf ?: 'RJ',
            "cnpj" => $cnpjLimpo,
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => $csc ?: "GPQCGX3M46MGEHUX4JPRR8FQQ1H7WJ1E",
            "CSCid" => $cscId ?: "000001"
        ];

        $certificado = Certificate::readPfx($certificadoBinario, $senha);
        $this->tools = new Tools(json_encode($this->config), $certificado);

        return $this;
    }

    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
            $this->tools->model('55');
            $response = $this->tools->sefazStatus($uf, $tpAmb);
            $std = (new Standardize())->toStd($response);

            return [
                'status_code' => (int) ($std->cStat ?? 0),
                'motivo' => (string) ($std->xMotivo ?? 'Sem resposta decodificável'),
                'tempo_medio' => (int) ($std->tMed ?? 0),
                'ambiente' => ((string) ($std->tpAmb ?? '')) === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'
            ];
        } catch (Exception $e) {
            return ['status_code' => 500, 'motivo' => 'Falha de Comunicação SEFAZ: ' . $e->getMessage()];
        }
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal
    {
        $modeloDoc = $dadosEmissao['modelo'] ?? '55';
        $this->tools->model($modeloDoc);

        $emitente = $dadosEmissao['emitente'];
        $destinatario = $dadosEmissao['destinatario'];
        $endDest = Endereco::where('pessoa_id', $destinatario['id'] ?? null)->first();

        $nfe = new Make();
        try {
            $stdInfNFe = new \stdClass();
            $stdInfNFe->versao = '4.00';
            $stdInfNFe->Id = '';
            $stdInfNFe->pk_nItem = null;
            $nfe->taginfNFe($stdInfNFe);

            $cMunEmit = (int) ($emitente['codigo_ibge'] ?? 3300456);

            $stdIde = new \stdClass();
            $stdIde->cUF = (int) substr((string) $cMunEmit, 0, 2);
            $stdIde->cNF = rand(11111111, 99999999);
            $stdIde->natOp = $dadosEmissao['natureza_operacao'] ?? 'VENDA DE MERCADORIAS';
            $stdIde->mod = $modeloDoc;
            $stdIde->serie = (int) ($dadosEmissao['serie'] ?? 1);
            $stdIde->nNF = (int) $dadosEmissao['numero'];
            $stdIde->dhEmi = now()->format('Y-m-d\TH:i:sP');
            $stdIde->tpNF = 1;
            $stdIde->idDest = 1;
            $stdIde->cMunFG = $cMunEmit;
            $stdIde->tpImp = $modeloDoc === '65' ? 4 : 1;
            $stdIde->tpEmis = 1;
            $stdIde->tpAmb = $this->config['tpAmb'];
            $stdIde->finNFe = 1;
            $stdIde->indFinal = 1;
            $stdIde->indPres = 1;
            $stdIde->procEmi = 0;
            $stdIde->verProc = 'ScalleERP-2.0';
            $nfe->tagide($stdIde);

            // Emitente Dinâmico
            $stdEmit = new \stdClass();
            $stdEmit->xNome = substr($emitente['razao_social'] ?? 'EMPRESA EMITENTE', 0, 60);
            $stdEmit->xFant = substr($emitente['nome_fantasia'] ?? 'FANTASIA', 0, 60);
            $stdEmit->IE = !empty($emitente['inscricao_estadual']) ? preg_replace('/[^0-9A-Z]/', '', strtoupper($emitente['inscricao_estadual'])) : 'ISENTO';
            $stdEmit->CRT = ($emitente['regime_tributario'] ?? 'simples_nacional') === 'regime_normal' ? 3 : 1;
            $stdEmit->CNPJ = $this->config['cnpj'];
            $nfe->tagemit($stdEmit);

            $stdEnderEmit = new \stdClass();
            $stdEnderEmit->xLgr = $emitente['logradouro'] ?? 'Avenida Principal';
            $stdEnderEmit->nro = $emitente['numero'] ?? '100';
            $stdEnderEmit->xBairro = $emitente['bairro'] ?? 'Centro';
            $stdEnderEmit->cMun = $cMunEmit;
            $stdEnderEmit->xMun = $emitente['cidade'] ?? 'Belford Roxo';
            $stdEnderEmit->UF = $emitente['uf'] ?? 'RJ';
            $stdEnderEmit->CEP = preg_replace('/[^0-9]/', '', $emitente['cep'] ?? '26110000');
            $stdEnderEmit->cPais = 1058;
            $stdEnderEmit->xPais = 'Brasil';
            $nfe->tagenderEmit($stdEnderEmit);

            // Destinatário Dinâmico
            $stdDest = new \stdClass();
            $stdDest->xNome = $this->config['tpAmb'] === 2
                ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
                : substr($destinatario['nome_razao_social'] ?? 'Consumidor Final', 0, 60);
            $stdDest->indIEDest = 9;

            $docDestino = preg_replace('/[^0-9]/', '', $destinatario['cpf_cnpj'] ?? '');
            if (strlen($docDestino) === 14) {
                $stdDest->CNPJ = $docDestino;
            } else {
                $stdDest->CPF = strlen($docDestino) === 11 ? $docDestino : '00000000000';
            }
            $nfe->tagdest($stdDest);

            $stdEnderDest = new \stdClass();
            $stdEnderDest->xLgr = $endDest?->logradouro ?? 'Rua Comercial';
            $stdEnderDest->nro = $endDest?->numero ?? 'SN';
            $stdEnderDest->xBairro = $endDest?->bairro ?? 'Centro';
            $stdEnderDest->cMun = (int) ($endDest?->codigo_ibge ?? 3300456);
            $stdEnderDest->xMun = $endDest?->cidade ?? 'Belford Roxo';
            $stdEnderDest->UF = $endDest?->uf ?? 'RJ';
            $stdEnderDest->CEP = preg_replace('/[^0-9]/', '', $endDest?->cep ?? '26110000');
            $stdEnderDest->cPais = 1058;
            $stdEnderDest->xPais = 'Brasil';
            $nfe->tagenderDest($stdEnderDest);

            // Produtos Reais do Catálogo
            $totais = 0.00;
            foreach ($dadosEmissao['itens'] as $idx => $item) {
                $nItem = $idx + 1;
                $valorTotalItem = (float) $item['valor_total'];
                $qtdItem = (float) ($item['quantidade'] ?? 1.0000);
                $vlrUnit = $qtdItem > 0 ? round($valorTotalItem / $qtdItem, 4) : $valorTotalItem;
                $totais += $valorTotalItem;

                $itemCatalogo = !empty($item['item_id']) ? Item::withoutGlobalScopes()->find($item['item_id']) : null;

                $stdProd = new \stdClass();
                $stdProd->item = $nItem;
                $stdProd->cProd = $itemCatalogo?->codigo_sku ?? ('PRD' . str_pad((string) $nItem, 3, '0', STR_PAD_LEFT));
                $stdProd->cEAN = !empty($itemCatalogo?->codigo_barras_ean) ? $itemCatalogo->codigo_barras_ean : 'SEM GTIN';
                $stdProd->xProd = $this->config['tpAmb'] === 2 && $nItem === 1 && $modeloDoc === '65'
                    ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
                    : substr($itemCatalogo?->nome ?? ($item['descricao'] ?? "ITEM COMERCIAL {$nItem}"), 0, 120);
                $stdProd->NCM = preg_replace('/[^0-9]/', '', $itemCatalogo?->ncm ?? '84143091');
                if (strlen($stdProd->NCM) !== 8) {
                    $stdProd->NCM = '84143091';
                }
                $stdProd->CFOP = $item['cfop'] ?? ($itemCatalogo?->cfop_padrao ?? '5102');
                $stdProd->uCom = $itemCatalogo?->unidade_medida ?? 'UN';
                $stdProd->qCom = $qtdItem;
                $stdProd->vUnCom = $vlrUnit;
                $stdProd->vProd = $valorTotalItem;
                $stdProd->cEANTrib = $stdProd->cEAN;
                $stdProd->uTrib = $stdProd->uCom;
                $stdProd->qTrib = $qtdItem;
                $stdProd->vUnTrib = $vlrUnit;
                $stdProd->indTot = 1;
                $nfe->tagprod($stdProd);

                $stdImposto = new \stdClass();
                $stdImposto->item = $nItem;
                $nfe->tagimposto($stdImposto);

                $stdIcms = new \stdClass();
                $stdIcms->item = $nItem;
                $stdIcms->orig = (int) ($itemCatalogo?->origem_mercadoria ?? 0);
                $stdIcms->CSOSN = '102';
                $nfe->tagICMSSN($stdIcms);

                $stdPis = new \stdClass();
                $stdPis->item = $nItem;
                $stdPis->CST = '07';
                $nfe->tagPIS($stdPis);

                $stdCofins = new \stdClass();
                $stdCofins->item = $nItem;
                $stdCofins->CST = '07';
                $nfe->tagCOFINS($stdCofins);
            }

            $stdIcmsTot = new \stdClass();
            $stdIcmsTot->vBC = 0.00;
            $stdIcmsTot->vICMS = 0.00;
            $stdIcmsTot->vICMSDeson = 0.00;
            $stdIcmsTot->vFCP = 0.00;
            $stdIcmsTot->vBCST = 0.00;
            $stdIcmsTot->vST = 0.00;
            $stdIcmsTot->vFCPST = 0.00;
            $stdIcmsTot->vFCPSTRet = 0.00;
            $stdIcmsTot->vProd = $totais;
            $stdIcmsTot->vFrete = 0.00;
            $stdIcmsTot->vSeg = 0.00;
            $stdIcmsTot->vDesc = 0.00;
            $stdIcmsTot->vII = 0.00;
            $stdIcmsTot->vIPI = 0.00;
            $stdIcmsTot->vIPIDevol = 0.00;
            $stdIcmsTot->vPIS = 0.00;
            $stdIcmsTot->vCOFINS = 0.00;
            $stdIcmsTot->vOutro = 0.00;
            $stdIcmsTot->vNF = $totais;
            $nfe->tagICMSTot($stdIcmsTot);

            $stdTransp = new \stdClass();
            $stdTransp->modFrete = 9;
            $nfe->tagtransp($stdTransp);

            $stdPag = new \stdClass();
            $stdPag->vTroco = 0.00;
            $nfe->tagpag($stdPag);

            $stdDetPag = new \stdClass();
            $stdDetPag->tPag = '01';
            $stdDetPag->vPag = $totais;
            $nfe->tagdetPag($stdDetPag);

            $xmlString = $nfe->getXML();
            if (!empty($nfe->getErrors())) {
                throw new Exception("Falha de validação do schema XML: " . implode(' | ', $nfe->getErrors()));
            }

            $xmlAssinado = $this->tools->signNFe($xmlString);

            $doc = new DocumentoFiscal();
            $doc->id = (string) Str::uuid();
            $doc->tenant_id = $dadosEmissao['tenant_id'];
            $doc->empresa_id = $dadosEmissao['empresa_id'];
            $doc->destinatario_id = $destinatario['id'] ?? null;
            $doc->modelo_documento = $modeloDoc;
            $doc->numero_documento = $dadosEmissao['numero'];
            $doc->serie = '1';
            $doc->chave_acesso = $nfe->getChave();
            $doc->status = 'PROCESSANDO';
            $doc->xml_conteudo = $xmlAssinado;
            $doc->data_emissao = now();
            $doc->valor_total = $totais;
            $doc->save();

            return $doc;
        } catch (Exception $e) {
            $errosXsd = !empty($nfe->getErrors()) ? implode(' | ', $nfe->getErrors()) : '';
            throw new Exception($e->getMessage() . ($errosXsd ? " - SEFAZ Schema Error: " . $errosXsd : ""));
        }
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return true; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return true; }
}
