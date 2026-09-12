<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\Vaga;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;

class RecrutamentoController extends Controller
{
    public function indexVagas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $vagas = Vaga::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($vaga) {
                $vaga->candidatos_count = Candidato::withoutGlobalScopes()
                    ->where('vaga_id', $vaga->id)
                    ->count();
                return $vaga;
            });

        return response()->json(['data' => $vagas]);
    }

    public function storeVaga(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $empresaId = $request->user()->empresa_padrao_id
                  ?? \App\Models\Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->first()?->id
                  ?? \App\Models\Empresa::withoutGlobalScopes()->first()?->id;

        // MÁGICA DA BLINDAGEM: Injetar os IDs no App Container para que os Traits não quebrem o request
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresaId);

        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'departamento' => 'required|string|max:100',
            'descricao' => 'nullable|string',
        ]);

        $vaga = Vaga::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'titulo' => $validated['titulo'],
            'departamento' => $validated['departamento'],
            'status' => 'ABERTA',
            'descricao' => $validated['descricao'] ?? null,
        ]);

        return response()->json(['data' => $vaga], 201);
    }

    public function boardKanban(Request $request, string $vagaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $vaga = Vaga::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($vagaId);

        $candidatos = Candidato::withoutGlobalScopes()
            ->where('vaga_id', $vaga->id)
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('etapa_kanban');

        return response()->json([
            'data' => [
                'vaga' => $vaga,
                'kanban' => $candidatos
            ]
        ]);
    }

    public function storeCandidato(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        App::instance('current_tenant_id', $tenantId);

        $validated = $request->validate([
            'vaga_id' => 'required|uuid|exists:rh_vagas,id',
            'nome' => 'required|string|max:150',
            'email' => 'nullable|email|max:150',
            'telefone' => 'nullable|string|max:30',
        ]);

        $candidato = Candidato::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'vaga_id' => $validated['vaga_id'],
            'nome' => $validated['nome'],
            'email' => $validated['email'] ?? null,
            'telefone' => $validated['telefone'] ?? null,
            'etapa_kanban' => 'NOVO',
        ]);

        return response()->json(['data' => $candidato], 201);
    }

    public function moverCandidato(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        App::instance('current_tenant_id', $tenantId);

        $candidato = Candidato::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nova_etapa' => 'required|string|in:NOVO,TRIAGEM,ENTREVISTA,TESTE,PROPOSTA,CONTRATADO,REPROVADO',
        ]);

        $candidato->update(['etapa_kanban' => $validated['nova_etapa']]);

        return response()->json(['data' => ['message' => 'Candidato movido com sucesso!', 'candidato' => $candidato]]);
    }
}
