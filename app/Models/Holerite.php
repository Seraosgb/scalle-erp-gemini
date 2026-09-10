<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToEmpresa;

class Holerite extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'rh_holerites';

    protected $fillable = [
        'tenant_id', 'empresa_id', 'colaborador_id', 'competencia',
        'data_emissao', 'salario_base', 'total_proventos', 'total_descontos',
        'valor_liquido', 'status', 'observacoes'
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'salario_base' => 'decimal:2',
        'total_proventos' => 'decimal:2',
        'total_descontos' => 'decimal:2',
        'valor_liquido' => 'decimal:2',
    ];

    public function colaborador(): BelongsTo
    {
        return $this->belongsTo(Colaborador::class, 'colaborador_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(HoleriteItem::class, 'holerite_id');
    }
}
