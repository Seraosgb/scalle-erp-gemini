<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class OrdemProducao extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'pcp_ordens_producao';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'produto_id',
        'deposito_origem_id',
        'deposito_destino_id',
        'responsavel_id',
        'numero_op',
        'status',
        'quantidade_planejada',
        'quantidade_produzida',
        'custo_total_estimado',
        'custo_total_real',
        'data_inicio_prevista',
        'data_fim_prevista',
        'data_inicio_real',
        'data_fim_real',
        'observacoes',
    ];

    protected $casts = [
        'quantidade_planejada' => 'decimal:4',
        'quantidade_produzida' => 'decimal:4',
        'custo_total_estimado' => 'decimal:2',
        'custo_total_real' => 'decimal:2',
        'data_inicio_prevista' => 'date',
        'data_fim_prevista' => 'date',
        'data_inicio_real' => 'datetime',
        'data_fim_real' => 'datetime',
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

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'produto_id');
    }

    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_id');
    }

    public function depositoOrigem(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_origem_id');
    }

    public function depositoDestino(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_destino_id');
    }
}