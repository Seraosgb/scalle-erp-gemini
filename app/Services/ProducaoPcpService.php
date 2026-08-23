<?php

namespace App\Services;

use App\Models\EstruturaItem;
use App\Models\OrdemProducao;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProducaoPcpService
{
    /**
     * Conclui a Ordem de Produção: consome insumos do almoxarifado de matérias-primas e estoca o produto acabado
     */
    public static function finalizarProducao(
        OrdemProducao $op,
        float $quantidadeProduzida,
        ?User $responsavel = null
    ): OrdemProducao {
        return DB::transaction(function () use ($op, $quantidadeProduzida, $responsavel) {
            // 1. Obter a ficha técnica (BOM) do produto acabado
            $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();

            if ($estruturas->isEmpty()) {
                throw new Exception("O produto {$op->produto_id} não possui ficha técnica/estrutura de insumos cadastrada.");
            }

            $custoTotalProducao = 0.00;

            // 2. Dar baixa de cada insumo no depósito de origem
            foreach ($estruturas as $estrutura) {
                $fatorPerda = 1 + ((float) $estrutura->percentual_perda_estimada / 100);
                $qtdConsumida = ((float) $estrutura->quantidade_necessaria * $quantidadeProduzida) * $fatorPerda;

                $insumo = $estrutura->insumo;
                $custoInsumo = (float) $insumo->preco_custo;
                $custoTotalProducao += ($qtdConsumida * $custoInsumo);

                EstoqueService::movimentar(
                    $op->deposito_origem_id,
                    $estrutura->insumo_filho_id,
                    $qtdConsumida,
                    'SAIDA_VENDA', // Movimento de consumo de matéria-prima
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    null,
                    $custoInsumo
                );
            }

            // 3. Dar entrada do produto acabado no depósito de destino
            $custoUnitarioCalculado = $quantidadeProduzida > 0 ? ($custoTotalProducao / $quantidadeProduzida) : 0.00;

            EstoqueService::movimentar(
                $op->deposito_destino_id,
                $op->produto_id,
                $quantidadeProduzida,
                'ENTRADA_COMPRA', // Movimento de entrada de manufatura
                $responsavel?->id,
                'producao',
                $op->id,
                null,
                $custoUnitarioCalculado
            );

            // 4. Concluir a OP
            $op->update([
                'status' => 'CONCLUIDA',
                'quantidade_produzida' => $quantidadeProduzida,
                'custo_total_real' => $custoTotalProducao,
                'data_fim_real' => now(),
            ]);

            return $op;
        });
    }
}