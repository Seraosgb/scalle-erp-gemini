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
            $modelClass = class_basename($model);

            // Bypass de Autenticação inicial:
            // Permite checar Usuário, Token e Perfil antes de amarrar o tenant ativo
            if (in_array($modelClass, ['User', 'PersonalAccessToken', 'Perfil'], true)) {
                return;
            }

            // Strict Mode: Bloqueia qualquer outra tabela do sistema sem contexto
            if (!app()->runningInConsole()) {
                throw new RuntimeException("🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . $modelClass . " sem contexto de Tenant definido.");
            }
            return;
        }

        // Aplica a blindagem para a tabela atual
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
