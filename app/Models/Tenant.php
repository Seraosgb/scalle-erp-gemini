<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use SoftDeletes;

    protected $table = 'sis_tenants';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nome_fantasia',
        'razao_social',
        'documento',
        'status',
        'configuracoes',
    ];

    protected $casts = [
        'configuracoes' => 'array',
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

    public function empresas(): HasMany
    {
        return $this->hasMany(Empresa::class, 'tenant_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function assinaturas(): HasMany
    {
        return $this->hasMany(Assinatura::class, 'tenant_id');
    }
}