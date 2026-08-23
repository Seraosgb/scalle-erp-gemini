<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'pro_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'tipo_item',
        'codigo_sku',
        'codigo_barras_ean',
        'nome',
        'descricao',
        'unidade_medida',
        'categoria_id',
        'preco_venda',
        'preco_custo',
        'custo_medio',
        'margem_lucro_markup',
        'ncm',
        'cest',
        'cfop_padrao',
        'origem_mercadoria',
        'controla_estoque',
        'estoque_minimo',
        'estoque_maximo',
        'is_ativo',
    ];

    protected $casts = [
        'preco_venda' => 'decimal:2',
        'preco_custo' => 'decimal:2',
        'custo_medio' => 'decimal:2',
        'margem_lucro_markup' => 'decimal:2',
        'estoque_minimo' => 'decimal:4',
        'estoque_maximo' => 'decimal:4',
        'controla_estoque' => 'boolean',
        'is_ativo' => 'boolean',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(TabelaDominio::class, 'categoria_id');
    }
}