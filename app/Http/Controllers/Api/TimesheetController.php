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

        // GATILHO ENTERPRISE: Injeta a re-apuração financeira na raiz do Projeto
        $tarefa = Tarefa::find($tarefaId);
        if ($tarefa) {
            self::recalcularCustoProjeto($tarefa->projeto_id);
        }

        return response()->json(['data' => ['message' => 'Cronômetro parado e custos apropriados com sucesso!', 'apontamento' => $apontamento]]);
    }

    /**
     * Motor Financeiro: Soma Horas Trabalhadas da Equipe + Despesas Externas Lançadas
     */
    public static function recalcularCustoProjeto(string $projetoId)
    {
        // 1. Somatório das Despesas Externas (Aba Custos)
        $totalDespesas = DB::table('prj_projeto_custos')
            ->where('projeto_id', $projetoId)
            ->sum('valor');

        // 2. Cálculo da Mão de Obra (Horas do Timesheet * Custo Hora da Equipe)
        $apontamentos = DB::table('prj_apontamentos')
            ->join('prj_tarefas', 'prj_apontamentos.tarefa_id', '=', 'prj_tarefas.id')
            ->where('prj_tarefas.projeto_id', $projetoId)
            ->whereNotNull('prj_apontamentos.fim')
            ->select('prj_apontamentos.usuario_id', 'prj_apontamentos.inicio', 'prj_apontamentos.fim')
            ->get();

        $equipe = DB::table('prj_projeto_equipe')
            ->where('projeto_id', $projetoId)
            ->get()
            ->keyBy('usuario_id');

        $custoMaoDeObra = 0;

        foreach ($apontamentos as $ap) {
            $inicio = Carbon::parse($ap->inicio);
            $fim = Carbon::parse($ap->fim);
            $minutos = max(1, $fim->diffInMinutes($inicio));
            $horas = $minutos / 60;

            // Coleta o Custo-Hora do profissional (se não existir na equipe, assume R$ 0,00)
            $custoHora = isset($equipe[$ap->usuario_id]) ? (float) $equipe[$ap->usuario_id]->custo_hora : 0.00;

            $custoMaoDeObra += ($horas * $custoHora);
        }

        $custoTotalReal = (float) $totalDespesas + $custoMaoDeObra;

        // 3. Atualiza o Totalizador do Projeto
        DB::table('prj_projetos')
            ->where('id', $projetoId)
            ->update(['custo_total_real' => $custoTotalReal]);
    }
}
