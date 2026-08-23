<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CompraItem extends Model
{
    protected $table = 'cmp_compra_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'compra_id',
        'item_id',
        'codigo_fornecedor',
        'descricao_fornecedor',
        'unidade_fornecedor',
        'fator_conversao',
        'quantidade_comercial',
        'quantidade_estoque',
        'valor_unitario',
        'valor_total_item',
        'lote',
        'data_validade',
    ];

    protected $casts = [
        'fator_conversao' => 'decimal:4',
        'quantidade_comercial' => 'decimal:4',
        'quantidade_estoque' => 'decimal:4',
        'valor_unitario' => 'decimal:4',
        'valor_total_item' => 'decimal:2',
        'data_validade' => 'date',
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

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}