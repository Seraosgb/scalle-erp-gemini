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

class CrmController extends Controller
{
    // Retorna o Board Completo (Funil + Etapas + Cards)
    public function board(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        // Buscamos o funil e as etapas sem forçar o eager loading de 'vendedor' e 'cliente' 
        // para evitar quebras por colunas não mapeadas
        $funil = CrmFunil::where('tenant_id', $tenantId)
            ->with(['etapas.oportunidades' => function ($q) {
                $q->where('status', 'ABERTO')->orderByDesc('created_at');
            }])
            ->first();

        // Auto-provisionamento de Funil Padrão se o cliente não tiver nenhum
        if (!$funil) {
            $funil = CrmFunil::create([
                'tenant_id' => $tenantId,
                'nome' => 'Funil Comercial Padrão',
                'token_captacao' => Str::random(40),
                'is_padrao' => true,
            ]);

            $etapas = ['Prospecção', 'Qualificação', 'Apresentação', 'Negociação'];
            foreach ($etapas as $i => $nome) {
                $funil->etapas()->create(['nome' => $nome, 'ordem_exibicao' => $i + 1]);
            }
            
            // Recarrega os dados fresquinhos recém-criados
            $funil->load(['etapas.oportunidades' => function ($q) {
                $q->where('status', 'ABERTO');
            }]);
        }

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
                // Usando as colunas exatas blindadas no seu model Pessoa
                $pessoa = Pessoa::create([
                    'tenant_id' => $tenantId,
                    'tipo_pessoa' => 'FISICA', 
                    'nome_razao_social' => $oportunidade->nome_contato,
                    'email_principal' => $oportunidade->email_contato, 
                    'telefone_principal' => $oportunidade->telefone_contato,
                    'is_cliente' => true,
                    'is_ativo' => true,
                ]);
                $clienteId = $pessoa->id;
                
                // Atualiza a oportunidade com o novo cliente amarrado
                $oportunidade->update(['cliente_id' => $clienteId]);
            }

            // 2. Cria o Orçamento na tabela de Vendas
            $orcamento = Venda::create([
                'tenant_id' => $tenantId,
                'pessoa_id' => $clienteId,
                'vendedor_id' => $request->user()->id,
                'status' => 'ORCAMENTO', 
                'valor_total' => $oportunidade->valor_estimado,
                'observacoes' => "Orçamento gerado a partir do Lead CRM: {$oportunidade->titulo}",
            ]);

            // 3. Atualiza o status do Lead para fechar o ciclo
            $oportunidade->update(['status' => 'GANHO']);

            DB::commit();

            return response()->json([
                'data' => [
                    'message' => 'Orçamento gerado com sucesso!',
                    'orcamento_id' => $orcamento->id
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao converter lead: ' . $e->getMessage()], 500);
        }
    }
}