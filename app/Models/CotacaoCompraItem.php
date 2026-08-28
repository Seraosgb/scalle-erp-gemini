<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CotacaoCompraItem extends Model
{
    protected $table = 'cmp_cotacao_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'cotacao_id', 'item_id', 'quantidade'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}