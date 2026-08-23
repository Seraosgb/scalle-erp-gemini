<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Colaborador extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'rh_colaboradores';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'usuario_id',
        'pessoa_id',
        'matricula',
        'cargo',
        'departamento',
        'data_admissao',
        'data_demissao',
        'salario_base',
        'tipo_contrato',
        'status',
    ];

    protected $casts = [
        'data_admissao' => 'date',
        'data_demissao' => 'date',
        'salario_base' => 'decimal:2',
    ];

    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function pontos(): HasMany
    {
        return $this->hasMany(PontoRegistro::class, 'colaborador_id');
    }
}