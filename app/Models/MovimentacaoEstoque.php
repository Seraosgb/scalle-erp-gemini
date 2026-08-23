<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimentacaoEstoque extends Model
{
    use BelongsToTenant;

    protected $table = 'wms_movimentacoes';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'deposito_id',
        'item_id',
        'usuario_id',
        'tipo_movimento',
        'quantidade',
        'saldo_anterior',
        'saldo_posterior',
        'custo_unitario',
        'documento_origem_tipo',
        'documento_origem_id',
        'motivo',
        'created_at',
    ];

    protected $casts = [
        'quantidade' => 'decimal:4',
        'saldo_anterior' => 'decimal:4',
        'saldo_posterior' => 'decimal:4',
        'custo_unitario' => 'decimal:2',
        'created_at' => 'datetime',
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