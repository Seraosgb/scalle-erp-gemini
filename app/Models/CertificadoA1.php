<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CertificadoA1 extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fis_certificados_a1';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'nome_arquivo_original', 
        'arquivo_binario_criptografado', 'senha_criptografada', 
        'cnpj_certificado', 'razao_social_certificado', 
        'valido_de', 'valido_ate', 'ambiente_emissao', 'is_ativo'
    ];

    protected $casts = [
        'valido_de' => 'datetime',
        'valido_ate' => 'datetime',
        'is_ativo' => 'boolean'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}