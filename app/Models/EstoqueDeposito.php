<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueDeposito extends Model
{
    use BelongsToTenant;

    protected $table = 'wms_estoque_deposito';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'deposito_id',
        'item_id',
        'lote',
        'data_validade',
        'localizacao_rua',
        'localizacao_predio',
        'localizacao_nivel',
        'localizacao_vao',
        'quantidade_saldo',
        'quantidade_reservada',
    ];

    protected $casts = [
        'quantidade_saldo' => 'decimal:4',
        'quantidade_reservada' => 'decimal:4',
        'data_validade' => 'date',
    ];

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}