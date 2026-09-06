<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\App;
use RuntimeException;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // 1. Bypass explícito para comandos de console e rotinas de deploy
        if (app()->runningInConsole() || App::bound('bypass_tenant_scope')) {
            return;
        }

        // 2. Bypass para o SaaS Owner (Master Global): visão irrestrita de sustentação da plataforma
        $user = auth()->user() ?? request()?->user();
        if ($user && ($user->is_master ?? false)) {
            return;
        }

        $tenantId = App::bound('current_tenant_id') ? App::make('current_tenant_id') : null;

        // Se o container não tiver tenant_id, mas o usuário autenticado tiver, resolve e injeta automaticamente
        if (!$tenantId && $user && !empty($user->tenant_id)) {
            $tenantId = $user->tenant_id;
            App::instance('current_tenant_id', $tenantId);
        }

        if (!$tenantId) {
            $modelClass = class_basename($model);

            // Bypass de Autenticação inicial e Resolução de Sessão:
            // Permite checar Usuário, Token e Perfil antes de amarrar o tenant ativo
            if (in_array($modelClass, ['User', 'PersonalAccessToken', 'Perfil'], true)) {
                return;
            }

            // Permite rotas preliminares de autenticação pública resolverem credenciais
            if (request()?->is('api/auth/*')) {
                return;
            }

            // Strict Mode: Bloqueia qualquer outra tabela operacional sem contexto válido
            throw new RuntimeException("🔒 Vazamento Evitado [Padrão Gemini]: Tentativa de consulta no model " . $modelClass . " sem contexto de Tenant definido.");
        }

        // Aplica a blindagem hermética por tenant para o model atual
        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
