<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
// Agendamento do comando de geração de preventivas
Schedule::command('scalle:gerar-preventivas')->dailyAt('00:01');

// Agendamento do comando de apuração de ponto
Schedule::command('rh:apurar-ponto')->dailyAt('00:02');
