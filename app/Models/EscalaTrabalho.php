<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EscalaTrabalho extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'rh_escalas_trabalho';

    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo_escala',
        'horario_entrada',
        'horario_saida',
        'inicio_intervalo',
        'fim_intervalo',
        'tolerancia_minutos',
        'is_ativo',
    ];

    protected $casts = [
        'is_ativo' => 'boolean',
        'tolerancia_minutos' => 'integer',
    ];
}
