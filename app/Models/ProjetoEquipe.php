<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjetoEquipe extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_projeto_equipe';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'projeto_id', 'usuario_id', 'papel_id', 'custo_hora'
    ];
}
