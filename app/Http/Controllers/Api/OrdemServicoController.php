<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemServico;
use App\Models\OrdemServicoFoto;
use App\Services\OrdemServicoService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrdemServicoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = OrdemServico::where('tenant_id', $tenantId)
            ->with(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('equipamento_descricao', 'ILIKE', "%{$search}%")
                  ->orWhere('equipamento_marca_modelo', 'ILIKE', "%{$search}%")
                  ->orWhere('numero_os', 'ILIKE', "%{$search}%")
                  ->orWhereHas('cliente', fn($c) => $c->where('nome_razao_social', 'ILIKE', "%{$search}%"));
            });
        }

        $ordens = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($ordens);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)
            ->with(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'empresa'])
            ->findOrFail($id);

        return response()->json(['data' => $os]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cliente_id' => 'required|uuid|exists:pes_pessoas,id',
            'tecnico_responsavel_id' => 'nullable|uuid|exists:users,id',
            'deposito_saida_id' => 'nullable|uuid|exists:wms_depositos,id',
            'equipamento_descricao' => 'required|string|max:200',
            'equipamento_marca_modelo' => 'nullable|string|max:150',
            'equipamento_numero_serie' => 'nullable|string|max:100',
            'defeito_reclamado' => 'required|string',
            'prioridade' => 'required|string|in:BAIXA,NORMAL,ALTA,URGENTE',
            'tipo_manutencao' => 'required|string|in:CORRETIVA,PREVENTIVA,INSTALACAO,PREDITIVA',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                  ?? Empresa::first()->id;

        $ultimoNumero = OrdemServico::where('empresa_id', $empresaId)->max('numero_os') ?? 1000;
        $prazosSla = OrdemServicoService::calcularSla($validated['prioridade']);

        $os = OrdemServico::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'cliente_id' => $validated['cliente_id'],
            'tecnico_responsavel_id' => $validated['tecnico_responsavel_id'] ?? $request->user()->id,
            'deposito_saida_id' => $validated['deposito_saida_id'],
            'numero_os' => $ultimoNumero + 1,
            'status' => 'ABERTA',
            'prioridade' => $validated['prioridade'],
            'tipo_manutencao' => $validated['tipo_manutencao'],
            'equipamento_descricao' => $validated['equipamento_descricao'],
            'equipamento_marca_modelo' => $validated['equipamento_marca_modelo'] ?? null,
            'equipamento_numero_serie' => $validated['equipamento_numero_serie'] ?? null,
            'defeito_reclamado' => $validated['defeito_reclamado'],
            'data_abertura' => now(),
            'prazo_sla_resposta' => $prazosSla['resposta'],
            'prazo_sla_resolucao' => $prazosSla['resolucao'],
        ]);

        return response()->json([
            'data' => [
                'message' => "Ordem de Serviço #{$os->numero_os} aberta com sucesso!",
                'os' => $os->load('cliente', 'tecnico'),
            ]
        ], 201);
    }

    public function uploadFoto(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'foto' => 'required|image|max:10240', // Max 10MB
            'tipo_etapa' => 'required|string|in:ANTES,DEPOIS',
            'descricao' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $caminho = $request->file('foto')->store("os/{$os->id}", 'public');
        $urlPublica = Storage::disk('public')->url($caminho);

        $foto = OrdemServicoFoto::create([
            'id' => (string) Str::uuid(),
            'ordem_servico_id' => $os->id,
            'tipo_etapa' => $request->tipo_etapa,
            'url_arquivo' => $urlPublica,
            'descricao' => $request->descricao ?? "Evidência ({$request->tipo_etapa})",
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'created_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'message' => 'Evidência fotográfica anexada com sucesso!',
                'foto' => $foto,
            ]
        ], 201);
    }

    public function concluir(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'laudo_tecnico' => 'required|string',
            'nome_responsavel' => 'required|string|max:150',
            'documento_responsavel' => 'nullable|string|max:30',
            'assinatura_base64' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'itens' => 'nullable|array',
            'itens.*.item_id' => 'required|uuid|exists:pro_itens,id',
            'itens.*.tipo_item' => 'required|string|in:PRODUTO,SERVICO',
            'itens.*.quantidade' => 'required|numeric|min:0.0001',
            'itens.*.valor_unitario' => 'required|numeric|min:0',
            'itens.*.lote' => 'nullable|string|max:50',
        ]);

        try {
            $osConcluida = OrdemServicoService::concluirOrdemServico(
                $os,
                $validated['itens'] ?? [],
                $validated['laudo_tecnico'],
                $validated['assinatura_base64'],
                $validated['nome_responsavel'],
                $validated['documento_responsavel'] ?? null,
                $request->user(),
                $validated['latitude'] ?? null,
                $validated['longitude'] ?? null,
                $request->ip()
            );

            return response()->json([
                'data' => [
                    'message' => "OS #{$osConcluida->numero_os} finalizada, estoque baixado e fatura gerada!",
                    'os' => $osConcluida->load('itens.item', 'fotos'),
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'OS_CONCLUDE_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }
}