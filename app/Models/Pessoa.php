<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pessoa extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'pes_pessoas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'tipo_pessoa',
        'nome_razao_social',
        'nome_fantasia_apelido',
        'cpf_cnpj',
        'rg_ie',
        'inscricao_municipal',
        'email_principal',
        'telefone_principal',
        'whatsapp',
        'is_cliente',
        'is_fornecedor',
        'is_tecnico',
        'is_transportadora',
        'is_ativo',
        'regime_tributario',
        'limite_credito',
        'observacoes',
    ];

    protected $casts = [
        'is_cliente' => 'boolean',
        'is_fornecedor' => 'boolean',
        'is_tecnico' => 'boolean',
        'is_transportadora' => 'boolean',
        'is_ativo' => 'boolean',
        'limite_credito' => 'decimal:2',
    ];

    public function enderecos(): HasMany
    {
        return $this->hasMany(Endereco::class, 'pessoa_id');
    }
}