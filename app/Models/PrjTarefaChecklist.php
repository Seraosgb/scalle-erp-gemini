<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrjTarefaChecklist extends Model
{
    protected $table = 'prj_tarefa_checklists';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tarefa_id',
        'descricao',
        'concluido',
    ];

    protected $casts = [
        'concluido' => 'boolean',
    ];

    /**
     * Retorna a tarefa à qual este item de checklist pertence.
     */
    public function tarefa(): BelongsTo
    {
        return $this->belongsTo(Tarefa::class, 'tarefa_id');
    }
}
