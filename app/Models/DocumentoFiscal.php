<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentoFiscal extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'fis_documentos_fiscais';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'destinatario_id',
        'origem_tipo',
        'origem_id',
        'modelo_documento',
        'serie',
        'numero_documento',
        'chave_acesso',
        'ambiente',
        'status',
        'protocolo_autorizacao',
        'codigo_status_sefaz',
        'motivo_status_sefaz',
        'valor_total_produtos',
        'valor_total_servicos',
        'valor_total_documento',
        'valor_icms',
        'valor_pis',
        'valor_cofins',
        'valor_issqn',
        'valor_ibs',
        'valor_cbs',
        'xml_assinado',
        'xml_protocolado',
        'url_danfe_pdf',
        'data_emissao',
        'data_autorizacao',
    ];

    protected $casts = [
        'valor_total_produtos' => 'decimal:2',
        'valor_total_servicos' => 'decimal:2',
        'valor_total_documento' => 'decimal:2',
        'valor_icms' => 'decimal:2',
        'valor_pis' => 'decimal:2',
        'valor_cofins' => 'decimal:2',
        'valor_issqn' => 'decimal:2',
        'valor_ibs' => 'decimal:2',
        'valor_cbs' => 'decimal:2',
        'data_emissao' => 'datetime',
        'data_autorizacao' => 'datetime',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'destinatario_id');
    }
}