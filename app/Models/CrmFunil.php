<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmFunil extends Model
{
    use HasFactory;

    protected $table = 'crm_funis';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'nome',
        'descricao',
        'cor_hex',
        'token_captacao',
        'is_padrao',
        'is_ativo',
    ];

    protected $casts = [
        'is_padrao' => 'boolean',
        'is_ativo' => 'boolean',
    ];

    public function etapas(): HasMany
    {
        return $this->hasMany(CrmFunilEtapa::class, 'funil_id')->orderBy('ordem_exibicao', 'asc');
    }

    public function oportunidades(): HasMany
    {
        return $this->hasMany(CrmOportunidade::class, 'funil_id');
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

}