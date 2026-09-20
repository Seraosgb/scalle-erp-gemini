<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Apontamento;
use App\Models\Tarefa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TimesheetController extends Controller
{
    public function play(Request $request, string $tarefaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tarefa = Tarefa::where('tenant_id', $tenantId)->findOrFail($tarefaId);

        // Bloqueia múltiplos cronômetros abertos para a mesma tarefa e usuário
        $aberto = Apontamento::where('tarefa_id', $tarefa->id)
            ->where('usuario_id', $request->user()->id)
            ->whereNull('fim')
            ->first();

        if ($aberto) {
            return response()->json(['error' => ['message' => 'Você já possui um cronômetro rodando para esta tarefa.']], 422);
        }

        $apontamento = Apontamento::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'tarefa_id' => $tarefa->id,
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

        // GATILHO ENTERPRISE: Injeta a re-apuração financeira
        $tarefa = Tarefa::find($tarefaId);
        $novoCustoTotal = 0;

        if ($tarefa) {
            $novoCustoTotal = self::recalcularCustoProjeto($tarefa->projeto_id);
        }

        return response()->json([
            'data' => [
                'message' => 'Cronômetro parado! Custo atual do projeto subiu para R$ ' . number_format($novoCustoTotal, 2, ',', '.'),
                'apontamento' => $apontamento
            ]
        ]);
    }

    /**
     * Motor Financeiro Absoluto: Soma Horas + Despesas
     */
    public static function recalcularCustoProjeto(string $projetoId)
    {
        // 1. Somatório das Despesas Externas (Aba Custos)
        $totalDespesas = DB::table('prj_projeto_custos')
            ->where('projeto_id', $projetoId)
            ->sum('valor');

        $totalDespesas = is_numeric($totalDespesas) ? (float) $totalDespesas : 0.00;

        // 2. Cálculo da Mão de Obra (Apenas apontamentos válidos)
        $apontamentos = DB::table('prj_apontamentos')
            ->join('prj_tarefas', 'prj_apontamentos.tarefa_id', '=', 'prj_tarefas.id')
            ->where('prj_tarefas.projeto_id', $projetoId)
            ->whereNotNull('prj_apontamentos.fim')
            ->whereNull('prj_apontamentos.deleted_at')
            ->select('prj_apontamentos.usuario_id', 'prj_apontamentos.inicio', 'prj_apontamentos.fim')
            ->get();

        // 3. Mapeamento Primitivo e Seguro de Custos da Equipe
        $membros = DB::table('prj_projeto_equipe')
            ->where('projeto_id', $projetoId)
            ->get();

        $mapaCustos = [];
        foreach ($membros as $m) {
            $mapaCustos[$m->usuario_id] = (float) $m->custo_hora;
        }

        $custoMaoDeObra = 0.00;

        foreach ($apontamentos as $ap) {
            if (empty($ap->inicio) || empty($ap->fim)) continue;

            $inicio = Carbon::parse($ap->inicio);
            $fim = Carbon::parse($ap->fim);

            // Força a diferença absoluta para evitar tempos negativos
            $minutos = $inicio->diffInMinutes($fim);

            // Garante o tempo mínimo de 1 minuto para validações e testes rápidos
            if ($minutos < 1) {
                $minutos = 1;
            }

            $horas = $minutos / 60.0;

            // Busca segura via array nativo do PHP
            $custoHora = isset($mapaCustos[$ap->usuario_id]) ? $mapaCustos[$ap->usuario_id] : 0.00;

            $custoMaoDeObra += ($horas * $custoHora);
        }

        $custoTotalReal = $totalDespesas + $custoMaoDeObra;

        // 4. Atualiza o Totalizador do Projeto
        DB::table('prj_projetos')
            ->where('id', $projetoId)
            ->update(['custo_total_real' => $custoTotalReal]);

        return $custoTotalReal;
    }
}
