<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjetoCusto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_custos';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'projeto_id', 'tipo_custo_id',
        'valor', 'data_custo', 'descricao', 'apontamento_id'
    ];
}
