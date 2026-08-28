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
    public function metricasCmms(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // 1. Ordens concluídas
        $concluidas = OrdemServico::where('tenant_id', $tenantId)
            ->where('status', 'CONCLUIDA')
            ->whereNotNull('data_abertura')
            ->whereNotNull('data_conclusao')
            ->get();

        $totalConcluidas = $concluidas->count();
        $totalHorasReparo = 0;

        foreach ($concluidas as $os) {
            $abertura = \Carbon\Carbon::parse($os->data_abertura);
            $conclusao = \Carbon\Carbon::parse($os->data_conclusao);
            $totalHorasReparo += max(0.5, $conclusao->diffInMinutes($abertura) / 60);
        }

        // MTTR (Mean Time to Repair em Horas)
        $mttr = $totalConcluidas > 0 ? round($totalHorasReparo / $totalConcluidas, 1) : 0;

        // 2. MTBF (Mean Time Between Failures em Dias)
        $corretivas = OrdemServico::where('tenant_id', $tenantId)
            ->where('tipo_manutencao', 'CORRETIVA')
            ->count();

        $diasPeriodo = 30;
        $mtbf = $corretivas > 0 ? round($diasPeriodo / $corretivas, 1) : $diasPeriodo;

        // 3. Taxa de Conformidade com SLA
        $dentroDoPrazo = $concluidas->filter(function ($os) {
            return $os->prazo_sla_resolucao && $os->data_conclusao <= $os->prazo_sla_resolucao;
        })->count();

        $slaConformidade = $totalConcluidas > 0 ? round(($dentroDoPrazo / $totalConcluidas) * 100, 1) : 100;

        return response()->json([
            'data' => [
                'mttr_horas' => $mttr,
                'mtbf_dias' => $mtbf,
                'sla_conformidade_percent' => $slaConformidade,
                'total_concluidas' => $totalConcluidas,
                'total_corretivas' => $corretivas,
            ]
        ]);
    }
    
    public function show(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)
            ->with(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'empresa', 'ativo', 'apontamentos.tecnico'])
            ->findOrFail($id);

        return response()->json(['data' => $os]);
    }

    public function atualizarStatus(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:ABERTA,EM_EXECUCAO,AGUARDANDO_PECA,MATERIAL_DISPONIVEL,CONCLUIDA,CANCELADA',
            'diagnostico_tecnico' => 'nullable|string',
            'tecnico_responsavel_id' => 'nullable|uuid|exists:users,id',
        ]);

        $novoStatus = $validated['status'];
        $statusAnterior = $os->status;
        $userId = $request->user()->id;

        // 1. Fechar apontamento aberto de mão de obra se estiver saindo de EM_EXECUCAO
        if ($statusAnterior === 'EM_EXECUCAO' && $novoStatus !== 'EM_EXECUCAO') {
            $apontamentoAberto = \App\Models\OsApontamentoHora::where('ordem_servico_id', $os->id)
                ->whereNull('data_hora_fim')
                ->latest()
                ->first();

            if ($apontamentoAberto) {
                $agora = now();
                $inicio = \Carbon\Carbon::parse($apontamentoAberto->data_hora_inicio);
                $minutos = max(1, $agora->diffInMinutes($inicio));
                $horas = round($minutos / 60, 2);
                $valorTotal = $horas * (float)$apontamentoAberto->valor_hora;

                $apontamentoAberto->update([
                    'data_hora_fim' => $agora,
                    'total_horas' => $horas,
                    'valor_total' => $valorTotal,
                ]);

                // Recalcular valor total de serviços da OS
                $totalServicos = \App\Models\OsApontamentoHora::where('ordem_servico_id', $os->id)->sum('valor_total');
                $os->update([
                    'valor_servicos' => $totalServicos,
                    'valor_total' => ((float)$totalServicos + (float)$os->valor_pecas) - (float)$os->valor_desconto,
                ]);
            }
        }

        // 2. Abrir novo apontamento de mão de obra ao entrar em EM_EXECUCAO
        if ($novoStatus === 'EM_EXECUCAO') {
            \App\Models\OsApontamentoHora::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'ordem_servico_id' => $os->id,
                'tecnico_id' => $validated['tecnico_responsavel_id'] ?? $os->tecnico_responsavel_id ?? $userId,
                'data_hora_inicio' => now(),
                'valor_hora' => 60.00, // Valor padrão de hora técnica
                'descricao_atividades' => 'Execução técnica em andamento.',
            ]);

            if (empty($os->data_inicio_execucao)) {
                $os->data_inicio_execucao = now();
            }
        }

        $dadosUpdate = ['status' => $novoStatus];
        if (isset($validated['diagnostico_tecnico'])) {
            $dadosUpdate['diagnostico_tecnico'] = $validated['diagnostico_tecnico'];
        }
        if (isset($validated['tecnico_responsavel_id'])) {
            $dadosUpdate['tecnico_responsavel_id'] = $validated['tecnico_responsavel_id'];
        }

        $os->update($dadosUpdate);

        return response()->json([
            'data' => [
                'message' => "OS #{$os->numero_os} transitada para {$novoStatus}!",
                'os' => $os->fresh(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'ativo', 'apontamentos.tecnico'])
            ]
        ]);
    }

    public function adicionarPeca(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'item_id' => 'required|uuid|exists:pro_itens,id',
            'quantidade' => 'required|numeric|min:0.0001',
            'valor_unitario' => 'required|numeric|min:0',
        ]);

        $item = \App\Models\OrdemServicoItem::create([
            'id' => (string) Str::uuid(),
            'ordem_servico_id' => $os->id,
            'item_id' => $validated['item_id'],
            'tipo_item' => 'PRODUTO',
            'quantidade' => $validated['quantidade'],
            'valor_unitario' => $validated['valor_unitario'],
            'valor_total' => (float)$validated['quantidade'] * (float)$validated['valor_unitario'],
            'status_requisicao' => 'SOLICITADO',
        ]);

        $totalPecas = \App\Models\OrdemServicoItem::where('ordem_servico_id', $os->id)->sum('valor_total');
        $os->update([
            'valor_pecas' => $totalPecas,
            'valor_total' => ((float)$os->valor_servicos + (float)$totalPecas) - (float)$os->valor_desconto,
            'status' => 'AGUARDANDO_PECA',
        ]);

        return response()->json([
            'data' => [
                'message' => 'Material solicitado ao almoxarifado com sucesso!',
                'os' => $os->fresh(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'ativo', 'apontamentos.tecnico'])
            ]
        ], 201);
    }

    public function tratarPecaAlmoxarifado(Request $request, string $osId, string $itemId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($osId);
        $itemOs = \App\Models\OrdemServicoItem::where('ordem_servico_id', $os->id)->findOrFail($itemId);

        $validated = $request->validate([
            'status_requisicao' => 'required|string|in:DISPONIVEL,RETIRADO',
        ]);

        $novoStatusReq = $validated['status_requisicao'];
        $user = $request->user();

        if ($novoStatusReq === 'RETIRADO' && $itemOs->status_requisicao !== 'RETIRADO') {
            // Efetua a baixa física atômica no WMS
            if (!empty($os->deposito_saida_id)) {
                \App\Services\EstoqueService::movimentar(
                    $os->deposito_saida_id,
                    $itemOs->item_id,
                    (float) $itemOs->quantidade,
                    'SAIDA_OS',
                    $user->id,
                    'os',
                    $os->id,
                    null,
                    (float) $itemOs->valor_unitario
                );
            }
        }

        $itemOs->update([
            'status_requisicao' => $novoStatusReq,
            'almoxarife_id' => $user->id,
            'atendido_em' => now(),
        ]);

        // Se todas as peças foram atendidas/disponíveis, sugere MATERIAL_DISPONIVEL
        $pendentes = \App\Models\OrdemServicoItem::where('ordem_servico_id', $os->id)
            ->where('status_requisicao', 'SOLICITADO')
            ->count();

        if ($pendentes === 0 && $novoStatusReq === 'DISPONIVEL') {
            $os->update(['status' => 'MATERIAL_DISPONIVEL']);
        }

        return response()->json([
            'data' => [
                'message' => "Material marcado como {$novoStatusReq}!",
                'os' => $os->fresh(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'ativo', 'apontamentos.tecnico'])
            ]
        ]);
    }
    public function bootstrapData(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        // 1. Ordens de Serviço (primeira página)
        $ordens = OrdemServico::where('tenant_id', $tenantId)
            ->with(['cliente:id,nome_razao_social', 'tecnico:id,name', 'deposito:id,nome'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        // 2. Métricas CMMS rápidas via agregação no banco
        $concluidas = OrdemServico::where('tenant_id', $tenantId)
            ->where('status', 'CONCLUIDA')
            ->selectRaw('COUNT(*) as total, AVG(EXTRACT(EPOCH FROM (data_conclusao - data_abertura))/3600) as mttr_horas')
            ->first();

        $corretivasCount = OrdemServico::where('tenant_id', $tenantId)
            ->where('tipo_manutencao', 'CORRETIVA')
            ->count();

        $metricas = [
            'mttr_horas' => round((float) ($concluidas->mttr_horas ?? 0), 1),
            'mtbf_dias' => $corretivasCount > 0 ? round(30 / $corretivasCount, 1) : 30,
            'sla_conformidade_percent' => 100,
            'total_concluidas' => (int) ($concluidas->total ?? 0),
            'total_corretivas' => $corretivasCount,
        ];

        // 3. Prioridades
        $prioridades = \App\Models\TabelaDominio::where('tenant_id', $tenantId)
            ->where('tipo_lista', 'PRIORIDADE_OS')
            ->orderBy('ordem_exibicao')
            ->get();

        return response()->json([
            'data' => [
                'ordens' => $ordens,
                'metricas' => $metricas,
                'prioridades' => $prioridades,
            ]
        ]);
    }
    public function atualizarDadosTecnicos(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $os = OrdemServico::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'tecnico_responsavel_id' => 'nullable|uuid|exists:users,id',
            'diagnostico_tecnico' => 'nullable|string',
            'prioridade' => 'nullable|string|in:BAIXA,NORMAL,ALTA,URGENTE',
            'prazo_sla_resolucao' => 'nullable|date',
            'recalcular_sla' => 'nullable|boolean',
        ]);

        $dadosUpdate = [];

        if (array_key_exists('tecnico_responsavel_id', $validated)) {
            $dadosUpdate['tecnico_responsavel_id'] = $validated['tecnico_responsavel_id'];
        }

        if (array_key_exists('diagnostico_tecnico', $validated)) {
            $dadosUpdate['diagnostico_tecnico'] = $validated['diagnostico_tecnico'];
        }

        if (!empty($validated['prioridade'])) {
            $dadosUpdate['prioridade'] = $validated['prioridade'];

            if (!empty($validated['recalcular_sla'])) {
                $abertura = \Carbon\Carbon::parse($os->data_abertura ?? now());
                $horasSla = match ($validated['prioridade']) {
                    'URGENTE' => 6,
                    'ALTA' => 12,
                    'BAIXA' => 72,
                    default => 24, // NORMAL
                };
                $dadosUpdate['prazo_sla_resolucao'] = $abertura->copy()->addHours($horasSla);
            }
        }

        if (!empty($validated['prazo_sla_resolucao']) && empty($validated['recalcular_sla'])) {
            $dadosUpdate['prazo_sla_resolucao'] = $validated['prazo_sla_resolucao'];
        }

        $os->update($dadosUpdate);

        return response()->json([
            'data' => [
                'message' => 'Parâmetros técnicos e SLA atualizados com sucesso!',
                'os' => $os->fresh(['cliente', 'tecnico', 'deposito', 'itens.item', 'fotos', 'ativo', 'apontamentos.tecnico'])
            ]
        ]);
    }
    }