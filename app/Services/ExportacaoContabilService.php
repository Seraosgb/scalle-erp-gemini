<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Item;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
use App\Models\TituloFinanceiro;
use Carbon\Carbon;
use Exception;

class ExportacaoContabilService
{
    /**
     * Gera o arquivo TXT no formato Domínio Sistemas (Lançamentos Contábeis)
     */
    public static function gerarDominioSistemas(string $tenantId, string $empresaId, string $dataInicio, string $dataFim): string
    {
        $empresa = Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($empresaId);

        $titulosLiquidados = TituloFinanceiro::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'LIQUIDADO')
            ->whereBetween('data_liquidacao', [$dataInicio, $dataFim])
            ->with(['pessoa', 'contaPadrao'])
            ->orderBy('data_liquidacao')
            ->get();

        $linhas = [];

        foreach ($titulosLiquidados as $titulo) {
            $data = Carbon::parse($titulo->data_liquidacao)->format('d/m/Y');
            $debito = ($titulo->natureza === 'RECEBER') ? '1.1.01.01' : '2.1.01.01';
            $credito = ($titulo->natureza === 'RECEBER') ? '3.1.01.01' : '1.1.01.01';
            $valor = number_format((float) $titulo->valor_pago_acumulado, 2, ',', '');
            $historico = strtoupper(substr("LIQUIDACAO {$titulo->natureza} DOC: {$titulo->documento_numero} - {$titulo->pessoa?->nome_razao_social}", 0, 100));

            // Layout Domínio Sistemas: DATA | DEBITO | CREDITO | VALOR | COD_HISTORICO | HISTORICO
            $linhas[] = "{$data}|{$debito}|{$credito}|{$valor}||{$historico}";
        }

