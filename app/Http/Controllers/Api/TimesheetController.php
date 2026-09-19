<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Apontamento;
use App\Models\Tarefa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

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

        return response()->json(['data' => ['message' => 'Cronômetro parado com sucesso!', 'apontamento' => $apontamento]]);
    }
}
