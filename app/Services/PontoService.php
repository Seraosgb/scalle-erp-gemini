<?php

namespace App\Services;

use App\Models\Colaborador;
use App\Models\PontoRegistro;
use Illuminate\Support\Str;

class PontoService
{
    /**
     * Registra a batida de ponto com coordenadas GPS, IP e hash criptográfico SHA-256 (REP-P Portaria 671)
     */
    public static function registrarPonto(
        Colaborador $colaborador,
        string $tipoRegistro,
        ?float $lat = null,
        ?float $lng = null,
        ?string $ip = null,
        ?string $deviceInfo = null
    ): PontoRegistro {
        $dataHora = now();
        $id = (string) Str::uuid();

        // Geração do Hash de Imutabilidade SHA-256
        $payloadString = "{$colaborador->tenant_id}|{$colaborador->id}|{$tipoRegistro}|{$dataHora->toIso8601String()}|{$lat}|{$lng}|{$ip}";
        $hash = hash('sha256', $payloadString);

        return PontoRegistro::create([
            'id' => $id,
            'colaborador_id' => $colaborador->id,
            'data_hora_registro' => $dataHora,
            'tipo_registro' => $tipoRegistro,
            'latitude' => $lat,
            'longitude' => $lng,
            'ip_origem' => $ip,
            'dispositivo_info' => $deviceInfo,
            'hash_registro' => $hash,
            'created_at' => $dataHora,
        ]);
    }
}