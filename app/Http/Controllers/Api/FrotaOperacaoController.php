<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Frota\FrotaOperacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FrotaOperacaoController extends Controller
{
    public function storeAbastecimento(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id
                  ?? Empresa::first()->id;

        $validated = $request->validate([
            'veiculo_id' => 'required|uuid|exists:fro_veiculos,id',
            'motorista_id' => 'required|uuid|exists:pes_pessoas,id', // O motorista
            'posto_id' => 'required|uuid|exists:pes_pessoas,id', // O fornecedor
            'data_abastecimento' => 'required|date',
            'km_marcador' => 'required|numeric|min:0',
            'litros' => 'required|numeric|min:0.01',
            'valor_total' => 'required|numeric|min:0.01',
            'tipo_combustivel_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
        ]);

        try {
            $abastecimentoId = FrotaOperacaoService::registrarAbastecimento($validated, $tenantId, $empresaId);

            return response()->json([
                'data' => [
                    'message' => 'Abastecimento registrado com sucesso! Integrações financeiras e preventivas processadas.',
                    'abastecimento_id' => $abastecimentoId
                ]
            ], 201);

        } catch (\Throwable $e) {
            // Devolve o erro mastigado pro React se a regra de negócio barrar (ex: KM menor que o atual)
            return response()->json([
                'error' => [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 422);
        }
    }
}
