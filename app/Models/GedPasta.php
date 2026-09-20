<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GedPasta extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'ged_pastas';
    protected $fillable = ['tenant_id', 'empresa_id', 'pasta_pai_id', 'nome', 'is_sistema'];

    public function subpastas()
    {
        return $this->hasMany(GedPasta::class, 'pasta_pai_id')->orderBy('nome');
    }

    public function documentos()
    {
        return $this->hasMany(GedDocumento::class, 'pasta_id')->orderBy('nome_original');
    }
}
