<?php

use Illuminate\Support\Facades\Route;

// Health Check do Backend
Route::get('/health', function () {
    return response()->json([
        'status' => 'OK',
        'sistema' => 'Scalle ERP',
        'versao' => '2.0.0 Enterprise',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Fallback SPA: qualquer rota de frontend (ex: /wms, /pdv, /os, /financeiro, /login) carrega o SPA
Route::get('/{any}', function () {
    $indexPath = public_path('app/index.html');
    
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }

    return response()->json([
        'error' => 'Build SPA não encontrado em public/app/index.html'
    ], 404);
})->where('any', '^(?!api|health).*$');