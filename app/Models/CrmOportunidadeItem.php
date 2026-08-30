<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function oportunidade(): BelongsTo
    {
        return $this->belongsTo(CrmOportunidade::class, 'oportunidade_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }
}