<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\PessoaController;
use App\Http\Controllers\Api\VendaController;
use Illuminate\Support\Facades\Route;

// Rotas Públicas
Route::post('/auth/login', [AuthController::class, 'login']);

// Rotas Protegidas por Autenticação Stateless (Sanctum)
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Dashboard Consolidado
    Route::get('/dashboard/metricas', [DashboardController::class, 'metricas']);

    // Pessoas (Clientes e Fornecedores)
    Route::apiResource('pessoas', PessoaController::class);

    // Itens (Produtos e Serviços)
    Route::apiResource('itens', ItemController::class);

    // Vendas e PDV
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::get('/vendas', [VendaController::class, 'index']);

    // Ordens de Serviço (OS)
    Route::apiResource('ordens-servico', OrdemServicoController::class);
    Route::post('/ordens-servico/{id}/concluir', [OrdemServicoController::class, 'concluir']);
});