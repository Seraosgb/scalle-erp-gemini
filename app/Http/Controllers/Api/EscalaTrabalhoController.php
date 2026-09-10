<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EscalaTrabalho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EscalaTrabalhoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $escalas = EscalaTrabalho::where('tenant_id', $tenantId)
            ->orderBy('nome')
            ->get();

        return response()->json(['data' => $escalas]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'tipo_escala' => 'required|string|in:SEMANAL,12X36,6X2',
            'horario_entrada' => 'required|date_format:H:i',
            'horario_saida' => 'required|date_format:H:i',
            'inicio_intervalo' => 'nullable|date_format:H:i',
            'fim_intervalo' => 'nullable|date_format:H:i',
            'tolerancia_minutos' => 'nullable|integer|min:0|max:60',
        ]);

        $escala = EscalaTrabalho::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => $validated['nome'],
            'tipo_escala' => $validated['tipo_escala'],
            'horario_entrada' => $validated['horario_entrada'],
            'horario_saida' => $validated['horario_saida'],
            'inicio_intervalo' => $validated['inicio_intervalo'] ?? null,
            'fim_intervalo' => $validated['fim_intervalo'] ?? null,
            'tolerancia_minutos' => $validated['tolerancia_minutos'] ?? 10,
            'is_ativo' => true,
        ]);

        return response()->json([
            'data' => [
                'message' => 'Escala de trabalho cadastrada com sucesso!',
                'escala' => $escala,
            ]
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $escala = EscalaTrabalho::where('tenant_id', $tenantId)->findOrFail($id);

        $escala->delete();

        return response()->json(['data' => ['message' => 'Escala removida com sucesso.']]);
    }
}
