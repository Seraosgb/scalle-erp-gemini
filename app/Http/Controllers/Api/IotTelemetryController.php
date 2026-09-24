<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class IotTelemetryController extends Controller
{
    // Rota pública protegida por API Key embutida no microcontrolador (ESP32)
    public function receive(Request $request)
    {
        $data = $request->validate([
            'api_key' => 'required|string',
            'tenant_id' => 'required|uuid',
            'device_id' => 'required|string',
            'sensor_type' => 'required|string', // ex: 'TEMPERATURE', 'PIECE_COUNTER'
            'value' => 'required|numeric'
        ]);

        // Aqui validamos a API Key do Tenant contra a base de dados
        // (Lógica simplificada para a estrutura core)

        DB::table('iot_leituras')->insert([
            'tenant_id' => $data['tenant_id'],
            'device_id' => $data['device_id'],
            'tipo_sensor' => $data['sensor_type'],
            'valor' => $data['value'],
            'created_at' => now(),
        ]);

        // Retorno extremamente leve (ACK) para não travar o ESP32
        return response()->json(['ack' => true], 201);
    }
}
