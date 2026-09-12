<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vaga extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant;

    protected $table = 'rh_vagas';

    protected $fillable = [
        'tenant_id', 'titulo', 'departamento', 'status', 'descricao'
    ];

    public function candidatos(): HasMany
    {
        return $this->hasMany(Candidato::class, 'vaga_id');
    }
}
