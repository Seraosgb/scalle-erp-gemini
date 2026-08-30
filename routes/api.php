<?php

use App\Http\Controllers\Api\AtivoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingWebhookController;
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
use App\Http\Middleware\CheckMaster;
use App\Http\Middleware\CheckSubscriptionStatus;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\SessaoController;
use App\Http\Controllers\Api\CrmInboundController;
use App\Http\Controllers\Api\CrmController;

// ==========================================
// Rotas Públicas (Sem login / Sem Sanctum)
// ==========================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Webhook de Captação de Leads (Landing Pages / RD Station)
Route::post('/crm/webhook/lead/{token}', [CrmInboundController::class, 'receberLead']);

// Webhooks de Gateways (Asaas, etc)
Route::post('/billing/webhook/asaas', [BillingWebhookController::class, 'handleAsaas']);

// Rotas Públicas do Portal do Cliente (Token Temporário)
Route::prefix('portal')->group(function () {
    Route::get('/os/{token}', [PortalClienteController::class, 'consultarOs']);
    Route::post('/os/{token}/aprovar', [PortalClienteController::class, 'aprovarOrcamento']);
    Route::post('/os/{token}/assinar', [PortalClienteController::class, 'assinarLaudoCliente']);
});

Route::get('/portal/os/{token}', [PortalClienteController::class, 'consultarOs']);
Route::post('/portal/os/{token}/aprovar', [PortalClienteController::class, 'aprovarOrcamento']);

