<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CotacaoPropostaItem extends Model
{
    protected $table = 'cmp_cotacao_proposta_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'proposta_id', 'cotacao_item_id', 'valor_unitario', 'valor_total'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }
}