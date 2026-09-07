<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CrmOportunidadeItem extends Model
{
    use HasFactory;

    protected $table = 'crm_oportunidade_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'oportunidade_id',
        'item_id', // CORREÇÃO: item_id no lugar de produto_id
        'descricao',
        'quantidade',
        'valor_unitario',
        'valor_total',
    ];

    protected $casts = [
        'quantidade' => 'decimal:4',
        'valor_unitario' => 'decimal:4',
        'valor_total' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function oportunidade(): BelongsTo
    {
        return $this->belongsTo(CrmOportunidade::class, 'oportunidade_id', 'id');
    }

    public function produto(): BelongsTo
    {
        // A relação se chama 'produto', mas a chave estrangeira no banco é 'item_id'
        return $this->belongsTo(Item::class, 'item_id', 'id');
    }
}
