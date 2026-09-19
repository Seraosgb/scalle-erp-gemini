<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GedDocumento extends Model
{
    protected $table = 'ged_documentos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = [];

    /**
     * Ligação Polimórfica (Permite que o documento seja anexado a Projetos, OS, DP, etc)
     */
    public function entidade_vinculada()
    {
        return $this->morphTo();
    }
}
