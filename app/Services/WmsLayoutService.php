<?php

namespace App\Services;

use App\Models\EstoqueDeposito;

class WmsLayoutService
{
    /**
     * Sugere o melhor endereço (Rua, Prédio, Nível, Vão) para armazenagem (Putaway)
     */
    public static function sugerirEnderecoPutaway(string $depositoId, string $itemId): array
    {
        // Prioriza o mesmo corredor/rua onde já existem lotes do mesmo item
        $existente = EstoqueDeposito::where('deposito_id', $depositoId)
            ->where('item_id', $itemId)
            ->whereNotNull('localizacao_rua')
            ->first();

        if ($existente) {
            return [
                'rua' => $existente->localizacao_rua,
                'predio' => $existente->localizacao_predio,
                'nivel' => $existente->localizacao_nivel,
                'vao' => $existente->localizacao_vao,
            ];
        }

        // Endereço padrão de recepção caso não haja histórico
        return [
            'rua' => 'R01',
            'predio' => 'P01',
            'nivel' => 'N01',
            'vao' => 'V01',
        ];
    }
}