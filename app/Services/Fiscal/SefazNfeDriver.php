<?php

namespace App\Services\Fiscal;

use App\Interfaces\FiscalDriverInterface;
use App\Models\DocumentoFiscal;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Make;
use Exception;

class SefazNfeDriver implements FiscalDriverInterface
{
    protected ?Tools $tools = null;

    public function __construct()
    {
        // Nasce limpo. Configurado dinamicamente via MotorFiscalService.
    }

    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2): self
    {
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $configJson = json_encode([
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => $tpAmb,
            "razaosocial" => "Scalle Operacional LTDA",
            "siglaUF" => $uf,
            "cnpj" => "00000000000000",
            "schemes" => "PL_009_V4",
            "versao" => "4.00"
        ]);

        $this->tools = new Tools($configJson, $certificado);
        $this->tools->model('55'); // Define NFe (Modelo 55)

        return $this;
    }

    public function emitir(array $dadosEmissao): DocumentoFiscal
    {
        if (!$this->tools) {
            throw new Exception("Driver Fiscal não configurado. Chame o método configurar() antes de emitir.");
        }

        $nfe = new Make();

        // 1. Tag <infNFe> e <ide> (Identificação)
        $stdIde = new \stdClass();
        $stdIde->cUF = 33; // RJ
        $stdIde->cNF = rand(11111111, 99999999);
        $stdIde->natOp = 'VENDA DE MERCADORIAS';
        $stdIde->mod = 55;
        $stdIde->serie = 1;
        $stdIde->nNF = rand(1000, 9999); // Numeração que virá do banco
        $stdIde->dhEmi = date('Y-m-d\TH:i:sP');
        $stdIde->tpNF = 1; // 1=Saída
        $stdIde->idDest = 1; // 1=Interna, 2=Interestadual
        $stdIde->cMunFG = 3300456; // Belford Roxo
        $stdIde->tpImp = 1; // Danfe Retrato
        $stdIde->tpEmis = 1; // Emissão Normal
        $stdIde->tpAmb = 2; // Homologação
        $stdIde->finNFe = 1; // 1=Normal
        $stdIde->indFinal = 0; // 0=Normal, 1=Consumidor Final
        $stdIde->indPres = 1; // 1=Presencial
        $stdIde->procEmi = 0; // Emissão por aplicativo próprio
        $stdIde->verProc = 'ScalleERP-1.0';
        $nfe->tagide($stdIde);

        // 2. Tag <emit> (Emitente)
        $stdEmit = new \stdClass();
        $stdEmit->xNome = 'SCALLE ENTERPRISE MATRIZ';
        $stdEmit->xFant = 'SCALLE MATRIZ';
        $stdEmit->IE = '12345678';
        $stdEmit->CRT = 3; // 3=Regime Normal
        $stdEmit->CNPJ = '00000000000191';
        $nfe->tagemit($stdEmit);

        // Endereço Emitente
        $stdEnderEmit = new \stdClass();
        $stdEnderEmit->xLgr = 'RUA PRINCIPAL';
        $stdEnderEmit->nro = '100';
        $stdEnderEmit->xBairro = 'CENTRO';
        $stdEnderEmit->cMun = 3300456;
        $stdEnderEmit->xMun = 'BELFORD ROXO';
        $stdEnderEmit->UF = 'RJ';
        $stdEnderEmit->CEP = '26110000';
        $stdEnderEmit->cPais = 1058;
        $stdEnderEmit->xPais = 'BRASIL';
        $nfe->tagenderEmit($stdEnderEmit);

        // 3. Tag <dest> (Destinatário)
        $stdDest = new \stdClass();
        $stdDest->xNome = $dadosEmissao['destinatario']['nome_razao_social'] ?? 'DISTRIBUIDORA DE PECAS LTDA';
        $stdDest->indIEDest = 1; // 1=Contribuinte ICMS
        $stdDest->IE = '98765432';

        // Limpa CPF/CNPJ
        $doc = preg_replace('/[^0-9]/', '', $dadosEmissao['destinatario']['cpf_cnpj'] ?? '12345678000195');
        if (strlen($doc) === 14) {
            $stdDest->CNPJ = $doc;
        } else {
            $stdDest->CPF = $doc;
        }
        $nfe->tagdest($stdDest);

        // Endereço Destinatário
        $stdEnderDest = new \stdClass();
        $stdEnderDest->xLgr = 'AVENIDA AUTOMOVEL CLUBE';
        $stdEnderDest->nro = '1500';
        $stdEnderDest->xBairro = 'CENTRO';
        $stdEnderDest->cMun = 3300456;
        $stdEnderDest->xMun = 'BELFORD ROXO';
        $stdEnderDest->UF = 'RJ';
        $stdEnderDest->CEP = '26110000';
        $stdEnderDest->cPais = 1058;
        $stdEnderDest->xPais = 'BRASIL';
        $nfe->tagenderDest($stdEnderDest);

        // 4. Tag <det> e <prod> (Itens da Nota)
        $itemCount = 1;
        $vTotalProdutos = 0.00;

        foreach ($dadosEmissao['itens'] as $item) {
            $stdProd = new \stdClass();
            $stdProd->item = $itemCount++;
            $stdProd->cProd = 'COMP-TERM-10K'; // Mockado por enquanto
            $stdProd->cEAN = 'SEM GTIN';
            $stdProd->xProd = 'SENSOR DE TEMPERATURA TERMISTOR NTC 10K';
            $stdProd->NCM = '90251990';
            $stdProd->CFOP = '5102';
            $stdProd->uCom = 'UN';
            $stdProd->qCom = $item['quantidade'] ?? 1.0000;
            $stdProd->vUnCom = $item['valor_unitario'] ?? 18.50;
            $stdProd->vProd = $stdProd->qCom * $stdProd->vUnCom;
            $stdProd->cEANTrib = 'SEM GTIN';
            $stdProd->uTrib = 'UN';
            $stdProd->qTrib = $stdProd->qCom;
            $stdProd->vUnTrib = $stdProd->vUnCom;
            $stdProd->indTot = 1; // Compõe valor total da NF

            $vTotalProdutos += $stdProd->vProd;
            $nfe->tagprod($stdProd);

            // Tributos (ICMS 00 - Tributado Integralmente)
            $stdImposto = new \stdClass();
            $stdImposto->item = $stdProd->item;
            $nfe->tagimposto($stdImposto);

            $stdICMS = new \stdClass();
            $stdICMS->item = $stdProd->item;
            $stdICMS->orig = 0;
            $stdICMS->CST = '00';
            $stdICMS->modBC = 3;
            $stdICMS->vBC = $stdProd->vProd;
            $stdICMS->pICMS = 18.00;
            $stdICMS->vICMS = round($stdICMS->vBC * ($stdICMS->pICMS / 100), 2);
            $nfe->tagICMS($stdICMS);
        }

        // 5. Totais e Fechamento
        $stdTot = new \stdClass();
        $stdTot->vBC = $vTotalProdutos;
        $stdTot->vICMS = round($vTotalProdutos * 0.18, 2);
        $stdTot->vICMSDeson = 0.00;
        $stdTot->vFCP = 0.00;
        $stdTot->vBCST = 0.00;
        $stdTot->vST = 0.00;
        $stdTot->vFCPST = 0.00;
        $stdTot->vFCPSTRet = 0.00;
        $stdTot->vProd = $vTotalProdutos;
        $stdTot->vFrete = 0.00;
        $stdTot->vSeg = 0.00;
        $stdTot->vDesc = 0.00;
        $stdTot->vII = 0.00;
        $stdTot->vIPI = 0.00;
        $stdTot->vIPIDevol = 0.00;
        $stdTot->vPIS = 0.00;
        $stdTot->vCOFINS = 0.00;
        $stdTot->vOutro = 0.00;
        $stdTot->vNF = $vTotalProdutos;
        $nfe->tagICMSTot($stdTot);

        // Pagamento
        $stdPag = new \stdClass();
        $nfe->tagpag($stdPag);

        $stdDetPag = new \stdClass();
        $stdDetPag->tPag = '15'; // Boleto Bancario
        $stdDetPag->vPag = $vTotalProdutos;
        $stdDetPag->indPag = 1; // A Prazo
        $nfe->tagdetPag($stdDetPag);

        // Gera o XML String
        if (!$nfe->montaNFe()) {
            throw new \Exception("Erro ao gerar XML da NFe: " . json_encode($nfe->getErrors()));
        }
        $xmlNãoAssinado = $nfe->getXML();

        // 6. A Mágica Final: Assinatura Criptográfica
        $xmlAssinado = $this->tools->signNFe($xmlNãoAssinado);

        // TODO: Enviar para SEFAZ -> $this->tools->sefazEnviaLote([$xmlAssinado], 1);

        $documentoFiscal = new DocumentoFiscal();
        $documentoFiscal->xml_assinado = $xmlAssinado;
        $documentoFiscal->status = 'PROCESSANDO_ASSINATURA_OK';

        return $documentoFiscal;
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return true; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return true; }
}
