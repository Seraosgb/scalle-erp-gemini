<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CentroCusto;
use App\Models\PlanoConta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ControladoriaController extends Controller
{
    // ==========================================
    // PLANO DE CONTAS
    // ==========================================
    public function indexPlanosContas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $planos = PlanoConta::where('tenant_id', $tenantId)
            ->whereNull('parent_id')
            ->with('children.children')
            ->orderBy('codigo')
            ->get();

        return response()->json(['data' => $planos]);
    }

    public function storePlanoConta(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'parent_id' => 'nullable|uuid|exists:fin_planos_contas,id',
            'codigo' => 'required|string|max:50',
            'nome' => 'required|string|max:150',
            'tipo' => 'required|string|in:RECEITA,DESPESA,ATIVO,PASSIVO',
            'is_sintetico' => 'boolean'
        ]);

        $plano = PlanoConta::create(array_merge($validated, [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId
        ]));

        return response()->json(['data' => $plano], 201);
    }

    // ==========================================
    // CENTROS DE CUSTO
    // ==========================================
    public function indexCentrosCustos(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $centros = CentroCusto::where('tenant_id', $tenantId)
            ->whereNull('parent_id')
            ->with('children.children')
            ->orderBy('codigo')
            ->get();

        return response()->json(['data' => $centros]);
    }

    public function storeCentroCusto(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
            'parent_id' => 'nullable|uuid|exists:fin_centros_custos,id',
            'codigo' => 'required|string|max:50',
            'nome' => 'required|string|max:150',
            'is_sintetico' => 'boolean'
        ]);

        $centro = CentroCusto::create(array_merge($validated, [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId
        ]));

        return response()->json(['data' => $centro], 201);
    }

    // ==========================================
    // ONBOARDING: GERADOR AUTOMÁTICO
    // ==========================================
    public function gerarEstruturaPadrao(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        if (\App\Models\PlanoConta::where('tenant_id', $tenantId)->exists()) {
            return response()->json(['error' => ['message' => 'O Tenant já possui uma estrutura de contas cadastrada.']], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($tenantId) {
            // 1. RECEITAS
            $receitaId = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $receitaId, 'tenant_id' => $tenantId, 'codigo' => '1', 'nome' => 'Receitas', 'tipo' => 'RECEITA', 'is_sintetico' => true]);

            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $receitaId, 'codigo' => '1.01', 'nome' => 'Receitas Operacionais (Serviços)', 'tipo' => 'RECEITA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $receitaId, 'codigo' => '1.02', 'nome' => 'Receitas com Vendas (Produtos)', 'tipo' => 'RECEITA', 'is_sintetico' => false]);

            // 2. DESPESAS E CUSTOS
            $despesaId = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $despesaId, 'tenant_id' => $tenantId, 'codigo' => '2', 'nome' => 'Custos e Despesas', 'tipo' => 'DESPESA', 'is_sintetico' => true]);

            $custoOp = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $custoOp, 'tenant_id' => $tenantId, 'parent_id' => $despesaId, 'codigo' => '2.01', 'nome' => 'Custos Operacionais', 'tipo' => 'DESPESA', 'is_sintetico' => true]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $custoOp, 'codigo' => '2.01.01', 'nome' => 'Compra de Mercadorias / Insumos', 'tipo' => 'DESPESA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $custoOp, 'codigo' => '2.01.02', 'nome' => 'Folha de Pagamento e Encargos', 'tipo' => 'DESPESA', 'is_sintetico' => false]);

            $despesaAdm = (string) Str::uuid();
            \App\Models\PlanoConta::create(['id' => $despesaAdm, 'tenant_id' => $tenantId, 'parent_id' => $despesaId, 'codigo' => '2.02', 'nome' => 'Despesas Administrativas', 'tipo' => 'DESPESA', 'is_sintetico' => true]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $despesaAdm, 'codigo' => '2.02.01', 'nome' => 'Água, Luz, Telefone e Internet', 'tipo' => 'DESPESA', 'is_sintetico' => false]);
            \App\Models\PlanoConta::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $despesaAdm, 'codigo' => '2.02.02', 'nome' => 'Softwares e Assinaturas (SaaS)', 'tipo' => 'DESPESA', 'is_sintetico' => false]);

            // 3. CENTRO DE CUSTO BASE
            $ccRaiz = (string) Str::uuid();
            \App\Models\CentroCusto::create(['id' => $ccRaiz, 'tenant_id' => $tenantId, 'codigo' => '01', 'nome' => 'Matriz Operacional', 'is_sintetico' => true]);
            \App\Models\CentroCusto::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $ccRaiz, 'codigo' => '01.01', 'nome' => 'Administrativo & Diretoria', 'is_sintetico' => false]);
            \App\Models\CentroCusto::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'parent_id' => $ccRaiz, 'codigo' => '01.02', 'nome' => 'Operação & Logística', 'is_sintetico' => false]);
        });

        return response()->json(['data' => ['message' => 'Estrutura contábil e de centros de custo gerada com sucesso!']]);
    }

    // ==========================================
    // CONCILIAÇÃO BANCÁRIA
    // ==========================================
    public function conciliarManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conta_financeira_id' => 'required|uuid|exists:fin_contas_financeiras,id',
            'plano_conta_id' => 'required|uuid|exists:fin_planos_contas,id',
            'centro_custo_id' => 'required|uuid|exists:fin_centros_custos,id',
            'descricao' => 'required|string|max:200',
            'valor' => 'required|numeric|min:0.01',
            'natureza' => 'required|string|in:PAGAR,RECEBER',
            'data_transacao' => 'required|date',
            'id_transacao_banco' => 'required|string',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()->id;

        try {
            $titulo = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $tenantId, $empresaId) {

                $novoTitulo = \App\Models\TituloFinanceiro::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'empresa_id' => $empresaId,
                    'plano_conta_id' => $validated['plano_conta_id'],
                    'centro_custo_id' => $validated['centro_custo_id'],
                    'natureza' => $validated['natureza'],
                    'documento_numero' => 'OFX-' . substr($validated['id_transacao_banco'], -8),
                    'parcela_numero' => 1,
                    'total_parcelas' => 1,
                    'data_emissao' => $validated['data_transacao'],
                    'data_vencimento' => $validated['data_transacao'],
                    'valor_original' => $validated['valor'],
                    'valor_saldo_aberto' => 0,
                    'valor_pago_acumulado' => $validated['valor'],
                    'status' => 'LIQUIDADO',
                    'data_liquidacao' => $validated['data_transacao'],
                    'historico' => 'Conciliação Avulsa OFX: ' . $validated['descricao'],
                ]);

                $conta = \App\Models\ContaFinanceira::findOrFail($validated['conta_financeira_id']);
                $tipoMov = $validated['natureza'] === 'PAGAR' ? 'SAIDA' : 'ENTRADA';

                $conta->update([
                    'saldo_atual' => $tipoMov === 'ENTRADA' ? $conta->saldo_atual + $validated['valor'] : $conta->saldo_atual - $validated['valor']
                ]);

                return $novoTitulo;
            });

            return response()->json(['data' => ['message' => 'Lançamento avulso criado e conciliado!', 'titulo' => $titulo]]);
        } catch (\Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    // ==========================================
    // MOTOR DA DRE (INTELIGÊNCIA FINANCEIRA)
    // ==========================================
    public function gerarDre(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id ?? \App\Models\Empresa::where('tenant_id', $tenantId)->first()->id;

        $validated = $request->validate([
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
            'regime' => 'required|string|in:CAIXA,COMPETENCIA'
        ]);

        $dataInicio = $validated['data_inicio'];
        $dataFim = $validated['data_fim'];
        $isCaixa = $validated['regime'] === 'CAIXA';

        // 1. Coleta os títulos financeiros enquadrados no período e regime
        $queryTitulos = \App\Models\TituloFinanceiro::where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->whereNotNull('plano_conta_id');

        if ($isCaixa) {
            $queryTitulos->where('status', 'LIQUIDADO')
                         ->whereBetween('data_liquidacao', [$dataInicio, $dataFim]);
        } else {
            $queryTitulos->whereBetween('data_emissao', [$dataInicio, $dataFim]);
        }

        $titulos = $queryTitulos->get(['plano_conta_id', 'valor_pago_acumulado', 'valor_original']);

        // 2. Agrupa valores absolutos direto no ID da conta analítica
        $somasPorConta = [];
        foreach ($titulos as $t) {
            $contaId = $t->plano_conta_id;
            if (!isset($somasPorConta[$contaId])) {
                $somasPorConta[$contaId] = 0.00;
            }
            $valor = $isCaixa ? (float) $t->valor_pago_acumulado : (float) $t->valor_original;
            $somasPorConta[$contaId] += $valor;
        }

        // 3. Monta a árvore completa do Plano de Contas
        $planos = PlanoConta::where('tenant_id', $tenantId)
            ->whereNull('parent_id')
            ->with('children.children')
            ->orderBy('codigo')
            ->get();

        // 4. Agregações recursivas de baixo para cima (Analítico para Sintético)
        $calcularSaldosRecursivo = function ($nodos) use (&$calcularSaldosRecursivo, $somasPorConta) {
            $resultado = [];
            $totalNivel = 0.00;

            foreach ($nodos as $nodo) {
                $nodoData = [
                    'id' => $nodo->id,
                    'codigo' => $nodo->codigo,
                    'nome' => $nodo->nome,
                    'tipo' => $nodo->tipo,
                    'is_sintetico' => $nodo->is_sintetico,
                    'valor_total' => 0.00,
                    'children' => []
                ];

                if ($nodo->is_sintetico && $nodo->children->isNotEmpty()) {
                    $filhos = $calcularSaldosRecursivo($nodo->children);
                    $nodoData['children'] = $filhos['nodos'];
                    $nodoData['valor_total'] = $filhos['total_nivel'];
                } else {
                    $nodoData['valor_total'] = $somasPorConta[$nodo->id] ?? 0.00;
                }

                $totalNivel += $nodoData['valor_total'];
                $resultado[] = $nodoData;
            }

            return ['nodos' => $resultado, 'total_nivel' => $totalNivel];
        };

        $arvoreDre = $calcularSaldosRecursivo($planos)['nodos'];

        // 5. Apuração do Resultado Líquido do Exercício
        $totalReceitas = 0.00;
        $totalDespesas = 0.00;

        foreach ($arvoreDre as $nodo) {
            if ($nodo['tipo'] === 'RECEITA') $totalReceitas += $nodo['valor_total'];
            if ($nodo['tipo'] === 'DESPESA') $totalDespesas += $nodo['valor_total'];
        }

        return response()->json([
            'data' => [
                'parametros' => [
                    'regime' => $validated['regime'],
                    'periodo' => "{$dataInicio} a {$dataFim}"
                ],
                'apuracao' => [
                    'receitas_totais' => $totalReceitas,
                    'despesas_totais' => $totalDespesas,
                    'resultado_liquido' => $totalReceitas - $totalDespesas,
                    'lucro' => ($totalReceitas - $totalDespesas) > 0
                ],
                'dre' => $arvoreDre
            ]
        ]);
    }
}
