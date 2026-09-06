<?php

namespace App\Traits;

use App\Models\Empresa;
use App\Scopes\EmpresaScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\App;

trait BelongsToEmpresa
{
    public static function bootBelongsToEmpresa(): void
    {
        static::addGlobalScope(new EmpresaScope());

        static::creating(function ($model) {
            if (empty($model->empresa_id) && App::bound('current_empresa_id')) {
                $model->empresa_id = App::make('current_empresa_id');
            }
        });
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
