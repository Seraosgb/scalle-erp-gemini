<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PcpApontamento extends Model
{
    use BelongsToTenant;

    protected $table = 'pcp_apontamentos';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'ordem_producao_id',
        'operador_id',
        'quantidade_produzida',
        'quantidade_refugo',
        'horas_mod',
        'custo_hora_mod',
        'custo_total_mod',
        'horas_cif',
        'custo_hora_cif',
        'custo_total_cif',
        'custo_insumos',
        'custo_total_apontamento',
        'observacoes',
        'created_at',
    ];

    protected $casts = [
        'quantidade_produzida' => 'decimal:4',
        'quantidade_refugo' => 'decimal:4',
        'horas_mod' => 'decimal:2',
        'custo_hora_mod' => 'decimal:2',
        'custo_total_mod' => 'decimal:2',
        'horas_cif' => 'decimal:2',
        'custo_hora_cif' => 'decimal:2',
        'custo_total_cif' => 'decimal:2',
        'custo_insumos' => 'decimal:2',
        'custo_total_apontamento' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function operador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operador_id');
    }
}