<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EnpsResposta extends Model {
    use HasUuids;
    protected $table = 'rh_enps_respostas';
    // Sem Trait de Tenant/Empresa aqui para garantir o isolamento anonimizado na base
    protected $fillable = ['campanha_id', 'nota', 'comentario'];
}
