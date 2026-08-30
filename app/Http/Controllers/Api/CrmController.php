<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmFunil;
use App\Models\CrmFunilEtapa;
use App\Models\CrmOportunidade;
use App\Models\CrmOportunidadeAtividade;
use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
use App\Models\TabelaDominio;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CrmController extends Controller
{
    public function board(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $statusFiltro = $request->get('status', 'ABERTO'); // ABERTO, GANHO, PERDIDO ou TODOS
        $vendedorId = $request->get('vendedor_id');
        $search = $request->get('search');
        
        $funil = CrmFunil::where('tenant_id', $tenantId)
            ->with(['etapas.oportunidades' => function ($q) use ($statusFiltro, $vendedorId, $search) {
                if ($statusFiltro !== 'TODOS') {
                    $q->where('status', $statusFiltro);
                }
                if (!empty($vendedorId)) {
                    $q->where('vendedor_id', $vendedorId);
                }
                if (!empty($search)) {
                    $q->where(function($sub) use ($search) {
                        $sub->where('titulo', 'ILIKE', "%{$search}%")
                            ->orWhere('nome_contato', 'ILIKE', "%{$search}%")
                            ->orWhere('telefone_contato', 'ILIKE', "%{$search}%");
                    });
                }
                $q->with(['vendedor:id,name', 'atividades'])
                  ->orderByDesc('created_at');
            }])
            ->first();

        if (!$funil) {
            $funil = CrmFunil::create([
                'tenant_id' => $tenantId,
                'nome' => 'Funil Comercial Padrão',
                'token_captacao' => Str::random(40),
                'is_padrao' => true,
                'is_ativo' => true,
            ]);
        }

        $etapasPadrao = [
            1 => 'Prospecção',
            2 => 'Qualificação',
            3 => 'Apresentação',
            4 => 'Negociação'
        ];

        $etapasExistentes = $funil->etapas()->pluck('nome')->toArray();
        foreach ($etapasPadrao as $ordem => $nomeEtapa) {
            if (!in_array($nomeEtapa, $etapasExistentes)) {
                $funil->etapas()->create([
                    'nome' => $nomeEtapa,
                    'ordem_exibicao' => $ordem,
                ]);
            }
        }

        $funil->load(['etapas' => function ($q) {
            $q->orderBy('ordem_exibicao', 'asc');
        }]);

        // Auto-provisionamento de Motivos de Perda no Dropdown como Tabela
        self::garantirMotivosPerdaPadrao($tenantId);
        $motivosPerda = TabelaDominio::where('tenant_id', $tenantId)
            ->where('tipo_lista', 'CRM_MOTIVO_PERDA')
            ->where('is_ativo', true)
            ->get();

        $vendedores = User::where('tenant_id', $tenantId)->where('is_ativo', true)->get(['id', 'name']);

        return response()->json([
            'data' => [
                'funil' => $funil,
                'motivos_perda' => $motivosPerda,
                'vendedores' => $vendedores,
            ]
        ]);
    }

    public function moverCard(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'etapa_id_destino' => 'required|uuid|exists:crm_funil_etapas,id',
        ]);

        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);
        $oportunidade->update(['etapa_id' => $validated['etapa_id_destino']]);

        return response()->json([
            'data' => [
                'message' => 'Oportunidade movida com sucesso!', 
                'oportunidade' => $oportunidade
            ]
        ]);
    }

    public function storeOportunidade(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'etapa_id' => 'required|uuid|exists:crm_funil_etapas,id',
            'titulo' => 'required|string|max:255',
            'nome_contato' => 'required|string|max:255',
            'email_contato' => 'nullable|email|max:255',
            'telefone_contato' => 'nullable|string|max:30',
            'valor_estimado' => 'nullable|numeric|min:0',
            'vendedor_id' => 'nullable|uuid|exists:users,id',
        ]);

        $tenantId = $request->user()->tenant_id;

        $etapa = CrmFunilEtapa::whereHas('funil', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId);
        })->findOrFail($validated['etapa_id']);

        $oportunidade = CrmOportunidade::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'funil_id' => $etapa->funil_id,
            'etapa_id' => $etapa->id,
            'vendedor_id' => $validated['vendedor_id'] ?? $request->user()->id,
            'titulo' => $validated['titulo'],
            'nome_contato' => $validated['nome_contato'],
            'email_contato' => $validated['email_contato'] ?? null,
            'telefone_contato' => $validated['telefone_contato'] ?? null,
            'valor_estimado' => (float) ($validated['valor_estimado'] ?? 0),
            'status' => 'ABERTO',
            'origem_lead' => 'MANUAL',
        ]);

        return response()->json(['data' => $oportunidade], 201);
    }

    public function marcarPerdido(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'motivo_perda_id' => 'required|uuid|exists:sis_tabelas_dominio,id',
            'justificativa_perda' => 'nullable|string',
        ]);

        $oportunidade->update([
            'status' => 'PERDIDO',
            'motivo_perda_id' => $validated['motivo_perda_id'],
            'justificativa_perda' => $validated['justificativa_perda'] ?? null,
            'data_fechamento' => now(),
        ]);

        return response()->json(['data' => ['message' => 'Oportunidade marcada como perdida.', 'oportunidade' => $oportunidade]]);
    }

    public function adicionarAtividade(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'tipo' => 'required|string|in:NOTA,LIGACAO,REUNIAO,WHATSAPP,TAREFA',
            'descricao' => 'required|string',
            'data_agendamento' => 'nullable|date',
        ]);

        $atividade = CrmOportunidadeAtividade::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'oportunidade_id' => $oportunidade->id,
            'usuario_id' => $request->user()->id,
            'tipo' => $validated['tipo'],
            'descricao' => $validated['descricao'],
            'data_agendamento' => $validated['data_agendamento'] ?? null,
            'is_concluida' => empty($validated['data_agendamento']),
        ]);

        return response()->json(['data' => $atividade->load('usuario:id,name')], 201);
    }

    public function toggleAtividade(Request $request, string $id, string $atividadeId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $atividade = CrmOportunidadeAtividade::where('tenant_id', $tenantId)
            ->where('oportunidade_id', $id)
            ->findOrFail($atividadeId);

        $atividade->update(['is_concluida' => !$atividade->is_concluida]);

        return response()->json(['data' => $atividade]);
    }

    public function converterParaOrcamento(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);

        try {
            return DB::transaction(function () use ($oportunidade, $tenantId, $request) {
                $clienteId = $oportunidade->cliente_id;

                if (!$clienteId) {
                    $cpfAleatorio = 'CRM' . strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 8));

                    $pessoa = Pessoa::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'tipo_pessoa' => 'PF',
                        'nome_razao_social' => $oportunidade->nome_contato,
                        'cpf_cnpj' => $cpfAleatorio,
                        'email_principal' => $oportunidade->email_contato,
                        'telefone_principal' => $oportunidade->telefone_contato,
                        'is_cliente' => true,
                        'is_ativo' => true,
                    ]);
                    $clienteId = $pessoa->id;
                    $oportunidade->update(['cliente_id' => $clienteId]);
                }

                $empresaId = $request->user()->empresa_padrao_id 
                          ?? Empresa::where('tenant_id', $tenantId)->first()?->id 
                          ?? Empresa::first()?->id;

                $depositoId = Deposito::where('tenant_id', $tenantId)->where('is_padrao', true)->first()?->id
                           ?? Deposito::where('tenant_id', $tenantId)->first()?->id
                           ?? Deposito::first()?->id;

                $ultimoNumero = PedidoVenda::withoutGlobalScopes()->where('tenant_id', $tenantId)->max('numero_pedido') ?? 1000;
                $valorEstimado = (float) ($oportunidade->valor_estimado ?? 0);

                $orcamento = PedidoVenda::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'cliente_id' => $clienteId,
                    'vendedor_id' => $oportunidade->vendedor_id ?? $request->user()->id,
                    'deposito_saida_id' => $depositoId,
                    'tipo_documento' => 'ORCAMENTO',
                    'numero_pedido' => (int) ($ultimoNumero + 1),
                    'status' => 'ORCAMENTO',
                    'data_emissao' => now(),
                    'valor_subtotal_itens' => $valorEstimado,
                    'valor_frete' => 0.00,
                    'valor_seguro' => 0.00,
                    'valor_outras_despesas' => 0.00,
                    'percentual_desconto' => 0.00,
                    'valor_desconto' => 0.00,
                    'valor_total_liquido' => $valorEstimado,
                    'observacoes' => "Orçamento gerado a partir da Oportunidade CRM: {$oportunidade->titulo}",
                ]);

                $oportunidade->update([
                    'status' => 'GANHO',
                    'data_fechamento' => now()
                ]);

                return response()->json([
                    'data' => [
                        'message' => "Orçamento #{$orcamento->numero_pedido} gerado com sucesso!",
                        'orcamento_id' => $orcamento->id
                    ]
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao converter lead: ' . $e->getMessage()], 500);
        }
    }

    private static function garantirMotivosPerdaPadrao(string $tenantId): void
    {
        $padroes = [
            ['codigo' => 'PRECO_ALTO', 'nome' => 'Preço Acima do Orçamento', 'cor' => '#ef4444'],
            ['codigo' => 'CONCORRENTE', 'nome' => 'Fechou com Concorrente', 'cor' => '#f97316'],
            ['codigo' => 'SEM_RETORNO', 'nome' => 'Lead Parou de Responder', 'cor' => '#64748b'],
            ['codigo' => 'SEM_INTERESSE', 'nome' => 'Sem Interesse / Projeto Cancelado', 'cor' => '#a855f7'],
        ];

        $qtd = TabelaDominio::where('tenant_id', $tenantId)->where('tipo_lista', 'CRM_MOTIVO_PERDA')->count();
        if ($qtd === 0) {
            foreach ($padroes as $idx => $p) {
                TabelaDominio::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'tipo_lista' => 'CRM_MOTIVO_PERDA',
                    'codigo' => $p['codigo'],
                    'nome' => $p['nome'],
                    'cor_hex' => $p['cor'],
                    'ordem_exibicao' => $idx + 1,
                    'is_ativo' => true,
                    'is_sistema' => true,
                ]);
            }
        }
    }
}