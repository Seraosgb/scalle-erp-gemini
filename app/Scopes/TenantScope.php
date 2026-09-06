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
        // 1. Bypass para comandos Artisan de console e rotinas de deploy
        if (app()->runningInConsole() || App::bound('bypass_tenant_scope')) {
            return;
        }

        // 2. Se o usuário autenticado for o SaaS Owner (Master Global), ele tem acesso irrestrito
        $user = auth()->user() ?? request()->user();
        if ($user && $user->is_master) {
            return;
        }

        // 3. Resolução do Tenant ativo no container
        $tenantId = App::bound('current_tenant_id') ? App::make('current_tenant_id') : null;

        // Se o usuário autenticado comum tiver tenant_id, usa como fallback seguro
        if (!$tenantId && $user && !empty($user->tenant_id)) {
            $tenantId = $user->tenant_id;
            App::instance('current_tenant_id', $tenantId);
        }

        // 4. Se não há tenant resolvido e NÃO é Master: trava intransigente de segurança
        if (!$tenantId) {
            // Se for endpoint de autenticação preliminar (login público)
            if (request()?->is('api/auth/*')) {
                return;
            }

            throw new RuntimeException(
                "🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . class_basename($model) . " sem contexto de Tenant definido."
            );
        }

        // 5. Injeta a cláusula hermética de isolamento para inquilinos
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
