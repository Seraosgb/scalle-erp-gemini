<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Apontamento;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class TimesheetController extends Controller
{
    public function play(Request $request, string $tarefaId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // Valida a tarefa diretamente no banco para evitar bloqueios de Model
        $tarefa = DB::table('prj_tarefas')->where('id', $tarefaId)->where('tenant_id', $tenantId)->first();
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

        // A MÁGICA DE CORREÇÃO: Procura o Projeto através da Etapa, ignorando falhas do Model Tarefa
        $vinculo = DB::table('prj_tarefas')
            ->join('prj_etapas', 'prj_tarefas.etapa_id', '=', 'prj_etapas.id')
            ->where('prj_tarefas.id', $tarefaId)
            ->select('prj_etapas.projeto_id')
            ->first();

        $novoCustoTotal = 0.00;
        if ($vinculo && $vinculo->projeto_id) {
            // Corrige a tarefa silenciosamente na base de dados
            DB::table('prj_tarefas')->where('id', $tarefaId)->update(['projeto_id' => $vinculo->projeto_id]);

            $novoCustoTotal = self::recalcularCustoProjeto($vinculo->projeto_id);
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
        // 1. Somatório das Despesas Externas
        $totalDespesas = DB::table('prj_projeto_custos')
            ->where('projeto_id', $projetoId)
            ->sum('valor');

        $totalDespesas = is_numeric($totalDespesas) ? (float) $totalDespesas : 0.00;

        // 2. Apontamentos (usando a tabela de etapas para garantir o projeto_id correto)
        $queryApontamentos = DB::table('prj_apontamentos')
            ->join('prj_tarefas', 'prj_apontamentos.tarefa_id', '=', 'prj_tarefas.id')
            ->join('prj_etapas', 'prj_tarefas.etapa_id', '=', 'prj_etapas.id')
            ->where('prj_etapas.projeto_id', $projetoId)
            ->whereNotNull('prj_apontamentos.fim')
            ->select('prj_apontamentos.usuario_id', 'prj_apontamentos.inicio', 'prj_apontamentos.fim');

        // Proteção caso a tabela não suporte soft deletes
        if (Schema::hasColumn('prj_apontamentos', 'deleted_at')) {
            $queryApontamentos->whereNull('prj_apontamentos.deleted_at');
        }

        $apontamentos = $queryApontamentos->get();

        // 3. Mapeamento Primitivo de Custos da Equipe
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

            $minutos = $inicio->diffInMinutes($fim);
            if ($minutos < 1) $minutos = 1;

            $horas = $minutos / 60.0;

            $custoHora = isset($mapaCustos[$ap->usuario_id]) ? $mapaCustos[$ap->usuario_id] : 0.00;

            $custoMaoDeObra += ($horas * $custoHora);
        }

        $custoTotalReal = $totalDespesas + $custoMaoDeObra;

        // 4. Atualiza o Totalizador do Projeto de forma forçada
        DB::table('prj_projetos')
            ->where('id', $projetoId)
            ->update(['custo_total_real' => $custoTotalReal]);

        return $custoTotalReal;
    }
}
