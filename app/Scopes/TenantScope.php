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

        if (!$tenantId) {
            // Bypass de Autenticação (O Ovo ou a Galinha):
            // Permite que o Sanctum consulte o Usuário no banco ANTES de sabermos qual é o tenant dele.
            if (class_basename($model) === 'User' || class_basename($model) === 'PersonalAccessToken') {
                return;
            }

            // Strict Mode: Trava qualquer outra tabela do sistema!
            if (!app()->runningInConsole()) {
                throw new RuntimeException("🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . class_basename($model) . " sem contexto de Tenant definido.");
            }
            return;
        }

        // Aplica a blindagem para a tabela atual
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
