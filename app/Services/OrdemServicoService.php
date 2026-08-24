<?php

namespace App\Services;

use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use App\Models\TituloFinanceiro;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrdemServicoService
{
    /**
     * Calcula prazos de SLA na abertura da OS
     */
    public static function calcularSla(string $prioridade): array
    {
        $agora = now();

        return match (strtoupper($prioridade)) {
            'URGENTE' => [
                'resposta' => $agora->copy()->addHours(2),
                'resolucao' => $agora->copy()->addHours(6),
            ],
            'ALTA' => [
                'resposta' => $agora->copy()->addHours(4),
                'resolucao' => $agora->copy()->addHours(12),
            ],
            'BAIXA' => [
                'resposta' => $agora->copy()->addHours(24),
                'resolucao' => $agora->copy()->addHours(72),
            ],
            default => [ // NORMAL
                'resposta' => $agora->copy()->addHours(8),
                'resolucao' => $agora->copy()->addHours(24),
            ],
        };
    }

    /**
     * Conclui a Ordem de Serviço com conformidade jurídica MP 2.200-2, baixa no WMS e financeiro
     */
    public static function concluirOrdemServico(
        OrdemServico $os,
        array $itensUtilizados,
        string $laudoTecnico,
        string $assinaturaBase64,
        string $nomeResponsavel,
        ?string $docResponsavel = null,
        ?User $tecnico = null,
        ?float $latitude = null,
        ?float $longitude = null,
        ?string $ipOrigem = null
    ): OrdemServico {
        return DB::transaction(function () use (
            $os,
            $itensUtilizados,
            $laudoTecnico,
            $assinaturaBase64,
            $nomeResponsavel,
            $docResponsavel,
            $tecnico,
            $latitude,
            $longitude,
            $ipOrigem
        ) {
            $totalServicos = 0.00;
            $totalPecas = 0.00;

            // 1. Processar itens utilizados e executar baixa no estoque
            foreach ($itensUtilizados as $itemData) {
                $quantidade = (float) $itemData['quantidade'];
                $valorUnitario = (float) $itemData['valor_unitario'];
                $totalItem = $quantidade * $valorUnitario;

                if ($itemData['tipo_item'] === 'SERVICO') {
                    $totalServicos += $totalItem;
                } else {
                    $totalPecas += $totalItem;

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

            $valorTotalFinal = max(0.00, ($totalServicos + $totalPecas) - (float) $os->valor_desconto);
            $concluidoEm = now();

            // 2. Geração do Hash de Conformidade SHA-256 (MP 2.200-2/2001)
            $payloadHash = "{$os->tenant_id}|{$os->id}|{$os->numero_os}|{$concluidoEm->toIso8601String()}|{$latitude}|{$longitude}|{$ipOrigem}|{$valorTotalFinal}|" . md5($assinaturaBase64);
            $hashAssinatura = hash('sha256', $payloadHash);

            // 3. Atualizar a Ordem de Serviço
            $os->update([
                'status' => 'CONCLUIDA',
                'servico_executado' => $laudoTecnico,
                'data_conclusao' => $concluidoEm,
                'valor_servicos' => $totalServicos,
                'valor_pecas' => $totalPecas,
                'valor_total' => $valorTotalFinal,
                'assinatura_cliente_base64' => $assinaturaBase64,
                'nome_responsavel_recebimento' => $nomeResponsavel,
                'documento_responsavel_recebimento' => $docResponsavel,
                'assinado_em' => $concluidoEm,
                'hash_assinatura_sha256' => $hashAssinatura,
                'ip_assinatura' => $ipOrigem,
                'latitude_assinatura' => $latitude,
                'longitude_assinatura' => $longitude,
            ]);

            // 4. Integração Financeira: Gerar Título no Contas a Receber
            if ($valorTotalFinal > 0.00) {
                TituloFinanceiro::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $os->tenant_id,
                    'empresa_id' => $os->empresa_id,
                    'pessoa_id' => $os->cliente_id,
                    'natureza' => 'RECEBER',
                    'documento_numero' => "OS-{$os->numero_os}",
                    'parcela_numero' => 1,
                    'total_parcelas' => 1,
                    'origem_tipo' => 'os',
                    'origem_id' => $os->id,
                    'data_emissao' => now()->toDateString(),
                    'data_vencimento' => now()->addDays(15)->toDateString(),
                    'valor_original' => $valorTotalFinal,
                    'valor_desconto' => (float) $os->valor_desconto,
                    'valor_saldo_aberto' => $valorTotalFinal,
                    'valor_pago_acumulado' => 0.00,
                    'status' => 'ABERTO',
                    'historico' => "Faturamento de OS #{$os->numero_os} - {$os->equipamento_descricao}",
                ]);
            }

            return $os;
        });
    }
}