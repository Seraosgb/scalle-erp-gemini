<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OsApontamentoHora extends Model
{
    use BelongsToTenant;

    protected $table = 'os_apontamentos_horas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'ordem_servico_id',
        'tecnico_id',
        'data_hora_inicio',
        'data_hora_fim',
        'total_horas',
        'valor_hora',
        'valor_total',
        'descricao_atividades',
    ];

    protected $casts = [
        'data_hora_inicio' => 'datetime',
        'data_hora_fim' => 'datetime',
        'total_horas' => 'decimal:2',
        'valor_hora' => 'decimal:2',
        'valor_total' => 'decimal:2',
    ];

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tecnico_id');
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }
}