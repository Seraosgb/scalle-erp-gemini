<?php

namespace App\Services;

use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrdemServicoService
{
    /**
     * Finaliza a Ordem de Serviço, deduz peças do estoque e grava o aceite digital
     */
    public static function concluirOrdemServico(
        OrdemServico $os,
        array $itensUtilizados,
        string $laudoTecnico,
        string $assinaturaBase64,
        string $nomeResponsavel,
        ?string $docResponsavel = null,
        ?User $tecnico = null
    ): OrdemServico {
        return DB::transaction(function () use (
            $os,
            $itensUtilizados,
            $laudoTecnico,
            $assinaturaBase64,
            $nomeResponsavel,
            $docResponsavel,
            $tecnico
        ) {
            $totalServicos = 0.00;
            $totalPecas = 0.00;

            foreach ($itensUtilizados as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $valorUnitario = (float) $itemData['valor_unitario'];
                $totalItem = $quantidade * $valorUnitario;

                if ($itemData['tipo_item'] === 'SERVICO') {
                    $totalServicos += $totalItem;
                } else {
                    $totalPecas += $totalItem;

                    // Baixa imediata da peça utilizada em campo
                    if (!empty($os->deposito_saida_id)) {
                        EstoqueService::movimentar(
                            $os->deposito_saida_id,
                            $itemData['item_id'],
                            $quantidade,
                            'SAIDA_OS',
                            $tecnico?->id,
                            'os',
                            $os->id,
                            $itemData['lote'] ?? null,
                            $valorUnitario
                        );
                    }
                }

                OrdemServicoItem::create([
                    'ordem_servico_id' => $os->id,
                    'item_id' => $itemData['item_id'],
                    'tipo_item' => $itemData['tipo_item'],
                    'quantidade' => $quantidade,
                    'valor_unitario' => $valorUnitario,
                    'valor_total' => $totalItem,
                    'lote' => $itemData['lote'] ?? null,
                ]);
            }

            $valorTotalFinal = ($totalServicos + $totalPecas) - (float) $os->valor_desconto;

            $os->update([
                'status' => 'CONCLUIDA',
                'servico_executado' => $laudoTecnico,
                'data_conclusao' => now(),
                'valor_servicos' => $totalServicos,
                'valor_pecas' => $totalPecas,
                'valor_total' => max(0.00, $valorTotalFinal),
                'assinatura_cliente_base64' => $assinaturaBase64,
                'nome_responsavel_recebimento' => $nomeResponsavel,
                'documento_responsavel_recebimento' => $docResponsavel,
                'assinado_em' => now(),
            ]);

            return $os;
        });
    }
}