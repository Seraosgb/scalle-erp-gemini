<?php

namespace App\Console\Commands;

use App\Models\OrdemServico;
use App\Models\PlanoPreventivo;
use App\Services\OrdemServicoService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GerarPreventivasCommand extends Command
{
    protected $signature = 'scalle:gerar-preventivas';
    protected $description = 'Gera automaticamente as ordens de serviço preventivas do cronograma PMOC';

    public function handle(): int
    {
        $hoje = now()->toDateString();
        $planos = PlanoPreventivo::withoutGlobalScopes()
            ->where('is_ativo', true)
            ->where('proxima_execucao', '<=', $hoje)
            ->with(['ativo', 'cliente'])
            ->get();

        $geradas = 0;

        foreach ($planos as $plano) {
            $ultimoNumero = OrdemServico::withoutGlobalScopes()
                ->where('empresa_id', $plano->empresa_id)
                ->max('numero_os') ?? 1000;

            $prazosSla = OrdemServicoService::calcularSla('NORMAL');

            $descricaoEquip = $plano->ativo 
                ? "{$plano->ativo->descricao} (Patrimônio: {$plano->ativo->codigo_patrimonio})" 
                : "Plano Preventivo PMOC: {$plano->titulo_plano}";

            OrdemServico::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $plano->tenant_id,
                'empresa_id' => $plano->empresa_id,
                'cliente_id' => $plano->cliente_id,
                'ativo_id' => $plano->ativo_id,
                'tecnico_responsavel_id' => $plano->tecnico_padrao_id,
                'numero_os' => $ultimoNumero + 1,
                'status' => 'ABERTA',
                'prioridade' => 'NORMAL',
                'tipo_manutencao' => 'PREVENTIVA',
                'equipamento_descricao' => $descricaoEquip,
                'equipamento_marca_modelo' => $plano->ativo?->marca_modelo,
                'equipamento_numero_serie' => $plano->ativo?->numero_serie,
                'defeito_reclamado' => "Manutenção Preventiva Periódica PMOC ({$plano->frequencia}). Instruções: {$plano->instrucoes_tecnicas}",
                'data_abertura' => now(),
                'prazo_sla_resposta' => $prazosSla['resposta'],
                'prazo_sla_resolucao' => $prazosSla['resolucao'],
            ]);

            // Avançar a próxima execução
            $proxima = match ($plano->frequencia) {
                'MENSAL' => now()->addMonth(),
                'BIMESTRAL' => now()->addMonths(2),
                'TRIMESTRAL' => now()->addMonths(3),
                'SEMESTRAL' => now()->addMonths(6),
                'ANUAL' => now()->addYear(),
                default => now()->addMonth(),
            };

            $plano->update([
                'ultima_execucao' => $hoje,
                'proxima_execucao' => $proxima->toDateString(),
            ]);

            $geradas++;
        }

        $this->info("Total de {$geradas} ordens de serviço preventivas geradas pelo motor PMOC.");
        return Command::SUCCESS;
    }
}