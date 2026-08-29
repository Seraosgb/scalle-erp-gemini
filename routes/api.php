<?php

use App\Http\Controllers\Api\AtivoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CertificadoFiscalController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\CotacaoCompraController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\ExportacaoContabilController;
use App\Http\Controllers\Api\FinanceiroController;
use App\Http\Controllers\Api\FiscalController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\PcpController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\PessoaController;
use App\Http\Controllers\Api\PortalClienteController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VendaController;
use Illuminate\Support\Facades\Route;

// --- ROTAS PÚBLICAS (Sem autenticação) ---
Route::post('/auth/login', [AuthController::class, 'login']);

// Portal do Cliente (Token Seguro de OS)
Route::get('/portal/os/{token}', [PortalClienteController::class, 'consultarOs']);
Route::post('/portal/os/{token}/aprovar', [PortalClienteController::class, 'aprovarOrcamento']);
Route::post('/portal/os/{token}/assinar', [PortalClienteController::class, 'assinarLaudoCliente']);

// --- ROTAS AUTENTICADAS (Sanctum + Tenant Scope) ---
Route::middleware(['auth:sanctum', 'tenant.identify', 'subscription.status'])->group(function () {
    // Auth & MFA / 2FA
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/mfa/setup', [AuthController::class, 'mfaSetup']);
    Route::post('/auth/mfa/confirmar', [AuthController::class, 'mfaConfirmar']);
    Route::post('/auth/mfa/desativar', [AuthController::class, 'mfaDesativar']);

    // Dashboard
    Route::get('/dashboard/metricas', [DashboardController::class, 'metricas']);

    // Pessoas
    Route::apiResource('pessoas', PessoaController::class);

    // WMS, Produtos & Depósitos
    Route::apiResource('itens', ItemController::class);
    Route::get('/wms/depositos', [ItemController::class, 'depositos']);
    Route::post('/wms/depositos', [ItemController::class, 'storeDeposito']);
    Route::put('/wms/depositos/{id}', [ItemController::class, 'updateDeposito']);
    Route::delete('/wms/depositos/{id}', [ItemController::class, 'destroyDeposito']);
    Route::get('/wms/saldos', [ItemController::class, 'saldosPorDeposito']);
    Route::post('/wms/ajustar-saldo', [ItemController::class, 'ajustarSaldo']);
    Route::post('/wms/inventario-lote', [ItemController::class, 'inventarioLote']);
    Route::get('/wms/transferencias', [ItemController::class, 'transferencias']);
    Route::post('/wms/transferir', [ItemController::class, 'transferir']);
    Route::post('/wms/transferencias/{id}/conferir', [ItemController::class, 'conferirTransferencia']);
    Route::get('/wms/relatorio/curva-abc', [ItemController::class, 'relatorioCurvaAbc']);
    Route::get('/itens/{id}/kardex', [ItemController::class, 'kardex']);
    Route::post('/compras/importar-xml', [ItemController::class, 'importarXml']);

    // Compras & Cotações
    Route::apiResource('compras', CompraController::class);
    Route::apiResource('cotacoes', CotacaoCompraController::class);
    Route::post('/cotacoes/{id}/propostas', [CotacaoCompraController::class, 'adicionarProposta']);
    Route::post('/cotacoes/{cotacaoId}/propostas/{propostaId}/aprovar', [CotacaoCompraController::class, 'aprovarPropostaVencedora']);

    // Vendas & PDV
    Route::get('/vendas/metricas', [VendaController::class, 'metricas']);
    Route::apiResource('vendas', VendaController::class);
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::post('/vendas/orcamento', [VendaController::class, 'orcamento']);
    Route::post('/vendas/{id}/converter', [VendaController::class, 'converter']);
    Route::post('/vendas/{id}/cancelar', [VendaController::class, 'cancelar']);
    Route::get('/vendas/alcadas/pendentes', [VendaController::class, 'listarAlcadasPendentes']);
    Route::post('/vendas/alcadas/{id}/responder', [VendaController::class, 'responderAlcada']);
    Route::get('/vendas/comissoes/extrato', [VendaController::class, 'extratoComissoes']);
    Route::get('/vendas/comissoes/regras', [VendaController::class, 'listarRegrasComissao']);
    Route::post('/vendas/comissoes/regras', [VendaController::class, 'storeRegraComissao']);
    Route::patch('/vendas/comissoes/regras/{id}/toggle', [VendaController::class, 'toggleRegraComissao']);
    Route::post('/vendas/processar-cartao', [VendaController::class, 'processarCartaoPdv']);

    // Ordens de Serviço (CMMS) & Preventivas PMOC
    Route::get('/os/bootstrap', [OrdemServicoController::class, 'bootstrapData']);
    Route::get('/os/metricas-cmms', [OrdemServicoController::class, 'metricasCmms']);
    Route::apiResource('os', OrdemServicoController::class);
    Route::post('/os/{id}/fotos', [OrdemServicoController::class, 'uploadFoto']);
    Route::post('/os/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::patch('/os/{id}/status', [OrdemServicoController::class, 'atualizarStatus']);
    Route::patch('/os/{id}/parametros-tecnicos', [OrdemServicoController::class, 'atualizarDadosTecnicos']);
    Route::post('/os/{id}/pecas', [OrdemServicoController::class, 'adicionarPeca']);
    Route::patch('/os/{osId}/pecas/{itemId}/tratar', [OrdemServicoController::class, 'tratarPecaAlmoxarifado']);

    // Ativos & Planos Preventivos
    Route::apiResource('ativos', AtivoController::class);
    Route::get('/planos-preventivos', [AtivoController::class, 'planosPreventivos']);
    Route::post('/planos-preventivos', [AtivoController::class, 'storePlanoPreventivo']);
    Route::put('/planos-preventivos/{id}', [AtivoController::class, 'updatePlanoPreventivo']);
    Route::patch('/planos-preventivos/{id}/toggle', [AtivoController::class, 'alterarStatusPlanoPreventivo']);
    Route::get('/prioridades-os', [AtivoController::class, 'prioridades']);
    Route::post('/prioridades-os', [AtivoController::class, 'storePrioridade']);
    Route::put('/prioridades-os/{id}', [AtivoController::class, 'updatePrioridade']);

    // PCP & Indústria
    Route::get('/pcp/kpis', [PcpController::class, 'metricasKpi']);
    Route::get('/pcp/ordens', [PcpController::class, 'ordensProducao']);
    Route::post('/pcp/ordens', [PcpController::class, 'storeOrdemProducao']);
    Route::get('/pcp/ordens/{id}', [PcpController::class, 'showOrdemProducao']);
    Route::put('/pcp/ordens/{id}', [PcpController::class, 'updateOrdemProducao']);
    Route::delete('/pcp/ordens/{id}', [PcpController::class, 'destroyOrdemProducao']);
    Route::post('/pcp/ordens/{id}/cancelar', [PcpController::class, 'cancelarOrdemProducao']);
    Route::post('/pcp/ordens/{id}/finalizar', [PcpController::class, 'finalizarOrdemProducao']);
    Route::post('/pcp/ordens/{id}/apontar', [PcpController::class, 'apontarOrdemProducao']);
    Route::get('/pcp/ordens/{id}/genealogia', [PcpController::class, 'genealogiaLote']);
    Route::get('/pcp/estruturas', [PcpController::class, 'estruturas']);
    Route::post('/pcp/estruturas', [PcpController::class, 'storeEstrutura']);
    Route::delete('/pcp/estruturas/{id}', [PcpController::class, 'destroyEstruturaItem']);
    Route::get('/pcp/mrp/analise', [PcpController::class, 'analiseMrp']);
    Route::post('/pcp/mrp/gerar-cotacao', [PcpController::class, 'gerarCotacaoMrp']);

    // Financeiro
    Route::get('/financeiro/titulos', [FinanceiroController::class, 'titulos']);
    Route::get('/financeiro/contas', [FinanceiroController::class, 'contas']);
    Route::get('/financeiro/contas/{id}/extrato', [FinanceiroController::class, 'extrato']);
    Route::post('/financeiro/titulos/{id}/liquidar', [FinanceiroController::class, 'liquidar']);

    // Exportação Contábil & Fiscal Externa
    Route::get('/exportacoes/metricas', [ExportacaoContabilController::class, 'metricas']);
    Route::get('/exportacoes/download', [ExportacaoContabilController::class, 'download']);

    // Motor Fiscal & Certificados
    Route::get('/fiscal/documentos', [FiscalController::class, 'index']);
    Route::get('/fiscal/regras', [FiscalController::class, 'regras']);
    Route::post('/fiscal/emitir', [FiscalController::class, 'emitir']);
    Route::get('/fiscal/certificado', [CertificadoFiscalController::class, 'show']);
    Route::post('/fiscal/certificado/upload', [CertificadoFiscalController::class, 'upload']);

    // Governança, ACL & Equipe
    Route::apiResource('usuarios', UsuarioController::class);
    Route::apiResource('empresas', EmpresaController::class);
    Route::post('/empresas/trocar-contexto', [EmpresaController::class, 'trocarContexto']);
    Route::apiResource('perfis', PerfilController::class);

    // Painel Master SaaS
    Route::middleware('master')->group(function () {
        Route::get('/master/metricas', [MasterController::class, 'metricas']);
        Route::get('/master/tenants', [MasterController::class, 'tenants']);
        Route::post('/master/tenants', [MasterController::class, 'storeTenant']);
        Route::patch('/master/tenants/{id}/status', [MasterController::class, 'alterarStatusTenant']);
    });
});