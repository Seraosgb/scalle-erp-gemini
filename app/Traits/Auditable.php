<?php

namespace App\Traits;

use App\Models\AuditoriaLog;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    public static function bootAuditable()
    {
        static::created(function ($model) {
            self::registrarLog('CREATED', $model, null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $alterados = $model->getChanges();
            $originais = array_intersect_key($model->getOriginal(), $alterados);
            if (!empty($alterados)) {
                self::registrarLog('UPDATED', $model, $originais, $alterados);
            }
        });

        static::deleted(function ($model) {
            self::registrarLog('DELETED', $model, $model->getAttributes(), null);
        });
    }

    protected static function registrarLog($acao, $model, $velho, $novo)
    {
        if (app()->runningInConsole() && !app()->runningUnitTests()) {
            return; // Ignora seeders massivos
        }

        $user = Request::user();
        
        AuditoriaLog::create([
            'tenant_id' => $model->tenant_id ?? ($user->tenant_id ?? null),
            'usuario_id' => $user->id ?? null,
            'acao' => $acao,
            'tabela_entidade' => $model->getTable(),
            'registro_id' => $model->id ?? null,
            'valores_anteriores' => $velho,
            'valores_novos' => $novo,
            'ip' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}