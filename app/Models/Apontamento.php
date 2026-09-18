<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Apontamento extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'prj_apontamentos';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'tarefa_id', 'usuario_id',
        'inicio', 'fim', 'descricao', 'is_faturavel'
    ];

    public function tarefa()
    {
        return $this->belongsTo(Tarefa::class, 'tarefa_id');
    }
}
