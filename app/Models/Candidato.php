<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidato extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant;

    protected $table = 'rh_candidatos';

    protected $fillable = [
        'tenant_id', 'vaga_id', 'nome', 'email', 'telefone', 'etapa_kanban', 'observacoes'
    ];

    public function vaga(): BelongsTo
    {
        return $this->belongsTo(Vaga::class, 'vaga_id');
    }
}
