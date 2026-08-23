<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Veiculo extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fro_veiculos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'motorista_padrao_id',
        'placa',
        'marca_modelo',
        'ano_fabricacao',
        'chassi',
        'renavam',
        'tipo_combustivel',
        'km_atual',
        'is_ativo',
    ];

    protected $casts = [
        'km_atual' => 'decimal:2',
        'is_ativo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(User::class, 'motorista_padrao_id');
    }

    public function manutencoes(): HasMany
    {
        return $this->hasMany(ManutencaoVeiculo::class, 'veiculo_id');
    }
}