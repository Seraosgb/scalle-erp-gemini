<?php

namespace App\Services;

use App\Models\EstoqueDeposito;
use App\Models\EstruturaItem;
use App\Models\OrdemProducao;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;

class ProducaoPcpService
{
    /**
     * Reserva insumos no almoxarifado de origem ao criar/planejar a OP
     */
    public static function reservarInsumos(OrdemProducao $op): void
    {
        $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();

        foreach ($estruturas as $est) {
            $fatorPerda = 1 + ((float) $est->percentual_perda_estimada / 100);
            $qtdNecessaria = ((float) $est->quantidade_necessaria * (float) $op->quantidade_planejada) * $fatorPerda;

            $saldo = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                ->where('item_id', $est->insumo_filho_id)
                ->lockForUpdate()
                ->first();

            if ($saldo) {
                $saldo->increment('quantidade_reservada', $qtdNecessaria);
            }
        }
    }

    /**
     * Estorna reserva de insumos ao cancelar ou excluir a OP
     */
    public static function estornarReservaInsumos(OrdemProducao $op): void
    {
        $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();

        foreach ($estruturas as $est) {
            $fatorPerda = 1 + ((float) $est->percentual_perda_estimada / 100);
            $qtdNecessaria = ((float) $est->quantidade_necessaria * (float) $op->quantidade_planejada) * $fatorPerda;

            $saldo = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                ->where('item_id', $est->insumo_filho_id)
                ->lockForUpdate()
                ->first();

            if ($saldo) {
                $saldo->decrement('quantidade_reservada', min((float) $saldo->quantidade_reservada, $qtdNecessaria));
            }
        }
    }

    /**
     * Conclui a Ordem de Produção: consome insumos e estoca o produto acabado com recálculo de custo médio
     */
    public static function finalizarProducao(
        OrdemProducao $op,
        float $quantidadeProduzida,
        float $quantidadeRefugo = 0.00,
        ?User $responsavel = null
    ): OrdemProducao {
        return DB::transaction(function () use ($op, $quantidadeProduzida, $quantidadeRefugo, $responsavel) {
            $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();

            if ($estruturas->isEmpty()) {
                throw new Exception("O produto acabado não possui ficha técnica (BOM) cadastrada.");
            }

            $custoTotalProducao = 0.00;
            $totalFabricado = $quantidadeProduzida + $quantidadeRefugo;

            // 1. Desfazer reserva prévia e realizar a baixa física real no WMS
            foreach ($estruturas as $est) {
                $fatorPerda = 1 + ((float) $est->percentual_perda_estimada / 100);
                $qtdConsumida = ((float) $est->quantidade_necessaria * $totalFabricado) * $fatorPerda;

                $insumo = $est->insumo;
                $custoInsumo = (float) ($insumo->preco_custo > 0 ? $insumo->preco_custo : $insumo->custo_medio);
                $custoTotalProducao += ($qtdConsumida * $custoInsumo);

                // Baixa de reserva
                $saldoReserva = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                    ->where('item_id', $est->insumo_filho_id)
                    ->lockForUpdate()
                    ->first();

                if ($saldoReserva) {
                    $saldoReserva->decrement('quantidade_reservada', min((float)$saldoReserva->quantidade_reservada, $qtdConsumida));
                }

                // Baixa física definitiva
                EstoqueService::movimentar(
                    $op->deposito_origem_id,
                    $est->insumo_filho_id,
                    $qtdConsumida,
                    'SAIDA_VENDA', // Consumo industrial
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    null,
                    $custoInsumo
                );
            }

            // 2. Dar entrada do produto acabado estocado (apenas as unidades boas/aprovadas)
            $custoUnitarioCalculado = $quantidadeProduzida > 0 ? ($custoTotalProducao / $quantidadeProduzida) : 0.00;

            if ($quantidadeProduzida > 0) {
                EstoqueService::movimentar(
                    $op->deposito_destino_id,
                    $op->produto_id,
                    $quantidadeProduzida,
                    'ENTRADA_COMPRA', // Manufatura acabada
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    null,
                    $custoUnitarioCalculado
                );
            }

            // 3. Atualizar e encerrar a OP
            $op->update([
                'status' => 'CONCLUIDA',
                'quantidade_produzida' => $quantidadeProduzida,
                'custo_total_real' => $custoTotalProducao,
                'data_fim_real' => now(),
                'observacoes' => ($op->observacoes ? $op->observacoes . ' | ' : '') . ($quantidadeRefugo > 0 ? "Refugo/Perdas apontadas: {$quantidadeRefugo} UN" : "Lote 100% aprovado"),
            ]);

            return $op;
        });
    }
}