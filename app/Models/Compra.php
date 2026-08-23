<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Compra extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'cmp_compras';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'fornecedor_id',
        'deposito_destino_id',
        'comprador_id',
        'numero_nota',
        'serie_nota',
        'chave_acesso_nfe',
        'status',
        'data_emissao',
        'data_entrada',
        'valor_produtos',
        'valor_frete',
        'valor_seguro',
        'valor_desconto',
        'valor_outras_despesas',
        'valor_total',
        'observacoes',
        'xml_conteudo',
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'data_entrada' => 'date',
        'valor_produtos' => 'decimal:2',
        'valor_frete' => 'decimal:2',
        'valor_seguro' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_outras_despesas' => 'decimal:2',
        'valor_total' => 'decimal:2',
    ];

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'fornecedor_id');
    }

    public function depositoDestino(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_destino_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CompraItem::class, 'compra_id');
    }
}