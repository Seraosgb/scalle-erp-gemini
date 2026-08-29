<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmFunil;
use App\Models\CrmOportunidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CrmController extends Controller
{
    // Retorna o Board Completo (Funil + Etapas + Cards)
    public function board(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $funil = CrmFunil::where('tenant_id', $tenantId)
            ->with(['etapas.oportunidades' => function ($q) {
                $q->where('status', 'ABERTO')->with(['vendedor:id,name', 'cliente:id,nome_razao_social']);
            }])
            ->first();

        // Auto-provisionamento de Funil Padrão se o cliente não tiver
        if (!$funil) {
            $funil = CrmFunil::create([
                'tenant_id' => $tenantId,
                'nome' => 'Funil Comercial Padrão',
                'token_captacao' => Str::random(40),
                'is_padrao' => true,
            ]);

            $etapas = ['Prospecção', 'Qualificação', 'Apresentação', 'Negociação'];
            foreach ($etapas as $i => $nome) {
                $funil->etapas()->create(['nome' => $nome, 'ordem_exibicao' => $i + 1]);
            }
            $funil->load('etapas.oportunidades');
        }

        return response()->json(['data' => $funil]);
    }

    // Move o Card no Drag-and-Drop
    public function moverCard(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'etapa_id_destino' => 'required|uuid|exists:crm_funil_etapas,id',
        ]);

        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);

        $oportunidade->update(['etapa_id' => $validated['etapa_id_destino']]);

        return response()->json(['data' => ['message' => 'Oportunidade movida com sucesso!', 'oportunidade' => $oportunidade]]);
    }
}