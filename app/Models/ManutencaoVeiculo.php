<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoVeiculo extends Model
{
    use BelongsToTenant;

    protected $table = 'fro_manutencoes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'veiculo_id',
        'motorista_id',
        'tipo_registro',
        'km_registro',
        'litros_combustivel',
        'valor_total',
        'data_registro',
        'descricao_servico',
    ];

    protected $casts = [
        'km_registro' => 'decimal:2',
        'litros_combustivel' => 'decimal:3',
        'valor_total' => 'decimal:2',
        'data_registro' => 'date',
    ];

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id');
    }
}