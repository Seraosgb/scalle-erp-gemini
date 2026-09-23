<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TituloFinanceiro;
use App\Models\ContaFinanceira;
use App\Services\OfxParserService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

    public function conciliarManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conta_financeira_id' => 'required|uuid|exists:fin_contas_financeiras,id',
            'plano_conta_id' => 'required|uuid|exists:fin_planos_contas,id',
            'centro_custo_id' => 'required|uuid|exists:fin_centros_custos,id',
            'descricao' => 'required|string|max:200',
            'valor' => 'required|numeric|min:0.01',
            'natureza' => 'required|string|in:PAGAR,RECEBER',
            'data_transacao' => 'required|date',
            'id_transacao_banco' => 'required|string',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()->id;

        try {
            $titulo = DB::transaction(function () use ($validated, $tenantId, $empresaId) {
                // 1. Cria o Título já liquidado amarrado à DRE
                $novoTitulo = TituloFinanceiro::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'plano_conta_id' => $validated['plano_conta_id'],
                    'centro_custo_id' => $validated['centro_custo_id'],
                    'natureza' => $validated['natureza'],
                    'documento_numero' => 'OFX-' . substr($validated['id_transacao_banco'], -8),
                    'parcela_numero' => 1,
                    'total_parcelas' => 1,
                    'data_emissao' => $validated['data_transacao'],
                    'data_vencimento' => $validated['data_transacao'],
                    'valor_original' => $validated['valor'],
                    'valor_saldo_aberto' => 0,
                    'valor_pago_acumulado' => $validated['valor'],
                    'status' => 'LIQUIDADO',
                    'data_liquidacao' => $validated['data_transacao'],
                    'historico' => 'Conciliação Avulsa OFX: ' . $validated['descricao'],
                ]);

                // 2. Atualiza o saldo da conta bancária
                $conta = ContaFinanceira::findOrFail($validated['conta_financeira_id']);
                $tipoMov = $validated['natureza'] === 'PAGAR' ? 'SAIDA' : 'ENTRADA';

                $conta->update([
                    'saldo_atual' => $tipoMov === 'ENTRADA' ? $conta->saldo_atual + $validated['valor'] : $conta->saldo_atual - $validated['valor']
                ]);

                return $novoTitulo;
            });

            return response()->json(['data' => ['message' => 'Lançamento avulso criado e conciliado!', 'titulo' => $titulo]]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }
}
