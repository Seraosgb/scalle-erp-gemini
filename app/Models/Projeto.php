<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Projeto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_projetos';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'cliente_id', 'nome', 'descricao',
        'data_inicio', 'data_fim_prevista', 'orcamento_previsto', 'status_id'
    ];

    public function etapas()
    {
        return $this->hasMany(Etapa::class, 'projeto_id')->orderBy('ordem');
    }

    public function tarefas()
    {
        return $this->hasMany(Tarefa::class, 'projeto_id');
    }
}
