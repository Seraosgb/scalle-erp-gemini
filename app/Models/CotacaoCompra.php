<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CotacaoCompra extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'cmp_cotacoes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'solicitante_id', 
        'deposito_destino_id', 'titulo', 'status', 
        'data_limite_resposta', 'fornecedor_vencedor_id', 'observacoes'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CotacaoCompraItem::class, 'cotacao_id');
    }

    public function propostas(): HasMany
    {
        return $this->hasMany(CotacaoProposta::class, 'cotacao_id')->with(['fornecedor', 'itens']);
    }

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_destino_id');
    }

    public function fornecedorVencedor(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'fornecedor_vencedor_id');
    }
}