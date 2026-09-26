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
            "CSC" => "",
            "CSCid" => ""
        ];

        $jsonConfig = json_encode($this->config);
        $certificado = Certificate::readPfx($certificadoBinario, $senha);

        $this->tools = new Tools($jsonConfig, $certificado);
        $this->tools->model('55'); // Padrão NF-e
        return $this;
    }

    public function verificarStatusSefaz(string $uf, int $tpAmb = 2): array
    {
        try {
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
        try {
            $nfe = new Make();

            // 1. Identificação da NFe (<ide>)
            $stdIde = new \stdClass();
            $stdIde->cUF = 33; // RJ
            $stdIde->cNF = rand(11111111, 99999999);
            $stdIde->natOp = 'Venda de Mercadorias';
            $stdIde->mod = $dadosEmissao['modelo']; // 55 ou 65
            $stdIde->serie = 1;
            $stdIde->nNF = $dadosEmissao['numero'];
            $stdIde->dhEmi = now()->format('Y-m-d\TH:i:sP');
            $stdIde->tpNF = 1; // Saída
            $stdIde->idDest = 1; // Operação Interna
            $stdIde->cMunFG = 3300456; // Belford Roxo
            $stdIde->tpImp = 1; // DANFE Retrato
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
            $stdEmit->xNome = $dadosEmissao['emitente']['razao_social'];
            $stdEmit->xFant = $dadosEmissao['emitente']['nome_fantasia'];
            $stdEmit->IE = 'ISENTO'; // Para testes, assume ISENTO
            $stdEmit->CRT = 1; // Simples Nacional

            // CORREÇÃO: Lê a propriedade "cnpj" ao invés de "documento"
            $stdEmit->CNPJ = preg_replace('/[^0-9]/', '', $dadosEmissao['emitente']['cnpj'] ?? $this->config['cnpj']);
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
            $docDestino = preg_replace('/[^0-9]/', '', $dadosEmissao['destinatario']['cpf_cnpj'] ?? '00000000000');
            if (strlen($docDestino) === 14) $stdDest->CNPJ = $docDestino;
            else if (strlen($docDestino) === 11 && $docDestino !== '00000000000') $stdDest->CPF = $docDestino;

            $stdDest->indIEDest = 9; // Não Contribuinte
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
                $stdProd->NCM = '94039090'; // NCM genérico
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

                // ICMS Simples Nacional
                $stdIcms = new \stdClass();
                $stdIcms->item = $nItem;
                $stdIcms->orig = 0;
                $stdIcms->CSOSN = '102'; // Tributada sem permissão de crédito
                $nfe->tagICMSSN($stdIcms);

                // PIS e COFINS (Zerados para SN)
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
            $stdPag->tPag = '01'; // Dinheiro
            $stdPag->vPag = $totais;
            $nfe->tagpag($stdPag);

            // FINAL: Gera XML, Assina e Cria no Banco
            $xmlString = $nfe->getXML();
            $xmlAssinado = $this->tools->signNFe($xmlString);

            return DocumentoFiscal::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $dadosEmissao['tenant_id'],
                'empresa_id' => $dadosEmissao['empresa_id'],
                'destinatario_id' => $dadosEmissao['destinatario']['id'],
                'modelo_documento' => $dadosEmissao['modelo'],
                'numero_documento' => $dadosEmissao['numero'],
                'serie' => '1',
                'chave_acesso' => $nfe->getChave(),
                'status' => 'PROCESSANDO',
                'xml_conteudo' => $xmlAssinado,
                'data_emissao' => now(),
                'valor_total' => $totais,
            ]);

        } catch (Exception $e) {
            throw new Exception("Erro ao montar XML (NFePHP Make): " . $e->getMessage() . " nas tags: " . implode(', ', $nfe->getErrors()));
        }
    }

    public function cancelar(string $chaveAcesso, string $justificativa): bool { return false; }
    public function consultar(string $chaveAcesso): array { return []; }
    public function corrigir(string $chaveAcesso, string $correcao): bool { return false; }
}
