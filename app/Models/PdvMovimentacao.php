<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PdvMovimentacao extends Model
{
    use BelongsToTenant;

    protected $table = 'pdv_movimentacoes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'caixa_id', 'tipo_movimento', 'valor',
        'autorizador_id', 'forma_pagamento', 'observacoes'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }
}
