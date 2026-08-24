<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlanoPreventivo extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'os_planos_preventivos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'cliente_id',
        'ativo_id',
        'tecnico_padrao_id',
        'titulo_plano',
        'frequencia',
        'proxima_execucao',
        'ultima_execucao',
        'checklist_itens',
        'instrucoes_tecnicas',
        'is_ativo',
    ];

    protected $casts = [
        'proxima_execucao' => 'date',
        'ultima_execucao' => 'date',
        'checklist_itens' => 'array',
        'is_ativo' => 'boolean',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'cliente_id');
    }

    public function ativo(): BelongsTo
    {
        return $this->belongsTo(PatrimonioBem::class, 'ativo_id');
    }

    public function tecnicoPadrao(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tecnico_padrao_id');
    }
}