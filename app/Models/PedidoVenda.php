<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PedidoVenda extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'ven_pedidos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'cliente_id',
        'vendedor_id',
        'deposito_saida_id',
        'tipo_documento',
        'numero_pedido',
        'status',
        'data_emissao',
        'data_validade_orcamento',
        'valor_subtotal_itens',
        'valor_frete',
        'valor_seguro',
        'valor_outras_despesas',
        'percentual_desconto',
        'valor_desconto',
        'valor_total_liquido',
        'pdv_offline_uuid',
        'sincronizado_em',
        'observacoes',
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'data_validade_orcamento' => 'date',
        'valor_subtotal_itens' => 'decimal:2',
        'valor_frete' => 'decimal:2',
        'valor_seguro' => 'decimal:2',
        'valor_outras_despesas' => 'decimal:2',
        'percentual_desconto' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_total_liquido' => 'decimal:2',
        'sincronizado_em' => 'datetime',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'cliente_id');
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_saida_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(PedidoVendaItem::class, 'pedido_id');
    }

    public function pagamentos(): HasMany
    {
        return $this->hasMany(PedidoVendaPagamento::class, 'pedido_id');
    }
}