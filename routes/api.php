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

    // Itens & WMS
    Route::get('/itens', [ItemController::class, 'index']);
    Route::post('/itens', [ItemController::class, 'store']);
    Route::get('/itens/{id}/kardex', [ItemController::class, 'kardex']);
    Route::get('/wms/depositos', [ItemController::class, 'depositos']);
    Route::post('/wms/importar-xml', [ItemController::class, 'importarXml']);

    // Comercial & OS
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::apiResource('ordens-servico', OrdemServicoController::class);

    // Financeiro & Tesouraria
    Route::get('/financeiro/titulos', [FinanceiroController::class, 'titulos']);
    Route::get('/financeiro/contas', [FinanceiroController::class, 'contas']);
    Route::get('/financeiro/contas/{id}/extrato', [FinanceiroController::class, 'extrato']);
    Route::post('/financeiro/titulos/{id}/liquidar', [FinanceiroController::class, 'liquidar']);

    // Motor Fiscal
    Route::get('/fiscal/documentos', [FiscalController::class, 'index']);
    Route::get('/fiscal/regras', [FiscalController::class, 'regras']);
    Route::post('/fiscal/emitir', [FiscalController::class, 'emitir']);
});