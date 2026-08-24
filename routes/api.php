<?php

use App\Http\Controllers\Api\AtivoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\FinanceiroController;
use App\Http\Controllers\Api\FiscalController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\PessoaController;
use App\Http\Controllers\Api\PortalClienteController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VendaController;
use App\Http\Middleware\CheckMaster;
use Illuminate\Support\Facades\Route;

// Rotas Públicas
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

Route::get('/portal/os/{token}', [PortalClienteController::class, 'consultarOs']);

// Rotas Protegidas por Autenticação (Sanctum)
Route::middleware('auth:sanctum')->group(function () {

    // Sessão do Usuário
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // SaaS Owner (Master Global)
    Route::middleware(CheckMaster::class)->prefix('master')->group(function () {
        Route::get('/metricas', [MasterController::class, 'metricas']);
        Route::get('/tenants', [MasterController::class, 'tenants']);
        Route::post('/tenants', [MasterController::class, 'storeTenant']);
        Route::put('/tenants/{id}/status', [MasterController::class, 'alterarStatusTenant']);
    });

    // Dashboard Executivo
    Route::get('/dashboard/metricas', [DashboardController::class, 'metricas']);

    // Gestão Multi-Empresa / Filiais
    Route::get('/empresas', [EmpresaController::class, 'index']);
    Route::post('/empresas', [EmpresaController::class, 'store']);
    Route::put('/empresas/{id}', [EmpresaController::class, 'update']);
    Route::delete('/empresas/{id}', [EmpresaController::class, 'destroy']);
    Route::post('/empresas/trocar-contexto', [EmpresaController::class, 'trocarContexto']);

    // Governança, Equipe e ACL
    Route::get('/usuarios', [UsuarioController::class, 'index']);
    Route::get('/empresa/usuarios', [UsuarioController::class, 'index']);
    Route::post('/usuarios', [UsuarioController::class, 'store']);
    Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
    Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);

    Route::get('/perfis', [PerfilController::class, 'index']);
    Route::post('/perfis', [PerfilController::class, 'store']);
    Route::put('/perfis/{id}', [PerfilController::class, 'update']);
    Route::delete('/perfis/{id}', [PerfilController::class, 'destroy']);

    // Cadastros Mestres (Pessoas & Itens)
    Route::get('/pessoas', [PessoaController::class, 'index']);
    Route::post('/pessoas', [PessoaController::class, 'store']);
    Route::get('/pessoas/{id}', [PessoaController::class, 'show']);

    Route::get('/itens', [ItemController::class, 'index']);
    Route::post('/itens', [ItemController::class, 'store']);
    Route::put('/itens/{id}', [ItemController::class, 'update']);
    Route::delete('/itens/{id}', [ItemController::class, 'destroy']);
    Route::get('/itens/{id}/kardex', [ItemController::class, 'kardex']);

    // Ativos Patrimoniais
    Route::get('/ativos', [AtivoController::class, 'index']);
    Route::post('/ativos', [AtivoController::class, 'store']);

    // WMS & Logística de Depósitos
    Route::get('/wms/depositos', [ItemController::class, 'depositos']);
    Route::post('/wms/depositos', [ItemController::class, 'storeDeposito']);
    Route::put('/wms/depositos/{id}', [ItemController::class, 'updateDeposito']);
    Route::delete('/wms/depositos/{id}', [ItemController::class, 'destroyDeposito']);
    Route::get('/wms/posicoes', [ItemController::class, 'saldosPorDeposito']);
    Route::post('/wms/ajustar-saldo', [ItemController::class, 'ajustarSaldo']);
    Route::post('/wms/transferir', [ItemController::class, 'transferir']);
    Route::post('/wms/importar-xml', [ItemController::class, 'importarXml']);

    // Compras & Suprimentos
    Route::get('/compras', [CompraController::class, 'index']);
    Route::post('/compras', [CompraController::class, 'store']);

    // Comercial, Vendas & PDV
    Route::get('/vendas', [VendaController::class, 'index']);
    Route::get('/vendas/{id}', [VendaController::class, 'show']);
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::post('/vendas/orcamento', [VendaController::class, 'orcamento']);
    Route::post('/vendas/{id}/converter', [VendaController::class, 'converter']);
    Route::post('/vendas/{id}/cancelar', [VendaController::class, 'cancelar']);
    Route::post('/vendas/{id}/emitir-fiscal', [VendaController::class, 'emitirFiscal']);

    // Prestação de Serviços & CMMS (Rotas estáticas declaradas ANTES de rotas com {id})
    Route::get('/os/metricas-cmms', [OrdemServicoController::class, 'metricasCmms']);
    Route::get('/os/planos-preventivos', [AtivoController::class, 'planosPreventivos']);
    Route::post('/os/planos-preventivos', [AtivoController::class, 'storePlanoPreventivo']);
    Route::get('/os/prioridades', [AtivoController::class, 'prioridades']);

    Route::get('/os', [OrdemServicoController::class, 'index']);
    Route::get('/ordens-servico', [OrdemServicoController::class, 'index']);
    Route::post('/os', [OrdemServicoController::class, 'store']);
    Route::post('/ordens-servico', [OrdemServicoController::class, 'store']);
    Route::post('/os/prioridades', [AtivoController::class, 'storePrioridade']);

    Route::get('/os/{id}', [OrdemServicoController::class, 'show']);
    Route::get('/ordens-servico/{id}', [OrdemServicoController::class, 'show']);
    Route::post('/os/{id}/fotos', [OrdemServicoController::class, 'uploadFoto']);
    Route::post('/ordens-servico/{id}/fotos', [OrdemServicoController::class, 'uploadFoto']);
    Route::post('/os/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::post('/ordens-servico/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::put('/os/planos-preventivos/{id}', [AtivoController::class, 'updatePlanoPreventivo']);
    Route::put('/os/planos-preventivos/{id}/status', [AtivoController::class, 'alterarStatusPlanoPreventivo']);
    Route::put('/os/prioridades/{id}', [AtivoController::class, 'updatePrioridade']);

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