<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colaborador;
use App\Models\PontoRegistro;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PontoController extends Controller
{
    public function registrar(Request $request): JsonResponse
    {
        // Exige GPS nativo do HTML5
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;

        // Encontra a ficha de colaborador vinculada ao usuário logado
        $colaborador = Colaborador::where('tenant_id', $tenantId)
            ->where('usuario_id', $user->id)
            ->first();

        if (!$colaborador) {
            return response()->json([
                'error' => [
                    'code' => 'COLABORADOR_NAO_ENCONTRADO',
                    'message' => 'Seu usuário não está vinculado a uma ficha de colaborador no RH. Solicite ao gestor.',
                ]
            ], 422);
        }

        $hoje = now()->toDateString();
        $agora = now();

        // Descobre o tipo de batida baseado nas marcações de hoje
        $batidasHoje = PontoRegistro::where('colaborador_id', $colaborador->id)
            ->whereDate('data_hora_registro', $hoje)
            ->orderBy('data_hora_registro')
            ->get();

        $tipoRegistro = match ($batidasHoje->count()) {
            0 => 'ENTRADA',
            1 => 'SAIDA_INTERVALO',
            2 => 'RETORNO_INTERVALO',
            3 => 'SAIDA',
            default => ($batidasHoje->count() % 2 === 0) ? 'ENTRADA_EXTRA' : 'SAIDA_EXTRA',
        };

        $ip = $request->ip();
        $userAgent = $request->userAgent();

        // Blindagem Portaria MTP 671/2021: Hash SHA-256 Atômico
        $dadosParaHash = "{$tenantId}|{$colaborador->id}|{$agora->toDateTimeString()}|{$validated['latitude']}|{$validated['longitude']}|{$ip}|{$userAgent}";
        $hashRegistro = hash('sha256', $dadosParaHash);

        try {
            $registro = PontoRegistro::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'colaborador_id' => $colaborador->id,
                'data_hora_registro' => $agora,
                'tipo_registro' => $tipoRegistro,
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'ip_origem' => $ip,
                'dispositivo_info' => substr($userAgent, 0, 255),
                'hash_registro' => $hashRegistro,
                'created_at' => clone $agora,
            ]);

            return response()->json([
                'data' => [
                    'message' => "Ponto registrado com sucesso ({$tipoRegistro})!",
                    'registro' => $registro,
                ]
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'ERRO_REGISTRO_PONTO',
                    'message' => 'Falha ao registrar ponto: ' . $e->getMessage(),
                ]
            ], 500);
        }
    }

    public function historicoHoje(Request $request): JsonResponse
    {
        $user = $request->user();
        $colaborador = Colaborador::where('tenant_id', $user->tenant_id)
            ->where('usuario_id', $user->id)
            ->first();

        if (!$colaborador) {
            return response()->json(['data' => []]);
        }

        $batidas = PontoRegistro::where('colaborador_id', $colaborador->id)
            ->whereDate('data_hora_registro', now()->toDateString())
            ->orderBy('data_hora_registro')
            ->get();

        return response()->json(['data' => $batidas]);
    }
}
