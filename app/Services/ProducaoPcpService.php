<?php

namespace App\Services;

use App\Models\EstoqueDeposito;
use App\Models\EstruturaItem;
use App\Models\Item;
use App\Models\OrdemProducao;
use App\Models\PcpApontamento;
use App\Models\PcpLoteRastreabilidade;
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
        $saldoRestanteProduzir = max(0.00, (float) $op->quantidade_planejada - (float) $op->quantidade_produzida);

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
     * Finaliza a Ordem de Produção (retrocompatibilidade com testes e encerramento direto)
     */
    public static function finalizarProducao(
        OrdemProducao $op,
        float $quantidadeProduzida,
        float $quantidadeRefugo = 0.00,
        ?User $usuario = null
    ): OrdemProducao {
        $operador = $usuario ?? $op->responsavel ?? User::first();

        if (!$operador) {
            $operador = User::withoutGlobalScopes()->where('id', $op->responsavel_id)->first();
        }

        self::apontarProducao(
            $op,
            $quantidadeProduzida,
            $quantidadeRefugo,
            0.00,
            0.00,
            0.00,
            0.00,
            'Encerramento Direto de Produção',
            $operador
        );

        return $op->fresh(['produto', 'responsavel']);
    }

    /**
     * Executa o apontamento (parcial ou total) com apropriação de MOD, CIF, baixa de insumos, OEE e genealogia de lote
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

            $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->with('insumo')->get();

            if ($estruturas->isEmpty()) {
                throw new Exception("O produto acabado não possui ficha técnica (BOM) cadastrada.");
            }

            $custoInsumosTotal = 0.00;
            $totalFabricadoNesteLote = $quantidadeProduzida + $quantidadeRefugo;
            $loteAcabado = $op->lote_produzido ?? ('LOTE-' . date('ymd') . '-' . substr($op->id, 0, 4));

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
                    $saldoReserva->decrement('quantidade_reservada', min((float) $saldoReserva->quantidade_reservada, $qtdConsumidaInsumo));
                }

                // Sugestão de lote FEFO/FIFO do insumo
                $loteInsumo = EstoqueService::resolverLoteFefo($op->deposito_origem_id, $est->insumo_filho_id, $qtdConsumidaInsumo)?->lote;

                // Saída física definitiva do WMS
                EstoqueService::movimentar(
                    $op->deposito_origem_id,
                    $est->insumo_filho_id,
                    $qtdConsumidaInsumo,
                    'SAIDA_PRODUCAO',
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    $loteInsumo,
                    $custoUnitarioInsumo
                );

                // Gravação da genealogia de rastreabilidade
                PcpLoteRastreabilidade::create([
                    'tenant_id' => $op->tenant_id,
                    'ordem_producao_id' => $op->id,
                    'insumo_id' => $est->insumo_filho_id,
                    'lote_insumo' => $loteInsumo,
                    'quantidade_consumida' => $qtdConsumidaInsumo,
                    'lote_acabado_gerado' => $loteAcabado,
                ]);
            }

            // 2. Cálculo dos custos de Mão de Obra Direta e CIF
            $totalMod = $horasMod * $custoHoraMod;
            $totalCif = $horasCif * $custoHoraCif;
            $custoTotalApontamento = $custoInsumosTotal + $totalMod + $totalCif;

            // 3. Entrada física do produto acabado aprovado
            $novoTotalProduzido = (float) $op->quantidade_produzida + $quantidadeProduzida;
            $novoCustoRealAcumulado = (float) $op->custo_total_real + $custoTotalApontamento;
            $custoUnitarioAcabado = ($novoCustoRealAcumulado > 0 && $novoTotalProduzido > 0) 
                ? ($novoCustoRealAcumulado / $novoTotalProduzido) 
                : 0.00;

            if ($quantidadeProduzida > 0) {
                EstoqueService::movimentar(
                    $op->deposito_destino_id,
                    $op->produto_id,
                    $quantidadeProduzida,
                    'ENTRADA_PRODUCAO',
                    $responsavel?->id,
                    'producao',
                    $op->id,
                    $loteAcabado,
                    $custoUnitarioAcabado
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

            // 5. Cálculo do OEE (Disponibilidade * Performance * Qualidade)
            $qualidade = ($novoTotalProduzido + (float) $quantidadeRefugo) > 0 
                ? ($novoTotalProduzido / ($novoTotalProduzido + (float) $quantidadeRefugo)) * 100 
                : 100.00;
            $performance = (float) $op->quantidade_planejada > 0 
                ? min(100.00, ($novoTotalProduzido / (float) $op->quantidade_planejada) * 100) 
                : 100.00;
            $oee = round(($performance * $qualidade) / 100, 2);

            $statusFinal = ($novoTotalProduzido >= (float) $op->quantidade_planejada) ? 'CONCLUIDA' : 'EM_PRODUCAO';

            $dadosUpdate = [
                'status' => $statusFinal,
                'quantidade_produzida' => $novoTotalProduzido,
                'custo_total_real' => $novoCustoRealAcumulado,
                'lote_produzido' => $loteAcabado,
                'oee_percentual' => $oee,
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

    /**
     * Motor MRP: Analisa OPs planejadas e calcula a necessidade líquida de compras
     */
    public static function executarCalculoMrp(string $tenantId, string $empresaId, string $usuarioId): array
    {
        $opsPlanejadas = OrdemProducao::where('tenant_id', $tenantId)
            ->whereIn('status', ['PLANEJADA', 'EM_PRODUCAO', 'EM_ANDAMENTO'])
            ->get();

        $necessidades = [];

        foreach ($opsPlanejadas as $op) {
            $estruturas = EstruturaItem::where('produto_pai_id', $op->produto_id)->with('insumo')->get();

            foreach ($estruturas as $est) {
                $saldoAtual = EstoqueDeposito::where('deposito_id', $op->deposito_origem_id)
                    ->where('item_id', $est->insumo_filho_id)
                    ->sum('quantidade_saldo') ?? 0.00;

                $qtdPendente = max(0, (float) $op->quantidade_planejada - (float) $op->quantidade_produzida);
                $qtdNecessaria = $qtdPendente * (float) $est->quantidade_necessaria;

                if (!isset($necessidades[$est->insumo_filho_id])) {
                    $necessidades[$est->insumo_filho_id] = [
                        'item_id' => $est->insumo_filho_id,
                        'nome' => $est->insumo->nome,
                        'sku' => $est->insumo->codigo_sku,
                        'unidade' => $est->insumo->unidade_medida,
                        'saldo_atual' => (float) $saldoAtual,
                        'demanda_total' => 0.00,
                        'deposito_id' => $op->deposito_origem_id,
                    ];
                }

                $necessidades[$est->insumo_filho_id]['demanda_total'] += $qtdNecessaria;
            }
        }

        $itensParaComprar = [];
        foreach ($necessidades as $itemId => $nec) {
            $defict = $nec['demanda_total'] - $nec['saldo_atual'];
            if ($defict > 0) {
                $itensParaComprar[] = array_merge($nec, ['quantidade_sugerida' => $defict]);
            }
        }

        return $itensParaComprar;
    }
}