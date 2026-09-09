<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colaborador;
use App\Models\Empresa;
use App\Models\PontoRegistro;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ColaboradorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $colaboradores = Colaborador::where('tenant_id', $tenantId)
            ->with(['pessoa:id,nome_razao_social,cpf_cnpj', 'usuario:id,name,email'])
            ->orderBy('status')
            ->orderBy('data_admissao', 'desc')
            ->get();

        return response()->json(['data' => $colaboradores]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $empresaId = $request->user()->empresa_padrao_id
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id
                  ?? Empresa::first()?->id;

        $validated = $request->validate([
            'pessoa_id' => 'required|uuid|exists:pes_pessoas,id',
            'usuario_id' => 'nullable|string',
            'matricula' => 'required|string|max:50',
            'cargo' => 'required|string|max:150',
            'departamento' => 'nullable|string|max:100',
            'data_admissao' => 'required|date',
            'salario_base' => 'required|numeric|min:0',
            'tipo_contrato' => 'required|string|in:CLT,PJ,ESTAGIO,TEMPORARIO',
        ]);

        $jaExiste = Colaborador::where('tenant_id', $tenantId)
            ->where('pessoa_id', $validated['pessoa_id'])
            ->where('status', 'ATIVO')
            ->exists();

        if ($jaExiste) {
            return response()->json(['error' => ['message' => 'Esta pessoa já possui uma ficha de colaborador ativa.']], 422);
        }

        // Sem chumbamento de dados estáticos! Passa null se estiver vazio.
        $usuarioIdLimpo = !empty($validated['usuario_id']) ? $validated['usuario_id'] : null;
        $departamentoLimpo = !empty($validated['departamento']) ? $validated['departamento'] : null;

        $colaborador = Colaborador::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'pessoa_id' => $validated['pessoa_id'],
            'usuario_id' => $usuarioIdLimpo,
            'matricula' => strtoupper(trim($validated['matricula'])),
            'cargo' => $validated['cargo'],
            'departamento' => $departamentoLimpo,
            'data_admissao' => $validated['data_admissao'],
            'salario_base' => (float) $validated['salario_base'],
            'tipo_contrato' => $validated['tipo_contrato'],
            'status' => 'ATIVO',
        ]);

        return response()->json([
            'data' => [
                'message' => 'Ficha de colaborador registrada com sucesso!',
                'colaborador' => $colaborador->load(['pessoa', 'usuario']),
            ]
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $colaborador = Colaborador::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'cargo' => 'required|string|max:150',
            'departamento' => 'nullable|string|max:100',
            'salario_base' => 'required|numeric|min:0',
            'status' => 'required|string|in:ATIVO,AFASTADO,DESLIGADO',
            'data_demissao' => 'nullable|date',
        ]);

        $departamentoLimpo = !empty($validated['departamento']) ? $validated['departamento'] : null;

        $colaborador->update([
            'cargo' => $validated['cargo'],
            'departamento' => $departamentoLimpo ?? $colaborador->departamento,
            'salario_base' => (float) $validated['salario_base'],
            'status' => $validated['status'],
            'data_demissao' => $validated['status'] === 'DESLIGADO' ? ($validated['data_demissao'] ?? now()) : null,
        ]);

        return response()->json([
            'data' => [
                'message' => 'Ficha funcional atualizada.',
                'colaborador' => $colaborador->fresh(['pessoa', 'usuario']),
            ]
        ]);
    }

    public function espelhoPonto(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $colaborador = Colaborador::where('tenant_id', $tenantId)->findOrFail($id);

        $mes = $request->get('mes', now()->month);
        $ano = $request->get('ano', now()->year);

        $pontos = PontoRegistro::where('colaborador_id', $colaborador->id)
            ->whereMonth('data_hora_registro', $mes)
            ->whereYear('data_hora_registro', $ano)
            ->orderBy('data_hora_registro')
            ->get();

        $espelho = [];
        foreach ($pontos as $p) {
            $dia = \Carbon\Carbon::parse($p->data_hora_registro)->format('Y-m-d');
            if (!isset($espelho[$dia])) {
                $espelho[$dia] = [];
            }
            $espelho[$dia][] = $p;
        }

        return response()->json([
            'data' => [
                'colaborador' => $colaborador->load('pessoa'),
                'competencia' => "{$mes}/{$ano}",
                'espelho_diario' => $espelho,
            ]
        ]);
    }
}
