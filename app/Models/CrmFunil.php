<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CrmFunil extends Model
{
    use SoftDeletes, BelongsToTenant, Auditable;

    protected $table = 'crm_funis';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'tenant_id', 'nome', 'descricao', 'token_captacao', 'is_padrao', 'is_ativo'];
    protected $casts = ['is_padrao' => 'boolean', 'is_ativo' => 'boolean'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function etapas(): HasMany
    {
        return $this->hasMany(CrmFunilEtapa::class, 'funil_id')->orderBy('ordem_exibicao');
    }
}