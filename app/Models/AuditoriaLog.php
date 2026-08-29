<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AuditoriaLog extends Model
{
    use BelongsToTenant;

    protected $table = 'sis_auditoria_logs';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // Usa apenas created_at

    protected $fillable = [
        'id', 'tenant_id', 'usuario_id', 'acao', 'modulo', 
        'tabela_entidade', 'registro_id', 'valores_anteriores', 
        'valores_novos', 'ip', 'user_agent', 'created_at'
    ];

    protected $casts = [
        'valores_anteriores' => 'array',
        'valores_novos' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}