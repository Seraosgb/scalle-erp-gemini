<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PedidoVendaItem extends Model
{
    protected $table = 'ven_pedido_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'pedido_id',
        'item_id',
        'quantidade',
        'preco_tabela_unitario',
        'percentual_desconto',
        'valor_desconto_unitario',
        'preco_venda_unitario',
        'valor_total_bruto',
        'valor_total_liquido',
        'lote',
    ];

    protected $casts = [
        'quantidade' => 'decimal:4',
        'preco_tabela_unitario' => 'decimal:4',
        'percentual_desconto' => 'decimal:2',
        'valor_desconto_unitario' => 'decimal:4',
        'preco_venda_unitario' => 'decimal:4',
        'valor_total_bruto' => 'decimal:2',
        'valor_total_liquido' => 'decimal:2',
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

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}