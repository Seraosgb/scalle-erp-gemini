<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CrmOportunidade extends Model
{
    use SoftDeletes, BelongsToTenant, Auditable;

    protected $table = 'crm_oportunidades';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'funil_id', 'etapa_id', 'vendedor_id', 'cliente_id', 
        'titulo', 'nome_contato', 'email_contato', 'telefone_contato', 
        'valor_estimado', 'data_fechamento_esperada', 'status', 'observacoes', 'origem_lead'
    ];

    protected $casts = [
        'valor_estimado' => 'decimal:2',
        'data_fechamento_esperada' => 'date',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function etapa(): BelongsTo { return $this->belongsTo(CrmFunilEtapa::class, 'etapa_id'); }
    public function vendedor(): BelongsTo { return $this->belongsTo(User::class, 'vendedor_id'); }
    public function cliente(): BelongsTo { return $this->belongsTo(Pessoa::class, 'cliente_id'); }
}