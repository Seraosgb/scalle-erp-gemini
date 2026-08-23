<?php

use Illuminate\Support\Facades\Route;

// Rota de Health Check da API
Route::get('/health', function () {
    return response()->json([
        'status' => 'OK',
        'sistema' => 'Scalle ERP',
        'versao' => '2.0.0 Enterprise',
        'database' => 'PostgreSQL 16',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Fallback para o SPA React (Carrega index.html para qualquer rota não-API)
Route::fallback(function () {
    $indexPath = public_path('app/index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return response()->json([
        'error' => 'Frontend SPA build não encontrado em public/app. Execute npm run build.'
    ], 404);
});