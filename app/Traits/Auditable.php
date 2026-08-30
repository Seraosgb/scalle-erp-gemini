<?php

namespace App\Traits;

use App\Models\AuditoriaLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            static::gravarAuditoriaLog($model, 'CREATED', null, $model->getAttributes());
        });

        static::updated(function ($model) {
            static::gravarAuditoriaLog($model, 'UPDATED', $model->getOriginal(), $model->getChanges());
        });

        static::deleted(function ($model) {
            static::gravarAuditoriaLog($model, 'DELETED', $model->getOriginal(), null);
        });
    }

    protected static function gravarAuditoriaLog($model, string $acao, ?array $antigos, ?array $novos): void
    {
        try {
            $user = Auth::user();
            $tenantId = $model->tenant_id ?? $user?->tenant_id ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
            $nomeTabela = $model->getTable();

            AuditoriaLog::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'usuario_id' => $user?->id,
                'modulo' => 'CRM',
                'acao' => $acao,
                'entidade' => $nomeTabela, // Suporte para coluna legada
                'tabela_entidade' => $nomeTabela, // Suporte para coluna atual
                'registro_id' => (string) $model->getKey(),
                'valores_anteriores' => $antigos,
                'valores_novos' => $novos,
                'ip' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("[Auditoria] Falha silenciosa: " . $e->getMessage());
        }
    }
}