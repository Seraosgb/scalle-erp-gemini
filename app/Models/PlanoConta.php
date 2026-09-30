<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PlanoConta extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fin_planos_contas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'parent_id',
        'codigo', 'nome', 'tipo', 'is_sintetico'
    ];

    protected $casts = [
        'is_sintetico' => 'boolean'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    // MÁGICA: Carrega todos os "filhos" recursivamente para formar a árvore no Frontend
    public function children()
    {
        return $this->hasMany(PlanoConta::class, 'parent_id')
                    ->with('children')
                    ->orderBy('codigo');
    }
}
