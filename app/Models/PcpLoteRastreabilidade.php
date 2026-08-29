<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PcpLoteRastreabilidade extends Model
{
    use BelongsToTenant;

    protected $table = 'pcp_lotes_rastreabilidade';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'ordem_producao_id',
        'insumo_id',
        'lote_insumo',
        'quantidade_consumida',
        'lote_acabado_gerado',
    ];

    protected $casts = [
        'quantidade_consumida' => 'decimal:4',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'insumo_id');
    }
}