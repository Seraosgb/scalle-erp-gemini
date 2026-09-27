<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PdvCaixa;
use App\Models\PdvMovimentacao;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Exception;

class PdvController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $caixa = PdvCaixa::where('usuario_id', $request->user()->id)
            ->where('status', 'ABERTO')
            ->first();

        return response()->json(['data' => ['caixa_aberto' => (bool)$caixa, 'caixa' => $caixa]]);
    }

    public function abrir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'saldo_abertura' => 'required|numeric|min:0',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $empresaId = $user->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        if (PdvCaixa::where('usuario_id', $user->id)->where('status', 'ABERTO')->exists()) {
            return response()->json(['error' => ['message' => 'Você já possui um caixa aberto.']], 422);
        }

        $caixa = DB::transaction(function () use ($validated, $tenantId, $empresaId, $user) {
            $novoCaixa = PdvCaixa::create([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'usuario_id' => $user->id,
                'data_abertura' => now(),
                'saldo_abertura' => (float) $validated['saldo_abertura'],
                'status' => 'ABERTO',
            ]);

            if ($novoCaixa->saldo_abertura > 0) {
                PdvMovimentacao::create([
                    'tenant_id' => $tenantId,
                    'caixa_id' => $novoCaixa->id,
                    'tipo_movimento' => 'SUPRIMENTO',
                    'valor' => $novoCaixa->saldo_abertura,
                    'observacoes' => 'Fundo de troco inicial',
                ]);
            }

            return $novoCaixa;
        });

        return response()->json(['data' => ['message' => 'Caixa aberto com sucesso!', 'caixa' => $caixa]], 201);
    }

    public function movimentar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo_movimento' => 'required|string|in:SANGRIA,SUPRIMENTO',
            'valor' => 'required|numeric|min:0.01',
            'observacoes' => 'required|string|max:255',
            'email_supervisor' => 'nullable|email',
            'senha_supervisor' => 'nullable|string',
        ]);

        $user = $request->user();
        $caixa = PdvCaixa::where('usuario_id', $user->id)->where('status', 'ABERTO')->firstOrFail();

        $autorizadorId = null;

        // Regra RBAC: Se for Sangria e o usuário não for Gestor/Admin, exige senha de supervisor
        if ($validated['tipo_movimento'] === 'SANGRIA' && !$user->is_master && !str_contains(strtoupper($user->perfil->nome ?? ''), 'ADMIN')) {
            if (empty($validated['email_supervisor']) || empty($validated['senha_supervisor'])) {
                return response()->json(['error' => ['message' => 'Autorização de supervisor obrigatória para sangrias.']], 403);
            }

            $supervisor = User::where('tenant_id', $user->tenant_id)->where('email', $validated['email_supervisor'])->first();

            if (!$supervisor || !Hash::check($validated['senha_supervisor'], $supervisor->password) || (!str_contains(strtoupper($supervisor->perfil->nome ?? ''), 'ADMIN') && !$supervisor->is_master)) {
                return response()->json(['error' => ['message' => 'Credenciais de supervisor inválidas ou sem privilégios.']], 403);
            }
            $autorizadorId = $supervisor->id;
        }

        $movimentacao = PdvMovimentacao::create([
            'tenant_id' => $user->tenant_id,
            'caixa_id' => $caixa->id,
            'tipo_movimento' => $validated['tipo_movimento'],
            'valor' => (float) $validated['valor'],
            'autorizador_id' => $autorizadorId,
            'observacoes' => $validated['observacoes'],
        ]);

        return response()->json(['data' => ['message' => "{$validated['tipo_movimento']} registrada com sucesso!", 'movimentacao' => $movimentacao]]);
    }

    public function fechar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'saldo_informado' => 'required|numeric|min:0',
        ]);

        $caixa = PdvCaixa::where('usuario_id', $request->user()->id)->where('status', 'ABERTO')->firstOrFail();

        // Cálculo dinâmico do saldo do gaveta
        $entradas = PdvMovimentacao::where('caixa_id', $caixa->id)
            ->whereIn('tipo_movimento', ['SUPRIMENTO', 'VENDA_DINHEIRO'])
            ->sum('valor');

        $saidas = PdvMovimentacao::where('caixa_id', $caixa->id)
            ->where('tipo_movimento', 'SANGRIA')
            ->sum('valor');

        $saldoCalculado = $entradas - $saidas;
        $saldoInformado = (float) $validated['saldo_informado'];
        $quebra = $saldoInformado - $saldoCalculado;

        $caixa->update([
            'data_fechamento' => now(),
            'saldo_informado' => $saldoInformado,
            'saldo_calculado' => $saldoCalculado,
            'quebra_caixa' => $quebra,
            'status' => 'FECHADO',
        ]);

        return response()->json([
            'data' => [
                'message' => 'Caixa fechado com sucesso!',
                'resumo' => [
                    'saldo_calculado' => $saldoCalculado,
                    'saldo_informado' => $saldoInformado,
                    'quebra_caixa' => $quebra,
                ]
            ]
        ]);
    }
}
