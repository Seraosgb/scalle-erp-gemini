<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentoFiscal extends Model
{
    use HasFactory;

    protected $table = 'fis_documentos_fiscais';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'destinatario_id',
        'modelo_documento',
        'serie_documento',
        'numero_documento',
        'ambiente_emissao',
        'status',
        'data_emissao',
        'valor_total',
        'chave_acesso',
        'protocolo_autorizacao',
        'mensagem_sefaz'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function destinatario()
    {
        return $this->belongsTo(Pessoa::class, 'destinatario_id');
    }

    public function itens()
    {
        return $this->hasMany(DocumentoFiscalItem::class, 'documento_fiscal_id');
    }
}
