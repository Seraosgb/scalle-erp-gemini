<?php
namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EnpsCampanha extends Model {
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;
    protected $table = 'rh_enps_campanhas';
    protected $fillable = ['tenant_id', 'empresa_id', 'titulo', 'data_inicio', 'data_fim', 'status'];

    public function respostas() {
        return $this->hasMany(EnpsResposta::class, 'campanha_id');
    }
}
