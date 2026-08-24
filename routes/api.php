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
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Middleware\CheckMaster;

/*
|--------------------------------------------------------------------------
| Rotas Públicas (Sem Autenticação)
|--------------------------------------------------------------------------
*/
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/portal/os/{token}', [PortalClienteController::class, 'consultarOs']);
// Rotas do SaaS Owner
Route::middleware(['auth:sanctum', CheckMaster::class])->prefix('master')->group(function () {
    Route::get('/metricas', [MasterController::class, 'metricas']);
    Route::get('/tenants', [MasterController::class, 'tenants']);
    Route::post('/tenants', [MasterController::class, 'storeTenant']);
    Route::put('/tenants/{id}/status', [MasterController::class, 'alterarStatusTenant']);
});

/*
|--------------------------------------------------------------------------
| Rotas Protegidas (Sanctum Stateless + Multi-Tenant)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Autenticação & Sessão
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

   // Rotas de Governança
Route::get('/empresas', [EmpresaController::class, 'index']);
Route::post('/empresas', [EmpresaController::class, 'store']);
Route::put('/empresas/{id}', [EmpresaController::class, 'update']);
Route::delete('/empresas/{id}', [EmpresaController::class, 'destroy']);
Route::post('/empresas/trocar-contexto', [EmpresaController::class, 'trocarContexto']);

Route::get('/usuarios', [UsuarioController::class, 'index']);
Route::post('/usuarios', [UsuarioController::class, 'store']);
Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);

Route::get('/perfis', [PerfilController::class, 'index']);
Route::post('/perfis', [PerfilController::class, 'store']);
Route::put('/perfis/{id}', [PerfilController::class, 'update']);
Route::delete('/perfis/{id}', [PerfilController::class, 'destroy']);

    // Dashboard Consolidado
    Route::get('/dashboard/metricas', [DashboardController::class, 'metricas']);

    // Pessoas (Clientes, Fornecedores e Técnicos)
    Route::apiResource('pessoas', PessoaController::class);

    // WMS & Catálogo
Route::get('/wms/depositos', [ItemController::class, 'depositos']);
Route::post('/wms/depositos', [ItemController::class, 'storeDeposito']);
Route::put('/wms/depositos/{id}', [ItemController::class, 'updateDeposito']);
Route::delete('/wms/depositos/{id}', [ItemController::class, 'destroyDeposito']);
Route::get('/wms/posicao-estoque', [ItemController::class, 'saldosPorDeposito']);

Route::post('/wms/ajustar-saldo', [ItemController::class, 'ajustarSaldo']);
Route::post('/wms/transferir', [ItemController::class, 'transferir']);
Route::get('/itens/{id}/kardex', [ItemController::class, 'kardex']);
Route::post('/itens/importar-xml', [ItemController::class, 'importarXml']);
Route::post('/wms/importar-xml', [ItemController::class, 'importarXml']);
Route::apiResource('itens', ItemController::class);

// Vendas & Comercial
Route::get('/vendas', [VendaController::class, 'index']);
Route::get('/vendas/{id}', [VendaController::class, 'show']);
Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
Route::post('/vendas/orcamento', [VendaController::class, 'orcamento']);
Route::post('/vendas/{id}/converter', [VendaController::class, 'converter']);
Route::post('/vendas/{id}/cancelar', [VendaController::class, 'cancelar']);
Route::post('/vendas/{id}/emitir-fiscal', [VendaController::class, 'emitirFiscal']);

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

    // Dentro do grupo Route::middleware('auth:sanctum')
Route::get('/compras', [CompraController::class, 'index']);
Route::post('/compras', [CompraController::class, 'store']);
});