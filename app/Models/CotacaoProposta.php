<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CotacaoProposta extends Model
{
    protected $table = 'cmp_cotacao_propostas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'cotacao_id', 'fornecedor_id', 'valor_total', 
        'valor_frete', 'prazo_entrega_dias', 'condicoes_pagamento', 
        'is_vencedora', 'observacoes'
    ];

    protected $casts = [
        'valor_total' => 'decimal:2',
        'valor_frete' => 'decimal:2',
        'is_vencedora' => 'boolean'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'fornecedor_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CotacaoPropostaItem::class, 'proposta_id');
    }
}