// ==========================================
// Rotas Protegidas por Autenticação (Sanctum + Tenant + Subscription)
// ==========================================
Route::middleware(['auth:sanctum', IdentifyTenant::class, CheckSubscriptionStatus::class])->group(function () {

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
    Route::post('/itens/importar-xml', [ItemController::class, 'importarXml']);

    // Ativos Patrimoniais
    Route::get('/ativos', [AtivoController::class, 'index']);
    Route::post('/ativos', [AtivoController::class, 'store']);

    // WMS, Almoxarifado & Logística de Estoque
    Route::get('/wms/depositos', [ItemController::class, 'depositos']);
    Route::post('/wms/depositos', [ItemController::class, 'storeDeposito']);
    Route::put('/wms/depositos/{id}', [ItemController::class, 'updateDeposito']);
    Route::delete('/wms/depositos/{id}', [ItemController::class, 'destroyDeposito']);

    Route::get('/wms/saldos', [ItemController::class, 'saldosPorDeposito']);
    Route::get('/wms/posicoes', [ItemController::class, 'saldosPorDeposito']);
    Route::get('/wms/posicao-estoque', [ItemController::class, 'saldosPorDeposito']);
    Route::post('/wms/ajustar-saldo', [ItemController::class, 'ajustarSaldo']);
    Route::post('/wms/inventario-lote', [ItemController::class, 'inventarioLote']);

    Route::get('/wms/transferencias', [ItemController::class, 'transferencias']);
    Route::post('/wms/transferir', [ItemController::class, 'transferir']);
    Route::put('/wms/transferencias/{id}/conferir', [ItemController::class, 'conferirTransferencia']);
    Route::get('/wms/curva-abc', [ItemController::class, 'relatorioCurvaAbc']);
    Route::post('/wms/importar-xml', [ItemController::class, 'importarXml']);

    // Compras & Suprimentos
    Route::get('/compras', [CompraController::class, 'index']);
    Route::post('/compras', [CompraController::class, 'store']);
    Route::get('/compras/cotacoes', [CotacaoCompraController::class, 'index']);
    Route::post('/compras/cotacoes', [CotacaoCompraController::class, 'store']);
    Route::post('/compras/cotacoes/{id}/propostas', [CotacaoCompraController::class, 'adicionarProposta']);
    Route::put('/compras/cotacoes/{cotacaoId}/propostas/{propostaId}/aprovar', [CotacaoCompraController::class, 'aprovarPropostaVencedora']);

    // Comercial, Vendas & PDV
    Route::get('/vendas/metricas', [VendaController::class, 'metricas']);
    Route::get('/vendas', [VendaController::class, 'index']);
    Route::get('/vendas/{id}', [VendaController::class, 'show']);
    Route::post('/vendas/faturar', [VendaController::class, 'faturar']);
    Route::post('/vendas/orcamento', [VendaController::class, 'orcamento']);
    Route::post('/vendas/{id}/converter', [VendaController::class, 'converter']);
    Route::post('/vendas/{id}/cancelar', [VendaController::class, 'cancelar']);
    Route::get('/vendas/alcadas/pendentes', [VendaController::class, 'listarAlcadasPendentes']);
    Route::put('/vendas/alcadas/{id}/responder', [VendaController::class, 'responderAlcada']);
    Route::get('/vendas/comissoes/extrato', [VendaController::class, 'extratoComissoes']);
    Route::get('/vendas/comissoes/regras', [VendaController::class, 'listarRegrasComissao']);
    Route::post('/vendas/comissoes/regras', [VendaController::class, 'storeRegraComissao']);
    Route::put('/vendas/comissoes/regras/{id}/toggle', [VendaController::class, 'toggleRegraComissao']);
    Route::post('/vendas/pdv/processar-cartao', [VendaController::class, 'processarCartaoPdv']);

    // Prestação de Serviços & CMMS
    Route::get('/os/bootstrap', [OrdemServicoController::class, 'bootstrapData']);
    Route::get('/os/metricas-cmms', [OrdemServicoController::class, 'metricasCmms']);
    Route::get('/os/planos-preventivos', [AtivoController::class, 'planosPreventivos']);
    Route::post('/os/planos-preventivos', [AtivoController::class, 'storePlanoPreventivo']);
    Route::put('/os/planos-preventivos/{id}', [AtivoController::class, 'updatePlanoPreventivo']);
    Route::put('/os/planos-preventivos/{id}/status', [AtivoController::class, 'alterarStatusPlanoPreventivo']);

    Route::get('/os/prioridades', [AtivoController::class, 'prioridades']);
    Route::post('/os/prioridades', [AtivoController::class, 'storePrioridade']);
    Route::put('/os/prioridades/{id}', [AtivoController::class, 'updatePrioridade']);

    Route::get('/os', [OrdemServicoController::class, 'index']);
    Route::get('/ordens-servico', [OrdemServicoController::class, 'index']);
    Route::post('/os', [OrdemServicoController::class, 'store']);
    Route::post('/ordens-servico', [OrdemServicoController::class, 'store']);

    Route::get('/os/{id}', [OrdemServicoController::class, 'show']);
    Route::get('/ordens-servico/{id}', [OrdemServicoController::class, 'show']);
    Route::post('/os/{id}/fotos', [OrdemServicoController::class, 'uploadFoto']);
    Route::put('/os/{id}/status', [OrdemServicoController::class, 'atualizarStatus']);
    Route::post('/ordens-servico/{id}/fotos', [OrdemServicoController::class, 'uploadFoto']);
    Route::post('/os/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::post('/ordens-servico/{id}/concluir', [OrdemServicoController::class, 'concluir']);
    Route::post('/os/{id}/pecas', [OrdemServicoController::class, 'adicionarPeca']);
    Route::put('/os/{id}/pecas/{itemId}/almoxarifado', [OrdemServicoController::class, 'tratarPecaAlmoxarifado']);
    Route::put('/os/{id}/dados-tecnicos', [OrdemServicoController::class, 'atualizarDadosTecnicos']);

    // Financeiro & Tesouraria
    Route::get('/financeiro/titulos', [FinanceiroController::class, 'titulos']);
    Route::get('/financeiro/contas', [FinanceiroController::class, 'contas']);
    Route::get('/financeiro/contas/{id}/extrato', [FinanceiroController::class, 'extrato']);
    Route::post('/financeiro/titulos/{id}/liquidar', [FinanceiroController::class, 'liquidar']);

    // Exportações Contábeis & SPED
    Route::get('/exportacoes/metricas', [ExportacaoContabilController::class, 'metricas']);
    Route::get('/exportacoes/download', [ExportacaoContabilController::class, 'download']);

    // Motor Fiscal & Certificado A1
    Route::get('/fiscal', [FiscalController::class, 'index']);
    Route::get('/fiscal/documentos', [FiscalController::class, 'index']);
    Route::get('/fiscal/regras', [FiscalController::class, 'regras']);
    Route::post('/fiscal/emitir', [FiscalController::class, 'emitir']);
    Route::get('/fiscal/certificado', [CertificadoFiscalController::class, 'show']);
    Route::post('/fiscal/certificado', [CertificadoFiscalController::class, 'upload']);

    // Indústria & PCP (Planejamento e Controle da Produção)
    Route::get('/pcp/metricas', [PcpController::class, 'metricasKpi']);
    Route::get('/pcp/ordens-producao', [PcpController::class, 'ordensProducao']);
    Route::post('/pcp/ordens-producao', [PcpController::class, 'storeOrdemProducao']);
    Route::put('/pcp/ordens-producao/{id}', [PcpController::class, 'updateOrdemProducao']);
    Route::post('/pcp/ordens-producao/{id}/cancelar', [PcpController::class, 'cancelarOrdemProducao']);
    Route::delete('/pcp/ordens-producao/{id}', [PcpController::class, 'destroyOrdemProducao']);
    Route::post('/pcp/ordens-producao/{id}/apontar', [PcpController::class, 'apontarOrdemProducao']);
    Route::post('/pcp/ordens-producao/{id}/finalizar', [PcpController::class, 'finalizarOrdemProducao']);
    Route::get('/pcp/estruturas', [PcpController::class, 'estruturas']);
    Route::post('/pcp/estruturas', [PcpController::class, 'storeEstrutura']);
    Route::delete('/pcp/estruturas/{id}', [PcpController::class, 'destroyEstruturaItem']);
    Route::get('/pcp/mrp/analise', [PcpController::class, 'analiseMrp']);
    Route::post('/pcp/mrp/gerar-cotacao', [PcpController::class, 'gerarCotacaoMrp']);
    Route::get('/pcp/ordens/{id}/genealogia', [PcpController::class, 'genealogiaLote']);

    // Gestão de MFA / 2FA
    Route::post('/auth/mfa/setup', [AuthController::class, 'mfaSetup']);
    Route::post('/auth/mfa/confirmar', [AuthController::class, 'mfaConfirmar']);
    Route::post('/auth/mfa/desativar', [AuthController::class, 'mfaDesativar']);

    // Self-Service do Usuário (Identidade)
    Route::post('/auth/password/update', [AuthController::class, 'updatePassword']);
    Route::get('/auth/sessoes', [SessaoController::class, 'index']);
    Route::delete('/auth/sessoes/{id}', [SessaoController::class, 'revogar']);

    // Auditoria (Administradores)
    Route::get('/auditoria', [AuditoriaController::class, 'index']);

    // CRM & Funil de Vendas
    Route::get('/crm/board', [CrmController::class, 'board']);
    Route::put('/crm/oportunidades/{id}/mover', [CrmController::class, 'moverCard']);
    Route::post('/crm/oportunidades/{id}/converter-orcamento', [CrmController::class, 'converterParaOrcamento']);
    Route::post('/crm/oportunidades', [CrmController::class, 'storeOportunidade']);
});