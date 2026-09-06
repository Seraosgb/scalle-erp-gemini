<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\App;

class EmpresaScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        // Se a aplicação estiver rodando comandos de console ou se o usuário tiver perfil corporativo consolidado
        if (app()->runningInConsole() || App::bound('bypass_empresa_scope')) {
            return;
        }

        $empresaId = App::bound('current_empresa_id') ? App::make('current_empresa_id') : null;

        if ($empresaId) {
            $builder->where($model->getTable() . '.empresa_id', $empresaId);
        }
    }
}
