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
        $faturamentoHoje = PedidoVenda::where('status', 'FATURADO')
            ->whereDate('data_emissao', now()->toDateString())
            ->sum('valor_total_liquido') ?? 0.00;

        $faturamentoMes = PedidoVenda::where('status', 'FATURADO')
            ->whereMonth('data_emissao', now()->month)
            ->whereYear('data_emissao', now()->year)
            ->sum('valor_total_liquido') ?? 0.00;

        $totalAReceber = TituloFinanceiro::where('natureza', 'RECEBER')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto') ?? 0.00;

        $totalAPagar = TituloFinanceiro::where('natureza', 'PAGAR')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto') ?? 0.00;

        $osAbertas = OrdemServico::where('status', 'ABERTA')->count();
        $osEmAndamento = OrdemServico::where('status', 'EM_ANDAMENTO')->count();
        $osConcluidasMes = OrdemServico::where('status', 'CONCLUIDA')
            ->whereMonth('data_conclusao', now()->month)
            ->count();

        $totalNfeEmitidas = DocumentoFiscal::where('status', 'AUTORIZADO')
            ->whereMonth('data_emissao', now()->month)
            ->count();

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
                'os_abertas' => (int) $osAbertas,
                'os_em_andamento' => (int) $osEmAndamento,
                'os_concluidas_mes' => (int) $osConcluidasMes,
                'total_nfe_emitidas' => (int) $totalNfeEmitidas,
                'itens_estoque_baixo' => $itensEstoqueBaixo,
            ]
        ]);
    }
}