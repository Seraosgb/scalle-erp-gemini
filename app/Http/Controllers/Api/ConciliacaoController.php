<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TituloFinanceiro;
use App\Services\OfxParserService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConciliacaoController extends Controller
{
    public function processarOfx(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo_ofx' => 'required|file',
            'conta_financeira_id' => 'required|uuid|exists:fin_contas_financeiras,id',
        ]);

        $tenantId = $request->user()->tenant_id;

        try {
            // 1. Lê e faz o Parse do Arquivo
            $conteudo = file_get_contents($request->file('arquivo_ofx')->getRealPath());
            $transacoesBanco = OfxParserService::parse($conteudo);

            // 2. Busca Títulos Financeiros em Aberto no ERP
            $titulosAbertos = TituloFinanceiro::where('tenant_id', $tenantId)
                ->whereIn('status', ['ABERTO', 'PARCIAL'])
                ->with('pessoa')
                ->get();

            // 3. Motor de Sugestão (Matching Inteligente)
            foreach ($transacoesBanco as &$transacao) {
                $transacao['sugestoes'] = [];
                $transacao['status_conciliacao'] = 'PENDENTE';

                foreach ($titulosAbertos as $titulo) {
                    // Regra de Match 1: Mesma Natureza e Mesmo Valor Exato
                    if ($titulo->natureza === $transacao['natureza'] && round($titulo->valor_saldo_aberto, 2) === round($transacao['valor'], 2)) {
                        $transacao['sugestoes'][] = $titulo;
                    }
                }

                // Se encontrou sugestões, ordena para colocar no topo as que têm data de vencimento mais próxima da transação
                if (!empty($transacao['sugestoes'])) {
                    usort($transacao['sugestoes'], function($a, $b) use ($transacao) {
                        $diffA = abs(strtotime($a->data_vencimento) - strtotime($transacao['data']));
                        $diffB = abs(strtotime($b->data_vencimento) - strtotime($transacao['data']));
                        return $diffA <=> $diffB;
                    });
                }
            }

            return response()->json([
                'data' => [
                    'message' => 'Arquivo OFX processado com sucesso!',
                    'conta_financeira_id' => $request->conta_financeira_id,
                    'total_transacoes_lidas' => count($transacoesBanco),
                    'extrato_processado' => $transacoesBanco,
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'OFX_PARSE_ERROR',
                    'message' => 'Falha ao ler o arquivo OFX. Verifique se o formato exportado pelo banco é válido. Detalhes: ' . $e->getMessage()
                ]
            ], 422);
        }
    }
}
