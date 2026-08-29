<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmFunil;
use App\Models\CrmOportunidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmInboundController extends Controller
{
    public function receberLead(Request $request, string $token): JsonResponse
    {
        // Encontra o Funil pelo Token Público (sem Sanctum)
        $funil = CrmFunil::withoutGlobalScopes()
            ->where('token_captacao', $token)
            ->where('is_ativo', true)
            ->first();

        if (!$funil) {
            return response()->json(['error' => 'Token de integração inválido ou funil inativo.'], 401);
        }

        // Pega a primeira etapa do funil (Entrada)
        $primeiraEtapa = $funil->etapas()->orderBy('ordem_exibicao')->first();

        if (!$primeiraEtapa) {
            return response()->json(['error' => 'O funil não possui etapas configuradas.'], 422);
        }

        $validated = $request->validate([
            'nome' => 'required|string|max:150',
            'email' => 'nullable|email|max:150',
            'telefone' => 'nullable|string|max:30',
            'assunto' => 'nullable|string|max:200',
            'origem' => 'nullable|string|max:100',
            'mensagem' => 'nullable|string',
        ]);

        $oportunidade = CrmOportunidade::create([
            'tenant_id' => $funil->tenant_id,
            'funil_id' => $funil->id,
            'etapa_id' => $primeiraEtapa->id,
            'titulo' => $validated['assunto'] ?? "Novo Lead: {$validated['nome']}",
            'nome_contato' => $validated['nome'],
            'email_contato' => $validated['email'] ?? null,
            'telefone_contato' => $validated['telefone'] ?? null,
            'observacoes' => $validated['mensagem'] ?? null,
            'origem_lead' => $validated['origem'] ?? 'API_WEBHOOK',
        ]);

        return response()->json(['data' => ['success' => true, 'message' => 'Lead capturado e inserido no funil!']], 201);
    }
}