<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deposito extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'wms_depositos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'nome',
        'codigo',
        'descricao',
        'is_padrao',
        'is_ativo',
    ];

    protected $casts = [
        'is_padrao' => 'boolean',
        'is_ativo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function saldos(): HasMany
    {
        return $this->hasMany(EstoqueDeposito::class, 'deposito_id');
    }
}