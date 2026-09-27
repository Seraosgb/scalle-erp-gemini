<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PdvCaixa extends Model
{
    use SoftDeletes, BelongsToTenant, BelongsToEmpresa;

    protected $table = 'pdv_caixas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'tenant_id', 'empresa_id', 'usuario_id', 'data_abertura',
        'data_fechamento', 'saldo_abertura', 'saldo_informado',
        'saldo_calculado', 'quebra_caixa', 'status', 'observacoes'
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => empty($m->id) ? $m->id = (string) Str::uuid() : null);
    }

    public function movimentacoes()
    {
        return $this->hasMany(PdvMovimentacao::class, 'caixa_id');
    }
}
