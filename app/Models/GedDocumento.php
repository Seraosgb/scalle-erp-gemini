<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GedDocumento extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'ged_documentos';
    protected $fillable = [
        'tenant_id', 'empresa_id', 'pasta_id',
        'entidade_vinculada_type', 'entidade_vinculada_id',
        'nome_original', 'caminho_s3', 'mime_type', 'tamanho_bytes', 'usuario_upload_id'
    ];

    public function entidadeVinculada()
    {
        return $this->morphTo(__FUNCTION__, 'entidade_vinculada_type', 'entidade_vinculada_id');
    }

    public function pasta()
    {
        return $this->belongsTo(GedPasta::class, 'pasta_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'usuario_upload_id');
    }
}
