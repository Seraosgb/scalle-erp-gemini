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
        // 1. Validação mais flexível para aceitar dados do Parser OFX sem barrar
        $validated = $request->validate([
            'conta_financeira_id' => 'required',
            'plano_conta_id' => 'required',
            'centro_custo_id' => 'required',
            'descricao' => 'required|string|max:200',
            'valor' => 'required|numeric|min:0.01',
            'natureza' => 'required|string|in:PAGAR,RECEBER',
            'data_transacao' => 'required|date',
            'id_transacao_banco' => 'required',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()->id;

        try {
            $titulo = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $tenantId, $empresaId) {

                // 2. Cria ou recupera uma Pessoa Genérica para não quebrar a Foreign Key do BD
                $pessoaPadrao = \App\Models\Pessoa::firstOrCreate(
                    ['tenant_id' => $tenantId, 'cpf_cnpj' => '00000000000000'],
                    [
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'tipo_pessoa' => 'PJ',
                        'nome_razao_social' => 'Operações Bancárias / Avulsos',
                        'is_fornecedor' => true,
                        'is_ativo' => true
                    ]
                );

                // 3. Usa forceFill para injetar direto no banco ignorando proteções de $fillable do Model
                $novoTitulo = new \App\Models\TituloFinanceiro();
                $novoTitulo->forceFill([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'pessoa_id' => $pessoaPadrao->id, // Pessoa garantida!
                    'plano_conta_id' => $validated['plano_conta_id'],
                    'centro_custo_id' => $validated['centro_custo_id'],
                    'natureza' => $validated['natureza'],
                    'documento_numero' => 'OFX-' . substr((string)$validated['id_transacao_banco'], -8),
                    'parcela_numero' => 1,
                    'total_parcelas' => 1,
                    'data_emissao' => $validated['data_transacao'],
                    'data_vencimento' => $validated['data_transacao'],
                    'valor_original' => $validated['valor'],
                    'valor_saldo_aberto' => 0,
                    'valor_pago_acumulado' => $validated['valor'],
                    'status' => 'LIQUIDADO',
                    'data_liquidacao' => $validated['data_transacao'],
                    'historico' => 'Conciliação OFX: ' . $validated['descricao'],
                ]);
                $novoTitulo->save();

                // 4. Atualiza o saldo da conta
                $conta = \App\Models\ContaFinanceira::findOrFail($validated['conta_financeira_id']);
                $tipoMov = $validated['natureza'] === 'PAGAR' ? 'SAIDA' : 'ENTRADA';

                $conta->update([
                    'saldo_atual' => $tipoMov === 'ENTRADA'
                        ? $conta->saldo_atual + $validated['valor']
                        : $conta->saldo_atual - $validated['valor']
                ]);

                return $novoTitulo;
            });

            return response()->json(['data' => ['message' => 'Lançamento avulso criado e conciliado com sucesso!', 'titulo' => $titulo]]);
        } catch (\Exception $e) {
            return response()->json(['error' => ['message' => 'Erro interno ao salvar: ' . $e->getMessage()]], 422);
        }
    }
}
