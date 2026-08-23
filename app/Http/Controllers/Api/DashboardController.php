<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoFiscal;
use App\Models\EstoqueDeposito;
use App\Models\OrdemServico;
use App\Models\PedidoVenda;
use App\Models\TituloFinanceiro;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function metricas(): JsonResponse
    {
        // 1. Faturamento de Vendas (Hoje e Mês Atual)
        $faturamentoHoje = PedidoVenda::where('status', 'FATURADO')
            ->whereDate('data_emissao', now()->toDateString())
            ->sum('valor_total_liquido');

        $faturamentoMes = PedidoVenda::where('status', 'FATURADO')
            ->whereMonth('data_emissao', now()->month)
            ->whereYear('data_emissao', now()->year)
            ->sum('valor_total_liquido');

        // 2. Saúde Financeira (A Receber vs A Pagar)
        $totalAReceber = TituloFinanceiro::where('natureza', 'RECEBER')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto');

        $totalAPagar = TituloFinanceiro::where('natureza', 'PAGAR')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto');

        // 3. Ordens de Serviço Ativas
        $osAbertas = OrdemServico::where('status', 'ABERTA')->count();
        $osEmAndamento = OrdemServico::where('status', 'EM_ANDAMENTO')->count();
        $osConcluidasMes = OrdemServico::where('status', 'CONCLUIDA')
            ->whereMonth('data_conclusao', now()->month)
            ->count();

        // 4. Documentos Fiscais Emitidos no Mês
        $totalNfeEmitidas = DocumentoFiscal::where('status', 'AUTORIZADO')
            ->whereMonth('data_emissao', now()->month)
            ->count();

        // 5. Itens com Estoque Crítico / Baixo (Saldo <= 5)
        $itensEstoqueBaixo = EstoqueDeposito::where('quantidade_saldo', '<=', 5.0000)
            ->with(['item', 'deposito'])
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'faturamento_hoje' => (float) $faturamentoHoje,
                'faturamento_mes' => (float) $faturamentoMes,
                'total_a_receber' => (float) $totalAReceber,
                'total_a_pagar' => (float) $totalAPagar,
                'os_abertas' => $osAbertas,
                'os_em_andamento' => $osEmAndamento,
                'os_concluidas_mes' => $osConcluidasMes,
                'total_nfe_emitidas' => $totalNfeEmitidas,
                'itens_estoque_baixo' => $itensEstoqueBaixo,
            ]
        ]);
    }
}