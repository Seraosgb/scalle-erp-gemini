<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Permissao extends Model
{
    protected $table = 'sis_permissoes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'modulo',
        'slug',
        'nome',
        'descricao',
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

    public function perfis(): BelongsToMany
    {
        return $this->belongsToMany(Perfil::class, 'sis_perfil_permissao', 'permissao_id', 'perfil_id');
    }
}