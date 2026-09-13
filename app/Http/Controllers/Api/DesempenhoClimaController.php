<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\App;
use Exception;
use App\Models\EnpsCampanha;
use App\Models\EnpsResposta;
use App\Models\NineboxEixo;
use App\Models\AvaliacaoDesempenho;
use App\Models\Pdi;

class DesempenhoClimaController extends Controller
{
    // ==========================================
    // eNPS - PESQUISA DE CLIMA
    // ==========================================
    public function storeCampanha(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $empresaId = $request->user()->empresa_padrao_id
                      ?? \App\Models\Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->first()?->id;

            App::instance('current_tenant_id', $tenantId);
            if ($empresaId) App::instance('current_empresa_id', $empresaId);

            $validated = $request->validate([
                'titulo' => 'required|string|max:150',
                'data_inicio' => 'required|date',
                'data_fim' => 'required|date|after_or_equal:data_inicio',
            ]);

            $campanha = EnpsCampanha::withoutGlobalScopes()->create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'titulo' => $validated['titulo'],
                'data_inicio' => $validated['data_inicio'],
                'data_fim' => $validated['data_fim'],
                'status' => 'ATIVA',
            ]);

            return response()->json(['data' => $campanha], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Campanha: ' . $e->getMessage()]], 500);
        }
    }

    public function responderEnps(Request $request, string $campanhaId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nota' => 'required|integer|min:0|max:10',
                'comentario' => 'nullable|string',
            ]);

            $campanha = EnpsCampanha::withoutGlobalScopes()->findOrFail($campanhaId);

            if ($campanha->status !== 'ATIVA') {
                return response()->json(['error' => ['message' => 'Esta campanha de eNPS já foi encerrada.']], 403);
            }

            EnpsResposta::create([
                'id' => (string) Str::uuid(),
                'campanha_id' => $campanha->id,
                'nota' => $validated['nota'],
                'comentario' => $validated['comentario'] ?? null,
            ]);

            return response()->json(['data' => ['message' => 'Resposta computada anonimamente com sucesso!']]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Resposta: ' . $e->getMessage()]], 500);
        }
    }

    public function resultadosEnps(Request $request, string $campanhaId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $campanha = EnpsCampanha::withoutGlobalScopes()->where('tenant_id', $tenantId)->findOrFail($campanhaId);

            $totalRespostas = EnpsResposta::where('campanha_id', $campanha->id)->count();

            // REGRA DE OURO: Proteção de Anonimato
            if ($totalRespostas < 5) {
                return response()->json([
                    'error' => [
                        'message' => 'Dados insuficientes para preservar o anonimato. É necessário um mínimo de 5 respostas para visualizar o relatório.',
                        'code' => 'ANONIMATO_PROTEGIDO'
                    ]
                ], 403);
            }

            $promotores = EnpsResposta::where('campanha_id', $campanha->id)->whereBetween('nota', [9, 10])->count();
            $detratores = EnpsResposta::where('campanha_id', $campanha->id)->whereBetween('nota', [0, 6])->count();

            $scoreEnps = (($promotores - $detratores) / $totalRespostas) * 100;

            $comentarios = EnpsResposta::where('campanha_id', $campanha->id)->whereNotNull('comentario')->pluck('comentario');

            return response()->json([
                'data' => [
                    'campanha' => $campanha->titulo,
                    'total_respostas' => $totalRespostas,
                    'score_enps' => round($scoreEnps, 2),
                    'comentarios' => $comentarios
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Resultados: ' . $e->getMessage()]], 500);
        }
    }

    // ==========================================
    // NINE-BOX & PDI - AVALIAÇÃO DE DESEMPENHO
    // ==========================================
    public function storeEixo(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::withoutGlobalScopes()->where('tenant_id', $tenantId)->first()?->id;

            App::instance('current_tenant_id', $tenantId);
            if ($empresaId) App::instance('current_empresa_id', $empresaId);

            $validated = $request->validate([
                'tipo' => 'required|string|in:X,Y',
                'nome' => 'required|string|max:100',
                'descricao' => 'nullable|string',
            ]);

            $eixo = NineboxEixo::withoutGlobalScopes()->create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'tipo' => $validated['tipo'],
                'nome' => $validated['nome'],
                'descricao' => $validated['descricao'] ?? null,
            ]);

            return response()->json(['data' => $eixo], 201);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro Backend Eixo: ' . $e->getMessage()]], 500);
        }
    }
}
