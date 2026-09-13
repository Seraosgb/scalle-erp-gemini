<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RecrutamentoEtapa extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'rh_recrutamento_etapas';

    protected $fillable = [
        'tenant_id', 'nome', 'cor', 'ordem'
    ];
}
