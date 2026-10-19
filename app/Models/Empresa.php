<?php

namespace App\Models;

use App\Traits\BelongsToEmpresa;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Empresa extends Model
{
    use SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'sis_empresas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'nome_fantasia',
        'razao_social',
        'cnpj',
        'inscricao_estadual',
        'regime_tributario',
        'csc_token',
        'csc_id',
        'cep',
        'logradouro',
        'numero',
        'bairro',
        'cidade',
        'uf',
        'codigo_ibge',
        'is_matriz',
    ];
}
