<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferenciaEstoque extends Model
{
    use BelongsToTenant;

    protected $table = 'wms_transferencias';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'deposito_origem_id',
        'deposito_destino_id',
        'item_id',
        'solicitante_id',
        'recebedor_id',
        'quantidade_enviada',
        'quantidade_recebida',
        'lote',
        'modalidade',
        'status',
        'observacoes',
        'motivo_divergencia',
        'data_envio',
        'data_recebimento',
    ];

    protected $casts = [
        'quantidade_enviada' => 'decimal:4',
        'quantidade_recebida' => 'decimal:4',
        'data_envio' => 'datetime',
        'data_recebimento' => 'datetime',
    ];

    public function origem(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_origem_id');
    }

    public function destino(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_destino_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function recebedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recebedor_id');
    }
}