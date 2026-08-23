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
use Illuminate\Support\Str;

class FinanceiroController extends Controller
{
    public function titulos(Request $request): JsonResponse
    {
        $query = TituloFinanceiro::with(['pessoa', 'contaPadrao']);

        if ($request->filled('natureza')) {
            $query->where('natureza', $request->get('natureza'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $titulos = $query->orderBy('data_vencimento')->paginate(15);

        return response()->json($titulos);
    }

    public function contas(): JsonResponse
    {
        $contas = ContaFinanceira::where('is_ativo', true)->orderBy('nome')->get();
        return response()->json(['data' => $contas]);
    }

    public function extrato(string $contaId): JsonResponse
    {
        $movimentos = MovimentacaoExtrato::where('conta_financeira_id', $contaId)
            ->with('titulo')
            ->orderByDesc('data_movimento')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $movimentos]);
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
}