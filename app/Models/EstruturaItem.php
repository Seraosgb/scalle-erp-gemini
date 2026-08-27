<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstruturaItem extends Model
{
    use BelongsToTenant;

    protected $table = 'pcp_estrutura_itens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'produto_pai_id',
        'insumo_filho_id',
        'quantidade_necessaria',
        'percentual_perda_estimada',
    ];

    protected $casts = [
        'quantidade_necessaria' => 'decimal:4',
        'percentual_perda_estimada' => 'decimal:2',
    ];

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'insumo_filho_id');
    }
    public function produtoPai(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'produto_pai_id');
    }
}