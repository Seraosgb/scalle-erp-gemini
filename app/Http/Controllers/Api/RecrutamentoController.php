<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\Vaga;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\App;
use Exception;
use App\Models\RecrutamentoEtapa;

class RecrutamentoController extends Controller
{
    public function indexVagas(Request $request): JsonResponse
    {
        try {
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
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro ao listar vagas: ' . $e->getMessage()]], 500);
        }
    }

    public function storeVaga(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $empresaId = $request->user()->empresa_padrao_id
                      ?? \App\Models\Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->first()?->id
                      ?? \App\Models\Empresa::withoutGlobalScopes()->first()?->id;

            App::instance('current_tenant_id', $tenantId);
            if ($empresaId) {
                App::instance('current_empresa_id', $empresaId);
            }

            $validated = $request->validate([
                'titulo' => 'required|string|max:150',
                'departamento' => 'required|string|max:100',
                'descricao' => 'nullable|string',
            ]);

            $vaga = Vaga::withoutGlobalScopes()->create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'titulo' => $validated['titulo'],
                'departamento' => $validated['departamento'],
                'status' => 'ABERTA',
                'descricao' => $validated['descricao'] ?? null,
            ]);

            return response()->json(['data' => $vaga], 201);

        } catch (Exception $e) {
            // A MÁGICA: O erro exato do banco de dados (ex: coluna não encontrada, syntax error) vai aparecer na sua tela!
            return response()->json(['error' => ['message' => 'Erro Backend Vaga: ' . $e->getMessage()]], 500);
        }
    }

    // --- MÉTODOS DE ETAPAS E KANBAN ---
    public function indexEtapas(Request $request): JsonResponse
    {
        $etapas = RecrutamentoEtapa::where('tenant_id', $request->user()->tenant_id)
            ->orderBy('ordem')->get();
        return response()->json(['data' => $etapas]);
    }

    public function storeEtapa(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'nome' => 'required|string|max:50',
            'cor' => 'required|string|max:30',
            'ordem' => 'required|integer',
        ]);

        $etapa = RecrutamentoEtapa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => $validated['nome'],
            'cor' => $validated['cor'],
            'ordem' => $validated['ordem'],
        ]);
        return response()->json(['data' => $etapa], 201);
    }

    public function destroyEtapa(Request $request, string $id): JsonResponse
    {
        $etapa = RecrutamentoEtapa::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);
        $etapa->delete();
        return response()->json(['message' => 'Etapa removida com sucesso.']);
    }

    public function boardKanban(Request $request, string $vagaId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $vaga = Vaga::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($vagaId);
            $etapas = RecrutamentoEtapa::where('tenant_id', $tenantId)->orderBy('ordem')->get();

            $candidatos = Candidato::withoutGlobalScopes()
                ->where('vaga_id', $vaga->id)
                ->orderByDesc('created_at')
                ->get()
                ->groupBy('etapa_id');

            return response()->json([
                'data' => [
                    'vaga' => $vaga,
                    'etapas' => $etapas,
                    'kanban' => $candidatos
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro ao carregar Kanban: ' . $e->getMessage()]], 500);
        }
    }

    public function storeCandidato(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            App::instance('current_tenant_id', $tenantId);

            $validated = $request->validate([
                'vaga_id' => 'required|uuid|exists:rh_vagas,id',
                'nome' => 'required|string|max:150',
                'email' => 'nullable|email|max:150',
                'telefone' => 'nullable|string|max:30',
            ]);

            $primeiraEtapa = RecrutamentoEtapa::where('tenant_id', $tenantId)->orderBy('ordem')->first();

            $candidato = Candidato::withoutGlobalScopes()->create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'vaga_id' => $validated['vaga_id'],
                'nome' => $validated['nome'],
                'email' => $validated['email'] ?? null,
                'telefone' => $validated['telefone'] ?? null,
                'etapa_id' => $primeiraEtapa ? $primeiraEtapa->id : null,
            ]);

            return response()->json(['data' => $candidato], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Candidato: ' . $e->getMessage()]], 500);
        }
    }

    public function moverCandidato(Request $request, string $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            App::instance('current_tenant_id', $tenantId);

            $candidato = Candidato::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($id);

            $validated = $request->validate([
                'nova_etapa_id' => 'required|uuid|exists:rh_recrutamento_etapas,id',
            ]);

            $candidato->update(['etapa_id' => $validated['nova_etapa_id']]);

            return response()->json(['data' => ['message' => 'Candidato movido com sucesso!']]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Mover: ' . $e->getMessage()]], 500);
        }
    }
}
