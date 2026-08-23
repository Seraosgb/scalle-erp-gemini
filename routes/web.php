<?php

use Illuminate\Support\Facades\Route;

// Health Check
Route::get('/health', function () {
    return response()->json([
        'status' => 'OK',
        'sistema' => 'Scalle ERP',
        'versao' => '2.0.0 Enterprise',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Redireciona a raiz para /app/
Route::get('/', function () {
    return redirect('/app/');
});

// Fallback explícito para carregar o SPA React
Route::get('/app/{any?}', function () {
    $indexPath = public_path('app/index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return response()->json([
        'error' => 'Build SPA não encontrado em public/app/index.html'
    ], 404);
})->where('any', '.*');