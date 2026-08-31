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
        // 1. Tenta pegar do Container (injetado via Middleware ou Jobs)
        $tenantId = App::bound('current_tenant_id') ? App::make('current_tenant_id') : null;

        // 2. Fallback Imediato: Se estiver vazio mas tiver um usuário logado na API, puxa dele!
        if (!$tenantId && auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
        }

        // 3. Strict Mode: Se continuou vazio, trava tudo.
        if (!$tenantId) {
            if (!app()->runningInConsole()) {
                throw new RuntimeException("🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . class_basename($model) . " sem contexto de Tenant definido.");
            }
            return;
        }

        // Aplica a blindagem
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
