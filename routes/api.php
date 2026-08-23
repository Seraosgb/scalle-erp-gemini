<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceiroController;
use App\Http\Controllers\Api\FiscalController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\PessoaController;
use App\Http\Controllers\Api\PortalClienteController;
use App\Http\Controllers\Api\VendaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas Públicas (Sem Autenticação)
|--------------------------------------------------------------------------
*/
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/portal/os/{token}', [PortalClienteController::class, 'consultarOs']);

/*
|--------------------------------------------------------------------------
| Rotas Protegidas (Sanctum Stateless + Multi-Tenant)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Autenticação & Sessão
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Dashboard Consolidado
    Route::get('/dashboard/metricas', [DashboardController::class, 'metricas']);

    // Pessoas (Clientes, Fornecedores e Técnicos)
    Route::apiResource('pessoas', PessoaController::class);

    // Itens, Catálogo e WMS Estoque
    Route::get('/wms/depositos', [ItemController::class, 'depositos']);
    Route::post('/wms/depositos', [ItemController::class, 'storeDeposito']);
    Route::post('/wms/ajustar-saldo', [ItemController::class, 'ajustarSaldo']);
    Route::post('/wms/transferir', [ItemController::class, 'transferir']);
    Route::get('/itens/{id}/kardex', [ItemController::class, 'kardex']);
    Route::post('/itens/importar-xml', [ItemController::class, 'importarXml']);
    Route::post('/wms/importar-xml', [ItemController::class, 'importarXml']);
    Route::apiResource('itens', ItemController::class);

    // Comercial, Vendas e PDV
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::apiResource('vendas', VendaController::class);

    // Ordens de Serviço (OS)
    Route::post('/ordens-servico/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::apiResource('ordens-servico', OrdemServicoController::class);

    // Financeiro & Tesouraria
    Route::get('/financeiro/titulos', [FinanceiroController::class, 'titulos']);
    Route::get('/financeiro/contas', [FinanceiroController::class, 'contas']);
    Route::get('/financeiro/contas/{id}/extrato', [FinanceiroController::class, 'extrato']);
    Route::post('/financeiro/titulos/{id}/liquidar', [FinanceiroController::class, 'liquidar']);

    // Motor Fiscal & Tributário
    Route::get('/fiscal/documentos', [FiscalController::class, 'index']);
    Route::get('/fiscal/regras', [FiscalController::class, 'regras']);
    Route::post('/fiscal/emitir', [FiscalController::class, 'emitir']);
});