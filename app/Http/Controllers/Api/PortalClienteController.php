<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrdemServico;
use App\Services\OrdemServicoService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalClienteController extends Controller
{
    /**
     * Consulta pública segura de OS restrita por Token Temporário
     */
    public function consultarOs(string $token): JsonResponse
    {
        $os = OrdemServico::withoutGlobalScopes()
            ->with(['cliente', 'empresa', 'itens.item', 'fotos'])
            ->where('id', $token)
            ->firstOrFail();

        return response()->json([
            'data' => [
                'numero_os' => $os->numero_os,
                'status' => $os->status,
                'equipamento' => $os->equipamento_descricao,
                'marca_modelo' => $os->equipamento_marca_modelo,
                'defeito_reclamado' => $os->defeito_reclamado,
                'laudo_tecnico' => $os->laudo_tecnico,
                'valor_total' => (float) $os->valor_total,
                'nome_responsavel' => $os->nome_responsavel_assinatura,
                'data_abertura' => $os->data_abertura,
                'data_conclusao' => $os->data_conclusao,
                'itens' => $os->itens,
                'empresa' => [
                    'nome' => $os->empresa->nome_fantasia,
                    'documento' => $os->empresa->cnpj,
                ]
            ]
        ]);
    }
}