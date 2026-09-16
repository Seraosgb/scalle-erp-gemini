<?php

namespace App\Models;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FrotaVeiculo extends Model
{
    use SoftDeletes;

    protected $table = 'fro_veiculos';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'placa', 'chassi',
        'marca', 'modelo', 'ano_fabricacao', 'ano_modelo',
        'km_atual', 'tipo_combustivel_id', 'status_id', 'is_ativo'
    ];

    protected static function booted()
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // Relações com Tabelas de Domínio (Evitando hardcoded)
    public function status()
    {
        return $this->belongsTo(TabelaDominio::class, 'status_id');
    }
}
