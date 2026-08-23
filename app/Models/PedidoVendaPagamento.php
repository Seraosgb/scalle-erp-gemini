<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PedidoVendaPagamento extends Model
{
    protected $table = 'ven_pedido_pagamentos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'pedido_id',
        'forma_pagamento',
        'parcelas',
        'valor_pago',
        'valor_troco',
        'status',
        'transacao_nsu_autorizacao',
    ];

    protected $casts = [
        'parcelas' => 'integer',
        'valor_pago' => 'decimal:2',
        'valor_troco' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(PedidoVenda::class, 'pedido_id');
    }
}