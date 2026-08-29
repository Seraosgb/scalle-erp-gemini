<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CrmFunilEtapa extends Model
{
    use Auditable; // Sem tenant_id aqui, pois herda o contexto do Funil

    protected $table = 'crm_funil_etapas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'funil_id', 'nome', 'cor_hex', 'ordem_exibicao', 'exige_justificativa_perda'];
    protected $casts = ['exige_justificativa_perda' => 'boolean', 'ordem_exibicao' => 'integer'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function oportunidades(): HasMany
    {
        return $this->hasMany(CrmOportunidade::class, 'etapa_id')->orderByDesc('created_at');
    }
}