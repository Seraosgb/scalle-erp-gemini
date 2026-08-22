<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TabelaDominio extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'sis_tabelas_dominio';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'tipo_lista',
        'codigo',
        'nome',
        'descricao',
        'cor_hex',
        'ordem_exibicao',
        'is_ativo',
        'is_sistema',
        'metadados',
    ];

    protected $casts = [
        'is_ativo' => 'boolean',
        'is_sistema' => 'boolean',
        'metadados' => 'array',
    ];
}