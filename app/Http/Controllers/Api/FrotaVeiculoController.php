<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\FrotaVeiculo;
use App\Models\TabelaDominio;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FrotaVeiculoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = FrotaVeiculo::where('tenant_id', $tenantId)->with('status');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('placa', 'ILIKE', "%{$search}%")
                  ->orWhere('marca', 'ILIKE', "%{$search}%")
                  ->orWhere('modelo', 'ILIKE', "%{$search}%")
                  ->orWhere('chassi', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->get('status_id'));
        }

        $veiculos = $query->orderBy('marca')->orderBy('modelo')->paginate(15);
        return response()->json($veiculos);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id
                  ?? Empresa::first()->id;

        $validated = $request->validate([
            'placa' => 'required|string|max:10',
            'chassi' => 'nullable|string|max:50',
            'marca' => 'required|string|max:50',
            'modelo' => 'required|string|max:100',
            'ano_fabricacao' => 'required|integer|min:1900|max:' . (date('Y') + 1),
            'ano_modelo' => 'required|integer|min:1900|max:' . (date('Y') + 2),
            'km_atual' => 'nullable|numeric|min:0',
            'tipo_combustivel_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
            'status_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
        ]);

        $placaLimpa = strtoupper(preg_replace('/[^A-Z0-9]/', '', $validated['placa']));

        if (FrotaVeiculo::where('tenant_id', $tenantId)->where('placa', $placaLimpa)->exists()) {
            return response()->json(['error' => ['message' => 'Veículo com esta placa já cadastrado na frota.']], 422);
        }

        $veiculo = FrotaVeiculo::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'placa' => $placaLimpa,
            'chassi' => $validated['chassi'] ? strtoupper($validated['chassi']) : null,
            'marca' => $validated['marca'],
            'modelo' => $validated['modelo'],
            'ano_fabricacao' => $validated['ano_fabricacao'],
            'ano_modelo' => $validated['ano_modelo'],
            'km_atual' => $validated['km_atual'] ?? 0.00,
            'tipo_combustivel_id' => $validated['tipo_combustivel_id'] ?? null,
            'status_id' => $validated['status_id'] ?? null,
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $veiculo->load('status')], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $veiculo = FrotaVeiculo::where('tenant_id', $tenantId)->with('status')->findOrFail($id);

        return response()->json(['data' => $veiculo]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $veiculo = FrotaVeiculo::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'marca' => 'required|string|max:50',
            'modelo' => 'required|string|max:100',
            'km_atual' => 'nullable|numeric|min:0',
            'status_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
            'tipo_combustivel_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
            'is_ativo' => 'boolean',
        ]);

        $veiculo->update([
            'marca' => $validated['marca'],
            'modelo' => $validated['modelo'],
            'km_atual' => $validated['km_atual'] ?? $veiculo->km_atual,
            'status_id' => $validated['status_id'] ?? $veiculo->status_id,
            'tipo_combustivel_id' => $validated['tipo_combustivel_id'] ?? $veiculo->tipo_combustivel_id,
            'is_ativo' => $validated['is_ativo'] ?? $veiculo->is_ativo,
        ]);

        return response()->json(['data' => $veiculo->fresh('status')]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $veiculo = FrotaVeiculo::where('tenant_id', $tenantId)->findOrFail($id);

        // Soft delete para manter histórico de manutenções e OS vinculadas no futuro
        $veiculo->delete();

        return response()->json(['data' => ['message' => 'Veículo removido da frota com sucesso.']]);
    }

    // ========================================================
    // TABELAS DE DOMÍNIO (Listas Suspensas Dinâmicas)
    // ========================================================
    public function dominios(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        self::garantirDominiosPadrao($tenantId);

        $status = TabelaDominio::where('tenant_id', $tenantId)->where('tipo_lista', 'FRO_STATUS_VEICULO')->orderBy('ordem_exibicao')->get();
        $combustiveis = TabelaDominio::where('tenant_id', $tenantId)->where('tipo_lista', 'FRO_TIPO_COMBUSTIVEL')->orderBy('ordem_exibicao')->get();

        return response()->json([
            'data' => [
                'status_veiculo' => $status,
                'tipos_combustivel' => $combustiveis,
            ]
        ]);
    }

    private static function garantirDominiosPadrao(string $tenantId): void
    {
        $statusPadrao = [
            ['codigo' => 'DISPONIVEL', 'nome' => 'Disponível', 'cor' => '#10b981'],
            ['codigo' => 'EM_USO', 'nome' => 'Em Uso', 'cor' => '#3b82f6'],
            ['codigo' => 'MANUTENCAO', 'nome' => 'Em Manutenção', 'cor' => '#f59e0b'],
            ['codigo' => 'INATIVO', 'nome' => 'Inativo', 'cor' => '#64748b'],
        ];

        $combustiveisPadrao = [
            ['codigo' => 'FLEX', 'nome' => 'Flex (Etanol/Gasolina)', 'cor' => '#14b8a6'],
            ['codigo' => 'DIESEL', 'nome' => 'Diesel', 'cor' => '#f97316'],
            ['codigo' => 'GASOLINA', 'nome' => 'Gasolina', 'cor' => '#0ea5e9'],
            ['codigo' => 'ELETRICO', 'nome' => 'Elétrico', 'cor' => '#8b5cf6'],
        ];

        DB::transaction(function () use ($tenantId, $statusPadrao, $combustiveisPadrao) {
            if (TabelaDominio::where('tenant_id', $tenantId)->where('tipo_lista', 'FRO_STATUS_VEICULO')->count() === 0) {
                foreach ($statusPadrao as $idx => $p) {
                    TabelaDominio::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'tipo_lista' => 'FRO_STATUS_VEICULO', 'codigo' => $p['codigo'], 'nome' => $p['nome'], 'cor_hex' => $p['cor'], 'ordem_exibicao' => $idx + 1, 'is_ativo' => true, 'is_sistema' => true]);
                }
            }

            if (TabelaDominio::where('tenant_id', $tenantId)->where('tipo_lista', 'FRO_TIPO_COMBUSTIVEL')->count() === 0) {
                foreach ($combustiveisPadrao as $idx => $c) {
                    TabelaDominio::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'tipo_lista' => 'FRO_TIPO_COMBUSTIVEL', 'codigo' => $c['codigo'], 'nome' => $c['nome'], 'cor_hex' => $c['cor'], 'ordem_exibicao' => $idx + 1, 'is_ativo' => true, 'is_sistema' => true]);
                }
            }
        });
    }
}
