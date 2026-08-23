<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimentacaoExtrato extends Model
{
    use BelongsToTenant;

    protected $table = 'fin_movimentacoes_extrato';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'conta_financeira_id',
        'titulo_id',
        'usuario_id',
        'tipo_movimento',
        'valor',
        'saldo_anterior',
        'saldo_posterior',
        'forma_pagamento',
        'data_movimento',
        'descricao',
        'created_at',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'saldo_anterior' => 'decimal:2',
        'saldo_posterior' => 'decimal:2',
        'data_movimento' => 'date',
        'created_at' => 'datetime',
    ];

    public function conta(): BelongsTo
    {
        return $this->belongsTo(ContaFinanceira::class, 'conta_financeira_id');
    }

    public function titulo(): BelongsTo
    {
        return $this->belongsTo(TituloFinanceiro::class, 'titulo_id');
    }
}