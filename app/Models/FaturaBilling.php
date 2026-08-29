<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FaturaBilling extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'sis_faturas_billing';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'assinatura_id',
        'gateway_payment_id',
        'status',
        'valor',
        'forma_pagamento',
        'data_vencimento',
        'data_pagamento',
        'url_fatura_gateway',
        'payload_webhook',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'data_vencimento' => 'date',
        'data_pagamento' => 'datetime',
        'payload_webhook' => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function assinatura(): BelongsTo
    {
        return $this->belongsTo(Assinatura::class, 'assinatura_id');
    }
}