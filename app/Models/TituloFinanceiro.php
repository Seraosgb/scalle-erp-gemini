<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TituloFinanceiro extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fin_titulos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'pessoa_id',
        'conta_padrao_id',
        'natureza',
        'documento_numero',
        'parcela_numero',
        'total_parcelas',
        'origem_tipo',
        'origem_id',
        'data_emissao',
        'data_vencimento',
        'data_liquidacao',
        'valor_original',
        'valor_juros',
        'valor_multa',
        'valor_desconto',
        'valor_pago_acumulado',
        'valor_saldo_aberto',
        'status',
        'historico',
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'data_vencimento' => 'date',
        'data_liquidacao' => 'date',
        'valor_original' => 'decimal:2',
        'valor_juros' => 'decimal:2',
        'valor_multa' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_pago_acumulado' => 'decimal:2',
        'valor_saldo_aberto' => 'decimal:2',
    ];

    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    public function contaPadrao(): BelongsTo
    {
        return $this->belongsTo(ContaFinanceira::class, 'conta_padrao_id');
    }

    public function movimentacoes(): HasMany
    {
        return $this->hasMany(MovimentacaoExtrato::class, 'titulo_id');
    }
}