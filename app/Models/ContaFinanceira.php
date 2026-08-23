<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContaFinanceira extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fin_contas_financeiras';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'nome',
        'tipo_conta',
        'codigo_banco',
        'agencia',
        'numero_conta',
        'saldo_inicial',
        'saldo_atual',
        'is_ativo',
    ];

    protected $casts = [
        'saldo_inicial' => 'decimal:2',
        'saldo_atual' => 'decimal:2',
        'is_ativo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function movimentacoes(): HasMany
    {
        return $this->hasMany(MovimentacaoExtrato::class, 'conta_financeira_id');
    }
}