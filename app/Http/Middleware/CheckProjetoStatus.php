<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;

class CheckProjetoStatus
{
    public function handle(Request $request, Closure $next): Response
    {
        // Só bloqueia ações de alteração (POST, PUT, PATCH, DELETE)
        if ($request->isMethod('get')) {
            return $next($request);
        }

        // Tenta encontrar o ID do projeto na rota ou no body da requisição
        $projetoId = $request->route('projetoId') ?? $request->route('id') ?? $request->input('projeto_id');

        if (!$projetoId) {
            // Se for uma rota de tarefa (ex: mover tarefa, timer, anexo), precisamos buscar a qual projeto a tarefa pertence
            $tarefaId = $request->route('tarefaId') ?? $request->input('tarefa_id');
            if ($tarefaId) {
                $projetoId = DB::table('prj_tarefas')->where('id', $tarefaId)->value('projeto_id');
            }
        }

        if ($projetoId) {
            $status = DB::table('prj_projetos')->where('id', $projetoId)->value('status');

            if ($status && in_array($status, ['CONCLUIDO', 'CANCELADO'])) {
                return response()->json([
                    'error' => [
                        'message' => 'O projeto está ' . $status . ' e encontra-se bloqueado para novas alterações (Modo Somente Leitura).'
                    ]
                ], 403);
            }
        }

        return $next($request);
    }
}
