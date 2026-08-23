<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Plano extends Model
{
    protected $table = 'sis_planos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nome',
        'slug',
        'valor_mensal',
        'limite_usuarios',
        'limite_empresas',
        'cota_storage_bytes',
        'modulos_habilitados',
        'is_ativo',
    ];

    protected $casts = [
        'valor_mensal' => 'decimal:2',
        'cota_storage_bytes' => 'integer',
        'modulos_habilitados' => 'array',
        'is_ativo' => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function assinaturas(): HasMany
    {
        return $this->hasMany(Assinatura::class, 'plano_id');
    }
}