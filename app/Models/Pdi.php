<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pdi extends Model {
    use HasUuids, SoftDeletes;
    protected $table = 'rh_pdi';
    protected $fillable = ['avaliacao_id', 'objetivo', 'plano_acao', 'prazo_conclusao', 'status'];
}
