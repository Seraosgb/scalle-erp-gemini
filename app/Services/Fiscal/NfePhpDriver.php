<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Make;
use NFePHP\NFe\Common\Standardize;
use Illuminate\Support\Str;
use Exception;

class NfePhpDriver implements FiscalDriverInterface
{
    private Tools $tools;
    private array $config;

    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2, string $cnpj = '', string $razaoSocial = ''): self
    {
        $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpj);
        if (empty($cnpjLimpo) || strlen($cnpjLimpo) !== 14) {
            $cnpjLimpo = str_pad($cnpjLimpo, 14, '0', STR_PAD_LEFT);
        }

        $this->config = [
            "atualizacao" => now()->format('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb,
            "razaosocial" => empty($razaoSocial) ? "Empresa Emissora" : substr($razaoSocial, 0, 60),
            "siglaUF" => $uf,
            "cnpj" => $cnpjLimpo,
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            // Mock do Token CSC (Obrigatório para gerar o QR Code da NFC-e Modelo 65)
            "CSC" => "GPQCGX3M46MGEHUX4JPRR8FQQ1H7WJ1E",
            "CSCid" => "000001"
        ];

        $jsonConfig = json_encode($this->config);
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $this->tools = new Tools($jsonConfig, $certificado);
        return $this;
    }

    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
            $this->tools->model('55');
            $response = $this->tools->sefazStatus($uf, $tpAmb);
            $standardize = new Standardize();
            $std = $standardize->toStd($response);

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
        // 1. Avisa o NFePHP se é modelo 55 (NF-e) ou 65 (NFC-e) para acionar o gerador de QR Code
        $modeloDoc = $dadosEmissao['modelo'] ?? '55';
        $this->tools->model($modeloDoc);

        $nfe = new Make();
        try {
            // 0. Inicialização
            $stdInfNFe = new \stdClass();
            $stdInfNFe->versao = '4.00';
            $stdInfNFe->Id = '';
            $stdInfNFe->pk_nItem = null;
            $nfe->taginfNFe($stdInfNFe);

            // 1. Identificação da NFe (<ide>)
            $stdIde = new \stdClass();
            $stdIde->cUF = 33; // RJ
            $stdIde->cNF = rand(11111111, 99999999);
            $stdIde->natOp = 'Venda de Mercadorias';
            $stdIde->mod = $modeloDoc;
            $stdIde->serie = 1;
            $stdIde->nNF = $dadosEmissao['numero'];
            $stdIde->dhEmi = now()->format('Y-m-d\TH:i:sP');
            $stdIde->tpNF = 1; // Saída
            $stdIde->idDest = 1; // Operação Interna
            $stdIde->cMunFG = 3300456; // Belford Roxo
            $stdIde->tpImp = 4; // DANFE NFC-e
            $stdIde->tpEmis = 1; // Emissão Normal
            $stdIde->tpAmb = $this->config['tpAmb'];
            $stdIde->finNFe = 1; // Normal
            $stdIde->indFinal = 1; // Consumidor Final
            $stdIde->indPres = 1; // Operação Presencial
            $stdIde->procEmi = 0; // Aplicativo Contribuinte
            $stdIde->verProc = '1.0';
            $nfe->tagide($stdIde);

            // 2. Emitente (<emit>)
            $stdEmit = new \stdClass();
            $stdEmit->xNome = $dadosEmissao['emitente']['razao_social'] ?? 'EMPRESA TESTE';
            $stdEmit->xFant = $dadosEmissao['emitente']['nome_fantasia'] ?? 'FANTASIA TESTE';
            $stdEmit->IE = 'ISENTO'; // Para testes, assume ISENTO
            $stdEmit->CRT = 1; // Simples Nacional
            $stdEmit->CNPJ = $this->config['cnpj']; // Forçado do certificado
            $nfe->tagemit($stdEmit);

            $stdEnderEmit = new \stdClass();
            $stdEnderEmit->xLgr = 'Rua de Teste';
            $stdEnderEmit->nro = '123';
            $stdEnderEmit->xBairro = 'Centro';
            $stdEnderEmit->cMun = 3300456;
            $stdEnderEmit->xMun = 'Belford Roxo';
            $stdEnderEmit->UF = 'RJ';
            $stdEnderEmit->CEP = '26110000';
            $stdEnderEmit->cPais = 1058;
            $stdEnderEmit->xPais = 'Brasil';
            $nfe->tagenderEmit($stdEnderEmit);

            // 3. Destinatário (<dest>)
            $stdDest = new \stdClass();
            $stdDest->xNome = $dadosEmissao['destinatario']['nome_razao_social'] ?? 'Consumidor Final';
            $stdDest->indIEDest = 9; // Não Contribuinte

            $docDestino = preg_replace('/[^0-9]/', '', $dadosEmissao['destinatario']['cpf_cnpj'] ?? '');
            if (empty($docDestino)) {
                $stdDest->CPF = '00000000000';
            } elseif (strlen($docDestino) > 11) {
                $stdDest->CNPJ = str_pad($docDestino, 14, '0', STR_PAD_LEFT);
            } else {
                $stdDest->CPF = str_pad($docDestino, 11, '0', STR_PAD_LEFT);
            }
            $nfe->tagdest($stdDest);

            $stdEnderDest = new \stdClass();
            $stdEnderDest->xLgr = 'Rua do Cliente';
            $stdEnderDest->nro = 'SN';
            $stdEnderDest->xBairro = 'Centro';
            $stdEnderDest->cMun = 3300456;
            $stdEnderDest->xMun = 'Belford Roxo';
            $stdEnderDest->UF = 'RJ';
            $stdEnderDest->CEP = '26110000';
            $stdEnderDest->cPais = 1058;
            $stdEnderDest->xPais = 'Brasil';
            $nfe->tagenderDest($stdEnderDest);

            // 4. Produtos e Impostos (<det>)
            $totais = 0.00;
            foreach ($dadosEmissao['itens'] as $idx => $item) {
                $nItem = $idx + 1;
                $valorTotalItem = (float) $item['valor_total'];
                $totais += $valorTotalItem;

                $stdProd = new \stdClass();
                $stdProd->item = $nItem;
                $stdProd->cProd = 'PRD' . str_pad($nItem, 3, '0', STR_PAD_LEFT);
                $stdProd->cEAN = 'SEM GTIN';
                $stdProd->xProd = 'PRODUTO DE TESTE ' . $nItem;
                $stdProd->NCM = '94039090';
                $stdProd->CFOP = '5102'; // Venda
                $stdProd->uCom = 'UN';
                $stdProd->qCom = 1.0000;
                $stdProd->vUnCom = $valorTotalItem;
                $stdProd->vProd = $valorTotalItem;
                $stdProd->cEANTrib = 'SEM GTIN';
                $stdProd->uTrib = 'UN';
                $stdProd->qTrib = 1.0000;
                $stdProd->vUnTrib = $valorTotalItem;
                $stdProd->indTot = 1;
                $nfe->tagprod($stdProd);

                $stdImposto = new \stdClass();
                $stdImposto->item = $nItem;
                $nfe->tagimposto($stdImposto);

                $stdIcms = new \stdClass();
                $stdIcms->item = $nItem;
                $stdIcms->orig = 0;
                $stdIcms->CSOSN = '102'; // Simples Nacional
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

            // 5. Totalizadores (<total>)
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

            // 6. Transporte e Pagamento (<transp>, <pag>)
            $stdTransp = new \stdClass();
            $stdTransp->modFrete = 9; // Sem frete
            $nfe->tagtransp($stdTransp);

            $stdPag = new \stdClass();
            $stdPag->vTroco = 0.00;
            $nfe->tagpag($stdPag);

            $stdDetPag = new \stdClass();
            $stdDetPag->tPag = '01'; // Dinheiro
            $stdDetPag->vPag = $totais;
            $nfe->tagdetPag($stdDetPag);

            $xmlString = $nfe->getXML();

            if (!empty($nfe->getErrors())) {
                throw new Exception("Falha de validação do schema XML: " . implode(' | ', $nfe->getErrors()));
            }

            $xmlAssinado = $this->tools->signNFe($xmlString);

            // CORREÇÃO MESTRA: Uso de setters explícitos para contornar o $fillable (Mass Assignment) do Laravel
            $doc = new DocumentoFiscal();
            $doc->id = (string) Str::uuid();
            $doc->tenant_id = $dadosEmissao['tenant_id'];
            $doc->empresa_id = $dadosEmissao['empresa_id'];
            $doc->destinatario_id = $dadosEmissao['destinatario']['id'] ?? null;
            $doc->modelo_documento = $modeloDoc;
            $doc->numero_documento = $dadosEmissao['numero'];
            $doc->serie = '1';
            $doc->chave_acesso = $nfe->getChave();
            $doc->status = 'PROCESSANDO';
            $doc->xml_conteudo = $xmlAssinado; // Agora grava com certeza absoluta
            $doc->data_emissao = now();
            $doc->valor_total = $totais;
            $doc->save();

            return $doc;

        } catch (Exception $e) {
            $errosXsd = !empty($nfe->getErrors()) ? implode(' | ', $nfe->getErrors()) : '';
            throw new Exception($e->getMessage() . ($errosXsd ? " - SEFAZ Schema Error: " . $errosXsd : ""));
        }
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return false; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return false; }
}
