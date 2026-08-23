<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            ->sum('valor_total_liquido');

        $recebimentosPendentes = TituloFinanceiro::where('natureza', 'RECEBER')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto');

        $pagamentosPendentes = TituloFinanceiro::where('natureza', 'PAGAR')
            ->whereIn('status', ['ABERTO', 'PARCIAL'])
            ->sum('valor_saldo_aberto');

        $osEmAberto = OrdemServico::whereIn('status', ['ABERTA', 'EM_ANDAMENTO'])->count();

        return response()->json([
            'data' => [
                'faturamento_hoje' => (float) $faturamentoHoje,
                'total_a_receber' => (float) $recebimentosPendentes,
                'total_a_pagar' => (float) $pagamentosPendentes,
                'os_ativas' => $osEmAberto,
            ]
        ]);
    }
}