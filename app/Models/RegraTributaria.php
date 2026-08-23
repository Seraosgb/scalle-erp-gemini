<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RegraTributaria extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fis_regras_tributarias';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'descricao',
        'cfop',
        'uf_destino',
        'cst_csosn_icms',
        'aliquota_icms',
        'cst_pis',
        'aliquota_pis',
        'cst_cofins',
        'aliquota_cofins',
        'aliquota_issqn',
        'cst_ibs_cbs',
        'aliquota_ibs',
        'aliquota_cbs',
        'is_ativo',
    ];

    protected $casts = [
        'aliquota_icms' => 'decimal:2',
        'aliquota_pis' => 'decimal:2',
        'aliquota_cofins' => 'decimal:2',
        'aliquota_issqn' => 'decimal:2',
        'aliquota_ibs' => 'decimal:2',
        'aliquota_cbs' => 'decimal:2',
        'is_ativo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}