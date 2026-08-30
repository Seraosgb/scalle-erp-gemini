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
    /**
     * RBAC Helper: valida se o usuário tem perfil de gestão no sistema
     */
    private function autorizarGestao(Request $request): void
    {
        $usuario = $request->user();

        if (!$usuario) {
            abort(401, 'Usuário não autenticado.');
        }

        // 1. Verificação de flags diretas (Master SaaS ou Admin)
        if (($usuario->is_master ?? false) || ($usuario->is_admin ?? false)) {
            return;
        }

        // 2. Extração segura do nome/código do perfil
        $perfilNome = '';
        if (is_object($usuario->perfil)) {
            $perfilNome = $usuario->perfil->nome ?? $usuario->perfil->codigo ?? $usuario->perfil->slug ?? '';
        } elseif (is_string($usuario->perfil)) {
            $perfilNome = $usuario->perfil;
        }

        $role = is_string($usuario->role ?? null) ? $usuario->role : '';

        $cargosPermitidos = [
            'ADMIN',
            'ADMINISTRADOR',
            'GESTOR_COMERCIAL',
            'GERENTE',
            'GERENTE_COMERCIAL',
            'DIRETOR',
            'MASTER',
            'SAAS_OWNER'
        ];

        $perfilUpper = strtoupper(trim((string)$perfilNome));
        $roleUpper = strtoupper(trim((string)$role));

        $autorizado = in_array($perfilUpper, $cargosPermitidos, true) 
                   || in_array($roleUpper, $cargosPermitidos, true)
                   || str_contains($perfilUpper, 'ADMIN')
                   || str_contains($perfilUpper, 'GESTOR')
                   || str_contains($perfilUpper, 'GERENTE');

        if (!$autorizado) {
            abort(403, 'Ação restrita a Administradores e Gestores Comerciais.');
        }
    }

    public function listarPipelines(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pipelines = CrmFunil::where('tenant_id', $tenantId)
            ->where('is_ativo', true)
            ->withCount('etapas')
            ->orderByDesc('is_padrao')
            ->orderBy('nome')
            ->get();

        return response()->json(['data' => $pipelines]);
    }

    public function storePipeline(Request $request): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'nome' => 'required|string|max:150',
            'descricao' => 'nullable|string|max:255',
            'cor_hex' => 'nullable|string|max:10',
        ]);

        $pipeline = DB::transaction(function () use ($validated, $tenantId) {
            $pipe = CrmFunil::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'nome' => $validated['nome'],
                'descricao' => $validated['descricao'] ?? null,
                'cor_hex' => $validated['cor_hex'] ?? '#4f46e5',
                'token_captacao' => Str::random(40),
                'is_padrao' => false,
                'is_ativo' => true,
            ]);

            $etapas = [
                ['nome' => 'Descoberta / Prospecção', 'ordem' => 1, 'prob' => 20, 'cor' => '#6366f1'],
                ['nome' => 'Qualificação Técnica', 'ordem' => 2, 'prob' => 40, 'cor' => '#3b82f6'],
                ['nome' => 'Proposta Comercial', 'ordem' => 3, 'prob' => 70, 'cor' => '#f59e0b'],
                ['nome' => 'Negociação / Fechamento', 'ordem' => 4, 'prob' => 90, 'cor' => '#10b981'],
            ];

            foreach ($etapas as $e) {
                CrmFunilEtapa::create([
                    'id' => (string) Str::uuid(),
                    'funil_id' => $pipe->id,
                    'nome' => $e['nome'],
                    'ordem_exibicao' => $e['ordem'],
                    'probabilidade_fechamento' => $e['prob'],
                    'cor_hex' => $e['cor'],
                ]);
            }

            return $pipe;
        });

        return response()->json(['data' => $pipeline->load('etapas')], 201);
    }

    public function atualizarPipeline(Request $request, string $id): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;
        $pipeline = CrmFunil::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:150',
            'descricao' => 'nullable|string|max:255',
            'cor_hex' => 'nullable|string|max:10',
        ]);

        $pipeline->update($validated);

        return response()->json(['data' => $pipeline]);
    }

    // --- GESTÃO DINÂMICA DE ETAPAS (RBAC) ---

    public function storeEtapa(Request $request, string $pipelineId): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;
        $pipeline = CrmFunil::where('tenant_id', $tenantId)->findOrFail($pipelineId);

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'probabilidade_fechamento' => 'required|integer|min:0|max:100',
            'cor_hex' => 'nullable|string|max:10',
        ]);

        $maxOrdem = CrmFunilEtapa::where('funil_id', $pipeline->id)->max('ordem_exibicao') ?? 0;

        $etapa = CrmFunilEtapa::create([
            'id' => (string) Str::uuid(),
            'funil_id' => $pipeline->id,
            'nome' => $validated['nome'],
            'ordem_exibicao' => $maxOrdem + 1,
            'probabilidade_fechamento' => $validated['probabilidade_fechamento'],
            'cor_hex' => $validated['cor_hex'] ?? '#6366f1',
        ]);

        return response()->json(['data' => $etapa], 201);
    }

    public function updateEtapa(Request $request, string $id): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;

        $etapa = CrmFunilEtapa::whereHas('funil', fn($q) => $q->where('tenant_id', $tenantId))->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'probabilidade_fechamento' => 'required|integer|min:0|max:100',
            'cor_hex' => 'nullable|string|max:10',
            'ordem_exibicao' => 'nullable|integer',
        ]);

        $etapa->update($validated);

        return response()->json(['data' => $etapa]);
    }

    public function destroyEtapa(Request $request, string $id): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;

        $etapa = CrmFunilEtapa::whereHas('funil', fn($q) => $q->where('tenant_id', $tenantId))->findOrFail($id);

        $temCards = CrmOportunidade::where('etapa_id', $etapa->id)->exists();
        if ($temCards) {
            return response()->json(['error' => 'Não é possível remover etapa com oportunidades vinculadas.'], 422);
        }

        $etapa->delete();

        return response()->json(['data' => ['message' => 'Etapa removida com sucesso.']]);
    }

    public function reordenarEtapas(Request $request, string $pipelineId): JsonResponse
    {
        $this->autorizarGestao($request);
        $tenantId = $request->user()->tenant_id;
        $pipeline = CrmFunil::where('tenant_id', $tenantId)->findOrFail($pipelineId);

        $validated = $request->validate([
            'etapas' => 'required|array',
            'etapas.*.id' => 'required|uuid|exists:crm_funil_etapas,id',
            'etapas.*.ordem_exibicao' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated, $pipeline) {
            foreach ($validated['etapas'] as $item) {
                CrmFunilEtapa::where('id', $item['id'])
                    ->where('funil_id', $pipeline->id)
                    ->update(['ordem_exibicao' => $item['ordem_exibicao']]);
            }
        });

        return response()->json(['data' => ['message' => 'Ordem das etapas atualizada com sucesso.']]);
    }

    // --- BOARD KANBAN COM FORECAST PONDERADO ---

    public function board(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pipelineId = $request->get('pipeline_id');
        $statusFiltro = $request->get('status', 'ABERTO');
        $vendedorId = $request->get('vendedor_id');
        $search = $request->get('search');

        $queryPipeline = CrmFunil::where('tenant_id', $tenantId)->where('is_ativo', true);
        if (!empty($pipelineId)) {
            $queryPipeline->where('id', $pipelineId);
        } else {
            $queryPipeline->orderByDesc('is_padrao');
        }

        $pipeline = $queryPipeline->first();

        if (!$pipeline) {
            $pipeline = CrmFunil::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'nome' => 'Pipeline Comercial Principal',
                'descricao' => 'Fluxo mestre de prospecção e vendas',
                'token_captacao' => Str::random(40),
                'is_padrao' => true,
                'is_ativo' => true,
            ]);
        }

        $etapasExistentes = CrmFunilEtapa::where('funil_id', $pipeline->id)->count();
        if ($etapasExistentes === 0) {
            $etapas = [
                ['nome' => 'Descoberta / Prospecção', 'ordem' => 1, 'prob' => 20, 'cor' => '#6366f1'],
                ['nome' => 'Qualificação Técnica', 'ordem' => 2, 'prob' => 40, 'cor' => '#3b82f6'],
                ['nome' => 'Proposta Comercial', 'ordem' => 3, 'prob' => 70, 'cor' => '#f59e0b'],
                ['nome' => 'Negociação / Fechamento', 'ordem' => 4, 'prob' => 90, 'cor' => '#10b981'],
            ];
            foreach ($etapas as $e) {
                CrmFunilEtapa::create([
                    'id' => (string) Str::uuid(),
                    'funil_id' => $pipeline->id,
                    'nome' => $e['nome'],
                    'ordem_exibicao' => $e['ordem'],
                    'probabilidade_fechamento' => $e['prob'],
                    'cor_hex' => $e['cor'],
                ]);
            }
        }

        $pipelineCarregado = CrmFunil::where('id', $pipeline->id)
            ->with(['etapas' => function ($queryEtapa) use ($statusFiltro, $vendedorId, $search, $tenantId) {
                $queryEtapa->orderBy('ordem_exibicao', 'asc')
                    ->with(['oportunidades' => function ($q) use ($statusFiltro, $vendedorId, $search, $tenantId) {
                        $q->where('tenant_id', $tenantId);
                        if ($statusFiltro !== 'TODOS') {
                            $q->where('status', $statusFiltro);
                        }
                        if (!empty($vendedorId)) {
                            $q->where('vendedor_id', $vendedorId);
                        }
                        if (!empty($search)) {
                            $q->where(function ($sub) use ($search) {
                                $sub->where('titulo', 'ILIKE', "%{$search}%")
                                    ->orWhere('nome_contato', 'ILIKE', "%{$search}%")
                                    ->orWhere('telefone_contato', 'ILIKE', "%{$search}%");
                            });
                        }
                        $q->with(['vendedor:id,name', 'atividades'])
                          ->orderByDesc('created_at');
                    }]);
            }])
            ->first();

        $todosPipelines = CrmFunil::where('tenant_id', $tenantId)->where('is_ativo', true)->orderBy('nome')->get(['id', 'nome', 'is_padrao', 'token_captacao']);

        self::garantirMotivosPerdaPadrao($tenantId);
        $motivosPerda = TabelaDominio::where('tenant_id', $tenantId)
            ->where('tipo_lista', 'CRM_MOTIVO_PERDA')
            ->where('is_ativo', true)
            ->get();

        $vendedores = User::where('tenant_id', $tenantId)->where('is_ativo', true)->get(['id', 'name']);
        
        $usuarioLogado = $request->user();
        
        $perfilNome = is_object($usuarioLogado->perfil) 
            ? ($usuarioLogado->perfil->nome ?? $usuarioLogado->perfil->codigo ?? '') 
            : ($usuarioLogado->perfil ?? '');
            
        $perfilUpper = strtoupper(trim((string)$perfilNome));
        $roleUpper = strtoupper(trim((string)($usuarioLogado->role ?? '')));

        $isGestor = ($usuarioLogado->is_master ?? false) 
                 || ($usuarioLogado->is_admin ?? false)
                 || in_array($perfilUpper, ['ADMIN', 'ADMINISTRADOR', 'GESTOR_COMERCIAL', 'GERENTE', 'GERENTE_COMERCIAL', 'DIRETOR', 'MASTER', 'SAAS_OWNER'], true)
                 || in_array($roleUpper, ['ADMIN', 'GESTOR_COMERCIAL', 'GERENTE'], true)
                 || str_contains($perfilUpper, 'ADMIN')
                 || str_contains($perfilUpper, 'GESTOR')
                 || str_contains($perfilUpper, 'GERENTE');

        return response()->json([
            'data' => [
                'pipeline' => $pipelineCarregado,
                'pipelines_disponiveis' => $todosPipelines,
                'motivos_perda' => $motivosPerda,
                'vendedores' => $vendedores,
                'permissoes' => [
                    'pode_gerenciar_pipeline' => $isGestor,
                ]
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

        return response()->json(['data' => ['message' => 'Oportunidade movida com sucesso!', 'oportunidade' => $oportunidade]]);
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
        $etapa = CrmFunilEtapa::whereHas('funil', fn($q) => $q->where('tenant_id', $tenantId))->findOrFail($validated['etapa_id']);

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
                    'observacoes' => "Orçamento gerado a partir do Pipeline CRM: {$oportunidade->titulo}",
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
        $atividade = CrmOportunidadeAtividade::where('tenant_id', $tenantId)->where('oportunidade_id', $id)->findOrFail($atividadeId);
        $atividade->update(['is_concluida' => !$atividade->is_concluida]);

        return response()->json(['data' => $atividade]);
    }

    // --- WEBHOOK PÚBLICO DE INBOUND LEADS (LANDING PAGE / APIS) ---

    public function webhookCapturaLead(Request $request, string $token): JsonResponse
    {
        $pipeline = CrmFunil::withoutGlobalScopes()->where('token_captacao', $token)->where('is_ativo', true)->first();

        if (!$pipeline) {
            return response()->json(['error' => 'Token de captação inválido ou inativo.'], 404);
        }

        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'telefone' => 'required|string|max:30',
            'mensagem' => 'nullable|string',
            'valor_estimado' => 'nullable|numeric',
        ]);

        $primeiraEtapa = CrmFunilEtapa::where('funil_id', $pipeline->id)->orderBy('ordem_exibicao')->first();

        if (!$primeiraEtapa) {
            return response()->json(['error' => 'Pipeline sem etapas configuradas.'], 500);
        }

        $oportunidade = CrmOportunidade::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $pipeline->tenant_id,
            'funil_id' => $pipeline->id,
            'etapa_id' => $primeiraEtapa->id,
            'titulo' => 'Inbound: ' . ($validated['nome'] ?? 'Novo Lead'),
            'nome_contato' => $validated['nome'],
            'email_contato' => $validated['email'] ?? null,
            'telefone_contato' => $validated['telefone'],
            'valor_estimado' => (float) ($validated['valor_estimado'] ?? 0),
            'status' => 'ABERTO',
            'origem_lead' => 'LANDING_PAGE',
            'observacoes' => $validated['mensagem'] ?? 'Lead recebido via Landing Page Comercial',
        ]);

        if (!empty($validated['mensagem'])) {
            CrmOportunidadeAtividade::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $pipeline->tenant_id,
                'oportunidade_id' => $oportunidade->id,
                'tipo' => 'NOTA',
                'descricao' => 'Mensagem do Formulário: ' . $validated['mensagem'],
                'is_concluida' => true,
            ]);
        }

        return response()->json([
            'data' => [
                'message' => 'Lead capturado com sucesso!',
                'oportunidade_id' => $oportunidade->id
            ]
        ], 201);
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