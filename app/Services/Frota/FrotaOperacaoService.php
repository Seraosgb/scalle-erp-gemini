<?php

namespace App\Services\Frota;

use App\Models\FrotaVeiculo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class FrotaOperacaoService
{
    /**
     * Registra o abastecimento, gera despesa e audita manutenções
     */
    public static function registrarAbastecimento(array $dados, string $tenantId, string $empresaId)
    {
        return DB::transaction(function () use ($dados, $tenantId, $empresaId) {
            $veiculo = FrotaVeiculo::where('tenant_id', $tenantId)->findOrFail($dados['veiculo_id']);

            // 1. Blindagem de KM
            if ($dados['km_marcador'] <= $veiculo->km_atual) {
                throw new Exception("Erro de Hodômetro: O KM informado ({$dados['km_marcador']}) deve ser maior que o KM atual do veículo ({$veiculo->km_atual}).");
            }

            // 2. Atualiza a KM da frota
            $veiculo->km_atual = $dados['km_marcador'];
            $veiculo->save();

            // 3. Integração Financeira: Cria Título a Pagar
            $tituloId = (string) Str::uuid();
            DB::table('fin_titulos_financeiros')->insert([
                'id' => $tituloId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pessoa_id' => $dados['posto_id'], // Fornecedor
                'tipo_titulo' => 'DESPESA',
                'descricao' => "Abastecimento - Veículo {$veiculo->placa}",
                'valor_original' => $dados['valor_total'],
                'data_vencimento' => $dados['data_abastecimento'],
                'is_pago' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 4. Registra o Abastecimento
            $abastecimentoId = (string) Str::uuid();
            DB::table('fro_abastecimentos')->insert([
                'id' => $abastecimentoId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'veiculo_id' => $veiculo->id,
                'motorista_id' => $dados['motorista_id'],
                'posto_id' => $dados['posto_id'],
                'data_abastecimento' => $dados['data_abastecimento'],
                'km_marcador' => $dados['km_marcador'],
                'litros' => $dados['litros'],
                'valor_total' => $dados['valor_total'],
                'tipo_combustivel_id' => $dados['tipo_combustivel_id'] ?? null,
                'titulo_financeiro_id' => $tituloId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 5. Integração CMMS: Alerta de Manutenção (Ex: Troca de óleo a cada 10k KM)
            // Se o resto da divisão por 10.000 for menor que a quilometragem desse abastecimento, acende o alerta.
            if ($veiculo->km_atual % 10000 < 500) {
                self::gerarOsPreventiva($veiculo, $tenantId, $empresaId);
            }

            return $abastecimentoId;
        });
    }

    private static function gerarOsPreventiva(FrotaVeiculo $veiculo, string $tenantId, string $empresaId)
    {
        DB::table('os_ordens_servico')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'descricao' => "Revisão Preventiva Automática (Troca de Óleo) - KM Atual: {$veiculo->km_atual}",
            // Como as etapas/status são dinâmicos (sis_tabelas_dominio), deixamos o status inicial nulo para o trigger do banco assumir o padrão
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
