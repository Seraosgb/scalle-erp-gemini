<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmFunil;
use App\Models\CrmOportunidade;
use App\Models\Pessoa;
use App\Models\Venda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\PedidoVenda;
use App\Models\Empresa;
use App\Models\Deposito;

class CrmController extends Controller
{
    // Retorna o Board Completo (Funil + Etapas + Cards)
    public function board(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $funil = CrmFunil::where('tenant_id', $tenantId)
            ->with(['etapas.oportunidades' => function ($q) {
                $q->where('status', 'ABERTO')->orderByDesc('created_at');
            }])
            ->first();

        // 1. Cria o funil se não existir
        if (!$funil) {
            $funil = CrmFunil::create([
                'tenant_id' => $tenantId,
                'nome' => 'Funil Comercial Padrão',
                'token_captacao' => Str::random(40),
                'is_padrao' => true,
            ]);
        }

        // 2. Garante a existência de todas as etapas padrão no funil
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
                    'tenant_id' => $tenantId,
                    'nome' => $nomeEtapa,
                    'ordem_exibicao' => $ordem
                ]);
            }
        }

        // 3. Recarrega as etapas ordenadas com as oportunidades
        $funil->load(['etapas' => function ($q) {
            $q->orderBy('ordem_exibicao', 'asc');
        }, 'etapas.oportunidades' => function ($q) {
            $q->where('status', 'ABERTO')->orderByDesc('created_at');
        }]);

        return response()->json(['data' => $funil]);
    }

    // Move o Card no Drag-and-Drop
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

    // Converte o Lead em um Orçamento e um Cliente Oficial
    public function converterParaOrcamento(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $oportunidade = CrmOportunidade::where('tenant_id', $tenantId)->findOrFail($id);

        DB::beginTransaction();
        try {
            // 1. Cria ou recupera o Cliente (Pessoa)
            $clienteId = $oportunidade->cliente_id;
            
            if (!$clienteId) {
                $pessoa = Pessoa::create([
                    'tenant_id' => $tenantId,
                    'tipo_pessoa' => 'PF', // Padrão PF (2 caracteres)
                    'nome_razao_social' => $oportunidade->nome_contato,
                    'cpf_cnpj' => '00000000000', // CPF Padrão Provisório
                    'email_principal' => $oportunidade->email_contato, 
                    'telefone_principal' => $oportunidade->telefone_contato,
                    'is_cliente' => true,
                    'is_ativo' => true,
                ]);
                $clienteId = $pessoa->id;
                
                $oportunidade->update(['cliente_id' => $clienteId]);
            }

            // 2. Resolve Empresa e Depósito Padrão para o Pedido/Orçamento
            $empresaId = $request->user()->empresa_padrao_id 
                      ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

            $depositoId = Deposito::where('tenant_id', $tenantId)->where('is_padrao', true)->first()?->id
                       ?? Deposito::where('tenant_id', $tenantId)->first()?->id;

            $ultimoNumero = PedidoVenda::where('tenant_id', $tenantId)->max('numero_pedido') ?? 1000;

            // 3. Cria o Orçamento na tabela correta (ven_pedidos)
            $orcamento = PedidoVenda::create([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'cliente_id' => $clienteId,
                'vendedor_id' => $request->user()->id,
                'deposito_saida_id' => $depositoId,
                'tipo_documento' => 'ORCAMENTO',
                'numero_pedido' => $ultimoNumero + 1,
                'status' => 'ORCAMENTO', 
                'data_emissao' => now(),
                'valor_subtotal_itens' => (float) $oportunidade->valor_estimado,
                'valor_total_liquido' => (float) $oportunidade->valor_estimado,
                'observacoes' => "Orçamento gerado a partir da Oportunidade CRM: {$oportunidade->titulo}",
            ]);

            // 4. Marca a Oportunidade como GANHO
            $oportunidade->update(['status' => 'GANHO']);

            DB::commit();

            return response()->json([
                'data' => [
                    'message' => "Orçamento #{$orcamento->numero_pedido} gerado com sucesso!",
                    'orcamento_id' => $orcamento->id
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao converter lead: ' . $e->getMessage()], 500);
        }
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
        ]);

        $tenantId = $request->user()->tenant_id;

        // Recupera a etapa garantindo isolamento de tenant via relacionamento do Funil
        $etapa = \App\Models\CrmFunilEtapa::whereHas('funil', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId);
        })->findOrFail($validated['etapa_id']);

        $oportunidade = CrmOportunidade::create([
            'tenant_id' => $tenantId,
            'funil_id' => $etapa->funil_id,
            'etapa_id' => $etapa->id,
            'vendedor_id' => $request->user()->id,
            'titulo' => $validated['titulo'],
            'nome_contato' => $validated['nome_contato'],
            'email_contato' => $validated['email_contato'] ?? null,
            'telefone_contato' => $validated['telefone_contato'] ?? null,
            'valor_estimado' => $validated['valor_estimado'] ?? 0,
            'status' => 'ABERTO',
            'origem_lead' => 'MANUAL',
        ]);

        return response()->json(['data' => $oportunidade], 201);
    }
}