<?php
namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AvaliacaoDesempenho extends Model {
    use HasUuids, SoftDeletes, BelongsToTenant, BelongsToEmpresa;
    protected $table = 'rh_avaliacoes_desempenho';
    protected $fillable = ['tenant_id', 'empresa_id', 'colaborador_id', 'eixo_x_id', 'nota_x', 'eixo_y_id', 'nota_y', 'data_avaliacao', 'observacoes_gestor'];

    public function pdis() {
        return $this->hasMany(Pdi::class, 'avaliacao_id');
    }
    public function colaborador() {
        return $this->belongsTo(Colaborador::class, 'colaborador_id');
    }
}
