<?php

namespace App\Traits;

use App\Models\Scopes\GlobalScopeTenant;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        // Aplica o Global Scope para isolamento automático em queries
        static::addGlobalScope(new GlobalScopeTenant);

        // Auto-injeta UUID no id e o tenant_id ativo na criação de qualquer registro
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }

            if (empty($model->tenant_id) && App::bound('current_tenant_id')) {
                $model->tenant_id = App::make('current_tenant_id');
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}