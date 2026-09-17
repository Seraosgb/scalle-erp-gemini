<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentoFiscalItem extends Model
{
    use HasFactory;

    // Nome da tabela no banco (ajuste se a sua migration tiver um nome diferente, ex: fis_documento_itens)
    protected $table = 'fis_documentos_fiscais_itens';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'documento_fiscal_id',
        'tipo_item',
        'cfop',
        'valor_total',
    ];

    public function documento()
    {
        return $this->belongsTo(DocumentoFiscal::class, 'documento_fiscal_id');
    }
}
