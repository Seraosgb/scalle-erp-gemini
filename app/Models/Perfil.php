<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Perfil extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'sis_perfis';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'nome',
        'slug',
        'descricao',
        'is_admin',
        'is_sistema',
    ];

    protected $casts = [
        'is_admin' => 'boolean',
        'is_sistema' => 'boolean',
    ];

    public function permissoes(): BelongsToMany
    {
        return $this->belongsToMany(Permissao::class, 'sis_perfil_permissao', 'perfil_id', 'permissao_id');
    }
}