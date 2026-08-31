<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use Illuminate\Support\Facades\App;
use RuntimeException;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        // Aplica o cerco em TODAS as queries de leitura/update/delete
        static::addGlobalScope(new TenantScope);

        // Intercepta a criação (insert)
        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $tenantId = App::bound('current_tenant_id') ? App::make('current_tenant_id') : null;

                if (!$tenantId && !app()->runningInConsole()) {
                    // Ignora bloqueio de insert caso seja o próprio User sendo criado na mão
                    if (class_basename($model) === 'User') return;

                    throw new RuntimeException("🔒 Furo de Segurança Bloqueado [Padrão Gemini]: Tentativa de inserir registro no model " . class_basename($model) . " sem tenant_id.");
                }

                if ($tenantId) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }
}
