<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToEmpresa;

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
        'is_matriz',
    ];
}
