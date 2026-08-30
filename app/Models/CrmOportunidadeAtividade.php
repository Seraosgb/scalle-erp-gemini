<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CrmOportunidadeAtividade extends Model
{
    use SoftDeletes, BelongsToTenant, Auditable;

    protected $table = 'crm_oportunidade_atividades';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'oportunidade_id', 'usuario_id', 
        'tipo', 'descricao', 'data_agendamento', 'is_concluida'
    ];

    protected $casts = [
        'is_concluida' => 'boolean',
        'data_agendamento' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function oportunidade(): BelongsTo
    {
        return $this->belongsTo(CrmOportunidade::class, 'oportunidade_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
    public function atividades(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CrmOportunidadeAtividade::class, 'oportunidade_id')->orderByDesc('created_at');
    }

    public function motivoPerda(): BelongsTo
    {
        return $this->belongsTo(TabelaDominio::class, 'motivo_perda_id');
    }
}