<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Apontamento;
use App\Models\Etapa;
use App\Models\Projeto;
use App\Models\ProjetoCusto;
use App\Models\ProjetoEquipe;
use App\Models\Tarefa;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TimesheetController extends Controller
{
    public function play(Request $request, string $tarefaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $tarefa = Tarefa::where('tenant_id', $tenantId)->find($tarefaId);
        if (!$tarefa) {
            return response()->json(['error' => ['message' => 'Tarefa não encontrada.']], 404);
        }

        $aberto = Apontamento::where('tarefa_id', $tarefaId)
            ->where('usuario_id', $request->user()->id)
            ->whereNull('fim')
            ->first();

        if ($aberto) {
            return response()->json(['error' => ['message' => 'Você já possui um cronômetro rodando para esta tarefa.']], 422);
        }

        $apontamento = Apontamento::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'tarefa_id' => $tarefaId,
            'usuario_id' => $request->user()->id,
            'inicio' => now(),
            'is_faturavel' => true,
        ]);

        return response()->json(['data' => ['message' => 'Cronômetro iniciado!', 'apontamento' => $apontamento]]);
    }

    public function stop(Request $request, string $tarefaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $apontamento = Apontamento::where('tenant_id', $tenantId)
            ->where('tarefa_id', $tarefaId)
            ->where('usuario_id', $request->user()->id)
            ->whereNull('fim')
            ->firstOrFail();

        $validated = $request->validate([
            'descricao' => 'nullable|string'
        ]);

        $apontamento->update([
            'fim' => now(),
            'descricao' => $validated['descricao'] ?? 'Apontamento finalizado via cronômetro.'
        ]);

        $tarefa = Tarefa::where('tenant_id', $tenantId)->find($tarefaId);
        $projetoId = $tarefa?->projeto_id;

        if (!$projetoId && $tarefa?->etapa_id) {
            $etapa = Etapa::find($tarefa->etapa_id);
            $projetoId = $etapa?->projeto_id;
            if ($projetoId) {
                $tarefa->update(['projeto_id' => $projetoId]);
            }
        }

        $novoCustoTotal = 0.00;
        if ($projetoId) {
            $novoCustoTotal = self::recalcularCustoProjeto($projetoId, $tenantId);
        }

        return response()->json([
            'data' => [
                'message' => 'Cronômetro parado! Custo atual do projeto atualizado para R$ ' . number_format($novoCustoTotal, 2, ',', '.'),
                'apontamento' => $apontamento
            ]
        ]);
    }

    public static function recalcularCustoProjeto(string $projetoId, ?string $tenantId = null): float
    {
        $projeto = Projeto::when($tenantId, fn($q) => $q->where('tenant_id', $tenantId))->find($projetoId);
        if (!$projeto) return 0.00;

        $totalDespesas = (float) ProjetoCusto::where('projeto_id', $projetoId)->sum('valor');

        $etapaIds = Etapa::where('projeto_id', $projetoId)->pluck('id');
        $tarefaIds = Tarefa::whereIn('etapa_id', $etapaIds)->orWhere('projeto_id', $projetoId)->pluck('id');

        $apontamentos = Apontamento::whereIn('tarefa_id', $tarefaIds)->whereNotNull('fim')->get();
        $mapaCustos = ProjetoEquipe::where('projeto_id', $projetoId)->pluck('custo_hora', 'usuario_id');

        $custoMaoDeObra = 0.00;
        foreach ($apontamentos as $ap) {
            $inicio = Carbon::parse($ap->inicio);
            $fim = Carbon::parse($ap->fim);
            $minutos = max(1, $inicio->diffInMinutes($fim));
            $horas = $minutos / 60.0;
            $custoHora = (float) ($mapaCustos[$ap->usuario_id] ?? 0.00);
            $custoMaoDeObra += ($horas * $custoHora);
        }

        $custoTotalReal = $totalDespesas + $custoMaoDeObra;
        $projeto->update(['custo_total_real' => $custoTotalReal]);

        return $custoTotalReal;
    }
}
