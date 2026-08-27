<?php

namespace App\Services;

use App\Models\EstoqueDeposito;
use App\Models\EstruturaItem;
use App\Models\OrdemProducao;
use App\Models\PcpApontamento;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProducaoPcpService
{
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

    public static function estornarReservaInsumos(OrdemProducao $op): void
    {
        $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();
        $saldoRestanteProduzir = max(0.00, (float)$op->quantidade_planejada - (float)$op->quantidade_produzida);

        foreach ($estruturas as $est) {
            $fatorPerda = 1 + ((float) $est->percentual_perda_estimada / 100);
            $qtdRestanteReserva = ((float) $est->quantidade_necessaria * $saldoRestanteProduzir) * $fatorPerda;

            $saldo = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                ->where('item_id', $est->insumo_filho_id)
                ->lockForUpdate()
                ->first();

            if ($saldo) {
                $saldo->decrement('quantidade_reservada', min((float) $saldo->quantidade_reservada, $qtdRestanteReserva));
            }
        }
    }

    /**
     * Executa o apontamento (parcial ou total) com apropriação de MOD, CIF e baixa de insumos
     */
    public static function apontarProducao(
        OrdemProducao $op,
        float $quantidadeProduzida,
        float $quantidadeRefugo = 0.00,
        float $horasMod = 0.00,
        float $custoHoraMod = 45.00,
        float $horasCif = 0.00,
        float $custoHoraCif = 25.00,
        ?string $observacoes = null,
        ?User $responsavel = null
    ): PcpApontamento {
        return DB::transaction(function () use (
            $op,
            $quantidadeProduzida,
            $quantidadeRefugo,
            $horasMod,
            $custoHoraMod,
            $horasCif,
            $custoHoraCif,
            $observacoes,
            $responsavel
        ) {
            if ($op->status === 'CONCLUIDA' || $op->status === 'CANCELADA') {
                throw new Exception("Não é permitido apontar em uma OP com status {$op->status}.");
            }

            $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->get();

            if ($estruturas->isEmpty()) {
                throw new Exception("O produto acabado não possui ficha técnica (BOM) cadastrada.");
            }

            $custoInsumosTotal = 0.00;
            $totalFabricadoNesteLote = $quantidadeProduzida + $quantidadeRefugo;

            // 1. Consumir insumos proporcionalmente ao lote apontado
            foreach ($estruturas as $est) {
                $fatorPerda = 1 + ((float) $est->percentual_perda_estimada / 100);
                $qtdConsumidaInsumo = ((float) $est->quantidade_necessaria * $totalFabricadoNesteLote) * $fatorPerda;

                $insumo = $est->insumo;
                $custoUnitarioInsumo = (float) ($insumo->preco_custo > 0 ? $insumo->preco_custo : $insumo->custo_medio);
                $custoInsumosTotal += ($qtdConsumidaInsumo * $custoUnitarioInsumo);

                // Baixar proporção da reserva
                $saldoReserva = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                    ->where('item_id', $est->insumo_filho_id)
                    ->lockForUpdate()
                    ->first();

                if ($saldoReserva) {
                    $saldoReserva->decrement('quantidade_reservada', min((float)$saldoReserva->quantidade_reservada, $qtdConsumidaInsumo));
                }

                // Saída física definitiva do WMS
                EstoqueService::movimentar(
                    $op->deposito_origem_id,
                    $est->insumo_filho_id,
                    $qtdConsumidaInsumo,
                    'SAIDA_VENDA', // Movimento industrial
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    null,
                    $custoUnitarioInsumo
                );
            }

            // 2. Cálculo dos custos de Mão de Obra Direta e CIF
            $totalMod = $horasMod * $custoHoraMod;
            $totalCif = $horasCif * $custoHoraCif;
            $custoTotalApontamento = $custoInsumosTotal + $totalMod + $totalCif;

            // 3. Entrada física do produto acabado aprovado
            $custoUnitarioApurado = $quantidadeProduzida > 0 ? ($custoTotalApontamento / $quantidadeProduzida) : 0.00;

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
                    $custoUnitarioApurado
                );
            }

            // 4. Gravar o Apontamento
            $apontamento = PcpApontamento::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $op->tenant_id,
                'ordem_producao_id' => $op->id,
                'operador_id' => $responsavel?->id,
                'quantidade_produzida' => $quantidadeProduzida,
                'quantidade_refugo' => $quantidadeRefugo,
                'horas_mod' => $horasMod,
                'custo_hora_mod' => $custoHoraMod,
                'custo_total_mod' => $totalMod,
                'horas_cif' => $horasCif,
                'custo_hora_cif' => $custoHoraCif,
                'custo_total_cif' => $totalCif,
                'custo_insumos' => $custoInsumosTotal,
                'custo_total_apontamento' => $custoTotalApontamento,
                'observacoes' => $observacoes,
                'created_at' => now(),
            ]);

            // 5. Atualizar o acumulado da OP e transitar status
            $novoTotalProduzido = (float)$op->quantidade_produzida + $quantidadeProduzida;
            $novoCustoRealAcumulado = (float)$op->custo_total_real + $custoTotalApontamento;
            $statusFinal = ($novoTotalProduzido >= (float)$op->quantidade_planejada) ? 'CONCLUIDA' : 'EM_ANDAMENTO';

            $dadosUpdate = [
                'status' => $statusFinal,
                'quantidade_produzida' => $novoTotalProduzido,
                'custo_total_real' => $novoCustoRealAcumulado,
            ];

            if ($op->status === 'PLANEJADA') {
                $dadosUpdate['data_inicio_real'] = now();
            }

            if ($statusFinal === 'CONCLUIDA') {
                $dadosUpdate['data_fim_real'] = now();
            }

            $op->update($dadosUpdate);

            return $apontamento;
        });
    }
}