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
        'tenant_id',
        'oportunidade_id',
        'produto_id',
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
        // Força explicitamente a FK 'oportunidade_id' para a tabela crm_oportunidades
        return $this->belongsTo(CrmOportunidade::class, 'oportunidade_id', 'id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'produto_id', 'id');
    }
}