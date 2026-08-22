<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, BelongsToTenant;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_padrao_id',
        'perfil_id',
        'name',
        'email',
        'telefone',
        'password',
        'is_ativo',
        'mfa_ativo',
        'mfa_secret',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_ativo' => 'boolean',
            'mfa_ativo' => 'boolean',
        ];
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'perfil_id');
    }

    public function empresaPadrao(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_padrao_id');
    }

    public function hasPermission(string $slug): bool
    {
        if (!$this->perfil) {
            return false;
        }

        if ($this->perfil->is_admin) {
            return true;
        }

        return $this->perfil->permissoes->contains('slug', $slug);
    }
}