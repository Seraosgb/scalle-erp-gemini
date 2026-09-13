<?php
namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class NineboxEixo extends Model {
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;
    protected $table = 'rh_ninebox_eixos';
    protected $fillable = ['tenant_id', 'empresa_id', 'tipo', 'nome', 'descricao', 'is_ativo'];
}
