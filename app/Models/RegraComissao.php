<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RegraComissao extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'ven_regras_comissao';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'cargo_ou_perfil',
        'categoria_id',
        'faixa_valor_min',
        'faixa_valor_max',
        'percentual_comissao',
        'is_ativo',
    ];

    protected $casts = [
        'faixa_valor_min' => 'decimal:2',
        'faixa_valor_max' => 'decimal:2',
        'percentual_comissao' => 'decimal:2',
        'is_ativo' => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(TabelaDominio::class, 'categoria_id');
    }
}