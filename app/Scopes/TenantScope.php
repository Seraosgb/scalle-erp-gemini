<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\App;
use RuntimeException;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        $tenantId = App::bound('current_tenant_id') ? App::make('current_tenant_id') : null;

        // 1. Strict Mode: Se não tem tenant na web, derruba a operação!
        if (!$tenantId) {
            // Liberamos o console (artisan migrate/jobs master) para não quebrar a infra
            if (!app()->runningInConsole()) {
                throw new RuntimeException("🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . class_basename($model) . " sem contexto de Tenant definido.");
            }
            return;
        }

        // Aplica o filtro de forma blindada, respeitando o nome da tabela
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
