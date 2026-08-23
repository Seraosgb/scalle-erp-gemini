<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AlcadaAprovacao extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'sis_alcadas_aprovacoes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'solicitante_id',
        'aprovador_id',
        'tipo_operacao',
        'entidade_origem',
        'registro_origem_id',
        'valor_solicitado',
        'percentual_solicitado',
        'status',
        'justificativa_solicitacao',
        'justificativa_resposta',
        'respondido_em',
    ];

    protected $casts = [
        'valor_solicitado' => 'decimal:2',
        'percentual_solicitado' => 'decimal:2',
        'respondido_em' => 'datetime',
    ];

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovador_id');
    }
}