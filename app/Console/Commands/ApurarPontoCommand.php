<?php

namespace App\Console\Commands;

use App\Models\Colaborador;
use App\Models\PontoRegistro;
use Illuminate\Console\Command;
use Carbon\Carbon;

class ApurarPontoCommand extends Command
{
    protected $signature = 'rh:apurar-ponto {--data= : Data opcional no formato Y-m-d}';
    protected $description = 'Motor assíncrono de apuração de jornada, atrasos e banco de horas';

    public function handle(): int
    {
        $dataReferencia = $this->option('data')
            ? Carbon::parse($this->option('data'))
            : now()->subDay(); // Por padrão, apura o dia anterior

        $this->info("Iniciando apuração de ponto para a competência: " . $dataReferencia->toDateString());

        // Busca todos os colaboradores ativos que possuem escala vinculada
        $colaboradores = Colaborador::with('escala')
            ->where('status', 'ATIVO')
            ->whereNotNull('escala_id')
            ->get();

        $processados = 0;

        foreach ($colaboradores as $colaborador) {
            $escala = $colaborador->escala;
            if (!$escala) continue;

            // Busca as batidas do colaborador na data de referência
            $batidas = PontoRegistro::where('colaborador_id', $colaborador->id)
                ->whereDate('data_hora_registro', $dataReferencia->toDateString())
                ->orderBy('data_hora_registro')
                ->get();

            if ($batidas->isEmpty()) {
                continue; // Faltou ou DSR / Folga
            }

            // Exemplo de lógica base: Primeira entrada e última saída do dia
            $primeiraEntrada = Carbon::parse($batidas->first()->data_hora_registro);
            $ultimaSaida = Carbon::parse($batidas->last()->data_hora_registro);

            $escalaEntrada = Carbon::parse($dataReferencia->toDateString() . ' ' . $escala->horario_entrada);
            $escalaSaida = Carbon::parse($dataReferencia->toDateString() . ' ' . $escala->horario_saida);

            // Cálculo de Tolerância (Art. 58 CLT)
            $toleranciaMinutos = $escala->tolerancia_minutos ?? 10;

            // Análise de Atraso na Entrada
            $diffEntradaMinutos = $escalaEntrada->diffInMinutes($primeiraEntrada, false);
            $atrasoMinutos = ($diffEntradaMinutos > $toleranciaMinutos) ? $diffEntradaMinutos : 0;

            // Análise de Hora Extra na Saída
            $diffSaidaMinutos = $escalaSaida->diffInMinutes($ultimaSaida, false);
            $horaExtraMinutos = ($diffSaidaMinutos > $toleranciaMinutos) ? $diffSaidaMinutos : 0;

            // Log ou persistência do saldo diário no banco (Banco de Horas)
            // Aqui você pode salvar em uma tabela `rh_banco_horas_lancamentos`

            $processados++;
        }

        $this->info("Apuração concluída com sucesso! Total de colaboradores processados: {$processados}");
        return Command::SUCCESS;
    }
}
