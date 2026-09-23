<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CentroCusto extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fin_centros_custos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'parent_id', 'codigo', 'nome', 'is_sintetico', 'is_ativo'
    ];

    protected $casts = [
        'is_sintetico' => 'boolean',
        'is_ativo' => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(CentroCusto::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(CentroCusto::class, 'parent_id')->orderBy('codigo');
    }
}
