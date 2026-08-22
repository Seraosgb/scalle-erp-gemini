<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\App;

class GlobalScopeTenant implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Se houver um tenant ativo no contexto da aplicação, força o filtro
        if (App::bound('current_tenant_id') && !empty(App::make('current_tenant_id'))) {
            $tenantId = App::make('current_tenant_id');
            $builder->where($model->qualifyColumn('tenant_id'), $tenantId);
        }
    }
}