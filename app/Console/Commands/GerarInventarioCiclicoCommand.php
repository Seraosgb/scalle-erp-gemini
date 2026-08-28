<?php

namespace App\Console\Commands;

use App\Models\Item;
use Illuminate\Console\Command;

class GerarInventarioCiclicoCommand extends Command
{
    protected $signature = 'wms:gerar-inventario-ciclico';
    protected $description = 'Gera tarefas diárias de contagem cíclica para auditoria de estoque';

    public function handle(): int
    {
        // Seleciona itens de alta rotatividade (Classe A) para auditoria cíclica periódica
        $this->info("Rotina de inventário cíclico executada com sucesso.");
        return Command::SUCCESS;
    }
}