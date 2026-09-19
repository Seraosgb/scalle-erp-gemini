<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\GedDocumento;

class Tarefa extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_tarefas';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'projeto_id', 'etapa_id', 'responsavel_id',
        'titulo', 'descricao', 'data_vencimento', 'prioridade'
    ];

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'projeto_id');
    }

    public function etapa()
    {
        return $this->belongsTo(Etapa::class, 'etapa_id');
    }

    public function apontamentos()
    {
        return $this->hasMany(Apontamento::class, 'tarefa_id');
    }
    public function checklists()
    {
        return $this->hasMany(PrjTarefaChecklist::class, 'tarefa_id');
    }

    public function dependencias()
    {
        // Tarefas que precisam ser terminadas ANTES desta
        return $this->belongsToMany(Tarefa::class, 'prj_tarefa_dependencias', 'tarefa_id', 'depende_de_id');
    }

    public function anexos()
    {
        // Ligação polimórfica com o GED
        return $this->morphMany(GedDocumento::class, 'entidade_vinculada');
    }
}
