<?php

namespace App\Models;

use App\Traits\BelongsToEmpresa;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FrotaAbastecimento extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'fro_abastecimentos';

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'veiculo_id', 'motorista_id',
        'posto_id', 'data_abastecimento', 'km_marcador', 'litros',
        'valor_total', 'tipo_combustivel_id', 'titulo_financeiro_id'
    ];
}
