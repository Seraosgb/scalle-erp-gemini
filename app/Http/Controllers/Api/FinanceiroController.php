<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContaFinanceira;
use App\Models\MovimentacaoExtrato;
use App\Models\TituloFinanceiro;
use App\Services\FinanceiroService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceiroController extends Controller
{
    public function titulos(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = TituloFinanceiro::query()->with(['pessoa', 'contaPadrao']);

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            if ($request->filled('natureza')) {
                $query->where('natureza', $request->get('natureza'));
            }

            if ($request->filled('status')) {
                $query->where('status', $request->get('status'));
            }

            $titulos = $query->orderBy('data_vencimento')->paginate(15);
            return response()->json($titulos);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function contas(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = ContaFinanceira::where('is_ativo', true);

            if ($user && $user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            $contas = $query->orderBy('nome')->get();
            return response()->json(['data' => $contas]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function extrato(string $contaId): JsonResponse
    {
        try {
            $movimentos = MovimentacaoExtrato::where('conta_financeira_id', $contaId)
                ->with('titulo')
                ->orderByDesc('data_movimento')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

            return response()->json(['data' => $movimentos]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function liquidar(Request $request, string $id): JsonResponse
    {
        $titulo = TituloFinanceiro::findOrFail($id);

        $validated = $request->validate([
            'conta_financeira_id' => 'required|uuid|exists:fin_contas_financeiras,id',
            'valor_pago' => 'required|numeric|min:0.01',
            'juros' => 'nullable|numeric|min:0',
            'multa' => 'nullable|numeric|min:0',
            'desconto' => 'nullable|numeric|min:0',
            'forma_pagamento' => 'required|string',
        ]);

        try {
            $tituloLiquidado = FinanceiroService::liquidarTitulo(
                $titulo,
                $validated['conta_financeira_id'],
                (float) $validated['valor_pago'],
                (float) ($validated['juros'] ?? 0.00),
                (float) ($validated['multa'] ?? 0.00),
                (float) ($validated['desconto'] ?? 0.00),
                $validated['forma_pagamento'],
                $request->user()
            );

            return response()->json([
                'data' => [
                    'message' => 'Título liquidado e saldo bancário atualizado!',
                    'titulo' => $tituloLiquidado,
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'FINANCIAL_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }
    public function storeConta(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id
                  ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()?->id;

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'tipo_conta' => 'required|string|in:BANCO,CAIXA,CARTAO_CREDITO',
            'codigo_banco' => 'nullable|string|max:10',
            'agencia' => 'nullable|string|max:20',
            'numero_conta' => 'nullable|string|max:30',
            'saldo_inicial' => 'nullable|numeric',
        ]);

        $saldoInicial = (float) ($validated['saldo_inicial'] ?? 0.00);

        try {
            $conta = ContaFinanceira::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'nome' => $validated['nome'],
                'tipo_conta' => $validated['tipo_conta'],
                'codigo_banco' => $validated['codigo_banco'] ?? null,
                'agencia' => $validated['agencia'] ?? null,
                'numero_conta' => $validated['numero_conta'] ?? null,
                'saldo_inicial' => $saldoInicial,
                'saldo_atual' => $saldoInicial,
                'is_ativo' => true,
            ]);

            return response()->json([
                'data' => [
                    'message' => 'Conta bancária registrada com sucesso!',
                    'conta' => $conta
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro ao criar conta bancária: ' . $e->getMessage()]], 422);
        }
    }
}
