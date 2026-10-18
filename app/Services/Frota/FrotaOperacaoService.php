<?php

namespace App\Services\Frota;

use App\Models\FrotaAbastecimento;
use App\Models\FrotaVeiculo;
use App\Models\OrdemServico;
use App\Services\FinanceiroService;
use App\Services\OrdemServicoService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FrotaOperacaoService
{
    public static function registrarAbastecimento(array $dados, string $tenantId, string $empresaId): string
    {
        return DB::transaction(function () use ($dados, $tenantId, $empresaId) {
            $veiculo = FrotaVeiculo::where('tenant_id', $tenantId)->findOrFail($dados['veiculo_id']);

            if ($dados['km_marcador'] <= $veiculo->km_atual) {
                throw new Exception("Erro de Hodômetro: O KM informado ({$dados['km_marcador']}) deve ser maior que o KM atual do veículo ({$veiculo->km_atual}).");
            }

            $veiculo->update(['km_atual' => $dados['km_marcador']]);

            // Integração via Contrato de Serviço com o Módulo Financeiro (Zero SQL direto)
            $titulo = FinanceiroService::registrarTitulo([
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pessoa_id' => $dados['posto_id'],
                'natureza' => 'PAGAR',
                'documento_numero' => 'ABAST-' . $veiculo->placa,
                'origem_tipo' => 'frota_abastecimento',
                'origem_id' => $veiculo->id,
                'data_vencimento' => $dados['data_abastecimento'],
                'valor_original' => (float) $dados['valor_total'],
                'historico' => "Abastecimento - Veículo {$veiculo->placa} ({$dados['litros']}L)",
            ]);

            $abastecimento = FrotaAbastecimento::create([
                'id' => (string) Str::uuid(),
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
                'titulo_financeiro_id' => $titulo->id,
            ]);

            if (((int) $veiculo->km_atual % 10000) < 500) {
                self::acionarOsPreventivaFrota($veiculo, $tenantId, $empresaId, $dados['posto_id']);
            }

            return $abastecimento->id;
        });
    }

    private static function acionarOsPreventivaFrota(FrotaVeiculo $veiculo, string $tenantId, string $empresaId, string $clienteRefId): void
    {
        $sla = OrdemServicoService::calcularSla('NORMAL');
        $ultimoNumero = OrdemServico::where('tenant_id', $tenantId)->where('empresa_id', $empresaId)->max('numero_os') ?? 1000;

        OrdemServico::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresaId,
            'cliente_id' => $clienteRefId,
            'numero_os' => $ultimoNumero + 1,
            'status' => 'ABERTA',
            'prioridade' => 'NORMAL',
            'tipo_manutencao' => 'PREVENTIVA',
            'equipamento_descricao' => "Veículo {$veiculo->placa} - {$veiculo->marca} {$veiculo->modelo}",
            'defeito_reclamado' => "Revisão Preventiva Automática (Troca de Óleo/Filtros) - KM Atual: {$veiculo->km_atual}",
            'data_abertura' => now(),
            'prazo_sla_resposta' => $sla['resposta'],
            'prazo_sla_resolucao' => $sla['resolucao'],
        ]);
    }
}
