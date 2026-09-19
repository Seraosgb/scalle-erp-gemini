<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Entregavel extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_entregaveis';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'projeto_id', 'titulo', 'descricao',
        'data_prevista', 'data_entrega', 'valor_faturamento', 'status_id'
    ];
}
