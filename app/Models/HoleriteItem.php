<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HoleriteItem extends Model
{
    use HasUuids;

    protected $table = 'rh_holerite_itens';

    protected $fillable = [
        'holerite_id', 'tipo', 'rubrica_id', 'descricao', 'referencia', 'valor'
    ];

    protected $casts = [
        'valor' => 'decimal:2',
    ];

    public function holerite(): BelongsTo
    {
        return $this->belongsTo(Holerite::class, 'holerite_id');
    }

    public function rubrica(): BelongsTo
    {
        return $this->belongsTo(TabelaDominio::class, 'rubrica_id');
    }
}