        return implode("\r\n", $linhas);
    }

    /**
     * Gera o arquivo TXT no formato SPED Fiscal ICMS/IPI (Blocos 0, C, E e 9)
     */
    public static function gerarSpedFiscal(string $tenantId, string $empresaId, string $dataInicio, string $dataFim): string
    {
        $empresa = Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($empresaId);
        $dtIniSped = Carbon::parse($dataInicio)->format('dmY');
        $dtFimSped = Carbon::parse($dataFim)->format('dmY');

        $linhas = [];

        // --- BLOCO 0: ABERTURA E IDENTIFICAÇÃO ---
        $linhas[] = "|0000|018|0|{$dtIniSped}|{$dtFimSped}|" . strtoupper($empresa->razao_social) . "|" . preg_replace('/[^0-9]/', '', $empresa->cnpj) . "||RJ|" . ($empresa->inscricao_estadual ?? 'ISENTO') . "|||A|1|";
        $linhas[] = "|0001|0|";
        $linhas[] = "|0005|" . strtoupper($empresa->nome_fantasia) . "|26110000|AVENIDA AUTOMOVEL CLUBE|1500||CENTRO|21999999999||contato@scalle.com.br|";
        $linhas[] = "|0100|CONTADOR RESPONSAVEL|00000000000|000000/O-0|00000000000|26110000|RUA PRINCIPAL|100||CENTRO|21999999999||contador@scalle.com.br|3300456|";

        // Participantes (Pessoas)
        $pessoas = Pessoa::withoutGlobalScopes()->where('tenant_id', $tenantId)->get();
        foreach ($pessoas as $p) {
            $doc = preg_replace('/[^0-9]/', '', $p->cpf_cnpj);
            $tipoDoc = strlen($doc) === 14 ? "{$doc}||" : "|{$doc}|";
            $linhas[] = "|0150|{$p->id}|" . strtoupper($p->nome_razao_social) . "|1058|{$tipoDoc}||3300456||RUA PRINCIPAL|100||CENTRO|";
        }

        // Catálogo de Itens
        $itens = Item::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('tipo_item', '!=', 'SERVICO')->get();
        foreach ($itens as $it) {
            $linhas[] = "|0200|{$it->codigo_sku}|" . strtoupper($it->nome) . "|" . ($it->codigo_barras_ean ?? '') . "||{$it->unidade_medida}|00|" . ($it->ncm ?? '00000000') . "|||||";
        }

        $linhas[] = "|0990|" . (count($linhas) + 1) . "|";

        // --- BLOCO C: DOCUMENTOS FISCAIS DE MERCADORIAS ---
        $blocoC = [];
        $blocoC[] = "|C001|0|";

        $docsFiscais = DocumentoFiscal::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'AUTORIZADO')
            ->whereBetween('data_emissao', [$dataInicio, $dataFim])
            ->with(['destinatario'])
            ->get();

        foreach ($docsFiscais as $doc) {
            $dtDoc = Carbon::parse($doc->data_emissao)->format('dmY');
            $vlrDoc = number_format((float) $doc->valor_total_documento, 2, ',', '');
            $vlrIcms = number_format((float) $doc->valor_icms, 2, ',', '');
            $vlrPis = number_format((float) $doc->valor_pis, 2, ',', '');
            $vlrCofins = number_format((float) $doc->valor_cofins, 2, ',', '');

            $blocoC[] = "|C100|1|0|{$doc->destinatario_id}|{$doc->modelo_documento}|00|{$doc->serie}|{$doc->numero_documento}|{$doc->chave_acesso}|{$dtDoc}|{$dtDoc}|{$vlrDoc}|1|0,00|0,00|{$vlrDoc}|0|0,00|0,00|0,00|{$vlrDoc}|{$vlrIcms}|0,00|0,00|{$vlrPis}|{$vlrCofins}|0,00|0,00|";
        }

        $blocoC[] = "|C990|" . (count($blocoC) + 1) . "|";
        $linhas = array_merge($linhas, $blocoC);

        // --- BLOCO E: APURAÇÃO DO ICMS ---
        $blocoE = [];
        $blocoE[] = "|E001|0|";
        $blocoE[] = "|E100|{$dtIniSped}|{$dtFimSped}|";
        $blocoE[] = "|E110|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|";
        $blocoE[] = "|E990|" . (count($blocoE) + 1) . "|";
        $linhas = array_merge($linhas, $blocoE);

        // --- BLOCO 9: TOTALIZADORES DO ARQUIVO ---
        $bloco9 = [];
        $bloco9[] = "|9001|0|";
        $bloco9[] = "|9900|0000|1|";
        $bloco9[] = "|9900|C100|" . count($docsFiscais) . "|";
        $bloco9[] = "|9990|" . (count($bloco9) + 2) . "|";
        
        $totalRegistros = count($linhas) + count($bloco9) + 1;
        $bloco9[] = "|9999|{$totalRegistros}|";
        $linhas = array_merge($linhas, $bloco9);

        return implode("\r\n", $linhas);
    }

    /**
     * Gera CSV Analítico dos Lançamentos Financeiros e DRE
     */
    public static function gerarCsvFinanceiro(string $tenantId, string $empresaId, string $dataInicio, string $dataFim): string
    {
        $titulos = TituloFinanceiro::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->whereBetween('data_emissao', [$dataInicio, $dataFim])
            ->with(['pessoa', 'contaPadrao'])
            ->orderBy('data_vencimento')
            ->get();

        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['Documento', 'Natureza', 'Pessoa/Cliente/Fornecedor', 'CPF/CNPJ', 'Emissao', 'Vencimento', 'Liquidacao', 'Valor Original', 'Desconto', 'Valor Pago', 'Saldo Aberto', 'Status', 'Historico'], ';');

        foreach ($titulos as $t) {
            fputcsv($output, [
                $t->documento_numero,
                $t->natureza,
                $t->pessoa?->nome_razao_social,
                $t->pessoa?->cpf_cnpj,
                $t->data_emissao,
                $t->data_vencimento,
                $t->data_liquidacao ?? '-',
                number_format((float) $t->valor_original, 2, ',', '.'),
                number_format((float) $t->valor_desconto, 2, ',', '.'),
                number_format((float) $t->valor_pago_acumulado, 2, ',', '.'),
                number_format((float) $t->valor_saldo_aberto, 2, ',', '.'),
                $t->status,
                $t->historico ?? '',
            ], ';');
        }

        rewind($output);
        $csvConteudo = stream_get_contents($output);
        fclose($output);

        return $csvConteudo;
    }
}