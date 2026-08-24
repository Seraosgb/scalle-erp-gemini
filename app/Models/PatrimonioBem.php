<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatrimonioBem extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'pat_bens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'cliente_id',
        'responsavel_atual_id',
        'codigo_patrimonio',
        'descricao',
        'marca_modelo',
        'numero_serie',
        'qr_code_hash',
        'data_aquisicao',
        'valor_aquisicao',
        'status',
        'localizacao_fisica',
    ];

    protected $casts = [
        'data_aquisicao' => 'date',
        'valor_aquisicao' => 'decimal:2',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'cliente_id');
    }

    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_atual_id');
    }
}