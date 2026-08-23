<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PontoRegistro extends Model
{
    use BelongsToTenant;

    protected $table = 'rh_pontos';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'colaborador_id',
        'data_hora_registro',
        'tipo_registro',
        'latitude',
        'longitude',
        'ip_origem',
        'dispositivo_info',
        'hash_registro',
        'created_at',
    ];

    protected $casts = [
        'data_hora_registro' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'created_at' => 'datetime',
    ];

    public function colaborador(): BelongsTo
    {
        return $this->belongsTo(Colaborador::class, 'colaborador_id');
    }
}