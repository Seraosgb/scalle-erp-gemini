<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assinatura extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'sis_assinaturas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'plano_id',
        'status',
        'data_inicio',
        'data_proximo_vencimento',
        'storage_utilizado_bytes',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_proximo_vencimento' => 'date',
        'storage_utilizado_bytes' => 'integer',
    ];

    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class, 'plano_id');
    }
}