<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class Projeto extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'prj_projetos';

    protected $fillable = [
        'tenant_id',
        'nome',
        'descricao',
        'orcamento_previsto',
        'custo_total_real',
        'status',
        'cliente_id',
    ];

    /**
     * Relação com o Cliente (Módulo de Pessoas)
     */
    public function cliente()
    {
        return $this->belongsTo(Pessoa::class, 'cliente_id');
    }

    /**
     * Relação com as Etapas do Kanban
     */
    public function etapas()
    {
        return $this->hasMany(Etapa::class, 'projeto_id')->orderBy('ordem');
    }

    /**
     * Relação de acesso direto a todas as tarefas do projeto
     */
    public function tarefas()
    {
        return $this->hasManyThrough(Tarefa::class, Etapa::class, 'projeto_id', 'etapa_id');
    }
}
