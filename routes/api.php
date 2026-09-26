<?php

use App\Http\Controllers\Api\AtivoController;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingWebhookController;
use App\Http\Controllers\Api\CertificadoFiscalController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\CotacaoCompraController;
use App\Http\Controllers\Api\CrmController;
use App\Http\Controllers\Api\CrmInboundController;
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
use App\Http\Controllers\Api\SessaoController;
use App\Http\Controllers\Api\TenantBillingController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VendaController;
use App\Http\Middleware\CheckMaster;
use App\Http\Middleware\CheckSubscriptionStatus;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PontoController;
use App\Http\Controllers\Api\ColaboradorController;
use App\Http\Controllers\Api\EscalaTrabalhoController;
use App\Http\Controllers\Api\HoleriteController;
use App\Http\Controllers\Api\RecrutamentoController;
use App\Http\Controllers\Api\DesempenhoClimaController;
use App\Http\Controllers\Api\FrotaVeiculoController;
use App\Http\Controllers\Api\FrotaOperacaoController;
use App\Http\Controllers\Api\KanbanController;
use App\Http\Controllers\Api\ProjetoController;
use App\Http\Controllers\Api\TimesheetController;
use App\Http\Controllers\Api\ProjetoGestaoController;
use App\Http\Controllers\Api\GedController;
use App\Http\Controllers\Api\PmoConfigController;
use App\Http\Controllers\Api\ControladoriaController;
use App\Http\Controllers\Api\ConciliacaoController;
use App\Http\Controllers\Api\ImportacaoController;
use App\Http\Controllers\Api\IotTelemetryController;

// ==========================================
// Rotas Públicas (Sem login / Sem Sanctum)
// ==========================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Webhooks de Captação de Leads (Landing Pages / RD Station)
Route::post('/crm/webhook/lead/{token}', [CrmInboundController::class, 'receberLead']);
Route::post('/crm/webhook/{token}', [CrmController::class, 'webhookCapturaLead']);

// Webhooks de Gateways (Asaas, etc)
Route::post('/billing/webhook/asaas', [BillingWebhookController::class, 'handleAsaas']);

// Rota de Ingestão de Dados IoT (ESP32 / Arduino / CLP)
Route::post('/iot/telemetry', [IotTelemetryController::class, 'receive']);

// Rotas Públicas do Portal do Cliente (Token Temporário)
Route::prefix('portal')->group(function () {
    Route::get('/os/{token}', [PortalClienteController::class, 'consultarOs']);
    Route::post('/os/{token}/aprovar', [PortalClienteController::class, 'aprovarOrcamento']);
    Route::post('/os/{token}/assinar', [PortalClienteController::class, 'assinarLaudoCliente']);
});

// ==========================================
// Rotas Protegidas por Autenticação (Sanctum + Tenant + Subscription)
// ==========================================
Route::middleware(['auth:sanctum', IdentifyTenant::class, CheckSubscriptionStatus::class])->group(function () {

    // Sessão do Usuário
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/mfa/setup', [AuthController::class, 'mfaSetup']);
        Route::post('/mfa/confirmar', [AuthController::class, 'mfaConfirmar']);
        Route::post('/auth/mfa/desativar', [AuthController::class, 'mfaDesativar']);
        Route::post('/password/update', [AuthController::class, 'updatePassword']);
        Route::get('/sessoes', [SessaoController::class, 'index']);
        Route::delete('/sessoes/{id}', [SessaoController::class, 'revogar']);
    });

    // SaaS Owner (Master Global)
    Route::middleware(CheckMaster::class)->prefix('master')->group(function () {
        Route::get('/metricas', [MasterController::class, 'metricas']);
        Route::get('/tenants', [MasterController::class, 'tenants']);
        Route::post('/tenants', [MasterController::class, 'storeTenant']);
        Route::put('/tenants/{id}/status', [MasterController::class, 'alterarStatusTenant']);
    });

    // Auditoria E2E (Acesso via MasterController)
    Route::prefix('master')->group(function () {
        Route::get('/ultima-auditoria', [MasterController::class, 'ultimaAuditoria']);
        Route::post('/executar-auditoria', [MasterController::class, 'executarAuditoria']);
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

    // Cadastros e Pessoas
    Route::get('/pessoas', [PessoaController::class, 'index']);
    Route::post('/pessoas', [PessoaController::class, 'store']);
    Route::get('/pessoas/{id}', [PessoaController::class, 'show']);
    Route::put('/pessoas/{id}', [PessoaController::class, 'update']);
    Route::delete('/pessoas/{id}', [PessoaController::class, 'destroy']);
    Route::get('/pessoas/consultar-cnpj/{cnpj}', [PessoaController::class, 'consultarCnpj']);

    // Importador de Dados (Onboarding)
    Route::prefix('importacao')->group(function () {
    Route::post('/pessoas', [ImportacaoController::class, 'importarPessoas']);
    });

    // Catálogo de Itens & Produtos
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
    Route::get('/os/{id}/pdf', [OrdemServicoController::class, 'gerarPdf']);
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
    Route::prefix('financeiro')->group(function () {
        Route::get('/titulos', [FinanceiroController::class, 'titulos']);
        Route::post('/titulos/{id}/liquidar', [FinanceiroController::class, 'liquidar']);

        Route::get('/contas', [FinanceiroController::class, 'contas']);
        Route::post('/contas', [FinanceiroController::class, 'storeConta']);
        Route::get('/contas/{id}/extrato', [FinanceiroController::class, 'extrato']);
    });

    // Controladoria (DRE, Planos de Contas e Centros de Custo)
        Route::prefix('controladoria')->group(function () {
            Route::get('/planos-contas', [ControladoriaController::class, 'indexPlanosContas']);
            Route::post('/planos-contas', [ControladoriaController::class, 'storePlanoConta']);

            Route::get('/centros-custos', [ControladoriaController::class, 'indexCentrosCustos']);
            Route::post('/centros-custos', [ControladoriaController::class, 'storeCentroCusto']);

            Route::post('/gerar-padrao', [ControladoriaController::class, 'gerarEstruturaPadrao']);
        });
        // Conciliação Bancária
        Route::prefix('conciliacao')->group(function () {
            Route::post('/ofx', [ConciliacaoController::class, 'processarOfx']);
            Route::post('/ofx/manual', [ConciliacaoController::class, 'conciliarManual']);
        });

    // Exportações Contábeis & SPED
    Route::get('/exportacoes/metricas', [ExportacaoContabilController::class, 'metricas']);
    Route::get('/exportacoes/download', [ExportacaoContabilController::class, 'download']);

    // ==========================================
    // Motor Fiscal & Certificado A1
    // ==========================================
    Route::prefix('fiscal')->group(function () {
        Route::get('/', [FiscalController::class, 'index']);
        Route::get('/documentos', [FiscalController::class, 'index']);
        Route::get('/regras', [FiscalController::class, 'regras']);
        Route::post('/emitir', [FiscalController::class, 'emitir']);

        // Novas rotas de eventos fiscais
        Route::post('/{id}/cancelar', [FiscalController::class, 'cancelar']);
        Route::post('/{id}/carta-correcao', [FiscalController::class, 'cartaCorrecao']);

        Route::get('/certificado', [CertificadoFiscalController::class, 'show']);
        Route::post('/certificado/upload', [CertificadoFiscalController::class, 'upload']);
    });

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
    Route::get('/pcp/ordens-producao/{id}/genealogia', [PcpController::class, 'genealogiaLote']);

    // Auditoria (Administradores)
    Route::get('/auditoria', [AuditoriaController::class, 'index']);

    // ==========================================
    // CRM & FUNIL DE VENDAS
    // ==========================================
    Route::get('/crm/pipelines', [CrmController::class, 'listarPipelines']);
    Route::post('/crm/pipelines', [CrmController::class, 'storePipeline']);
    Route::put('/crm/pipelines/{id}', [CrmController::class, 'atualizarPipeline']);
    Route::put('/crm/pipelines/{pipelineId}/reordenar-etapas', [CrmController::class, 'reordenarEtapas']);

    Route::post('/crm/pipelines/{pipelineId}/etapas', [CrmController::class, 'storeEtapa']);
    Route::put('/crm/etapas/{id}', [CrmController::class, 'updateEtapa']);
    Route::delete('/crm/etapas/{id}', [CrmController::class, 'destroyEtapa']);

    Route::get('/crm/board', [CrmController::class, 'board']);
    Route::post('/crm/oportunidades', [CrmController::class, 'storeOportunidade']);
    Route::put('/crm/oportunidades/{id}/mover', [CrmController::class, 'moverCard']);
    Route::patch('/crm/oportunidades/{id}/mover', [CrmController::class, 'moverCard']);
    Route::post('/crm/oportunidades/{id}/marcar-perdido', [CrmController::class, 'marcarPerdido']);
    Route::post('/crm/oportunidades/{id}/converter-orcamento', [CrmController::class, 'converterParaOrcamento']);

    Route::post('/crm/oportunidades/{id}/itens', [CrmController::class, 'adicionarItemOportunidade']);
    Route::delete('/crm/oportunidades/{id}/itens/{itemId}', [CrmController::class, 'removerItemOportunidade']);

    Route::post('/crm/oportunidades/{id}/atividades', [CrmController::class, 'adicionarAtividade']);
    Route::patch('/crm/oportunidades/{id}/atividades/{atividadeId}/toggle', [CrmController::class, 'toggleAtividade']);

    Route::post('/crm/motivos-perda', [CrmController::class, 'storeMotivoPerda']);
    Route::put('/crm/motivos-perda/{id}', [CrmController::class, 'updateMotivoPerda']);
    Route::delete('/crm/motivos-perda/{id}', [CrmController::class, 'destroyMotivoPerda']);

    Route::get('/crm/metricas', [CrmController::class, 'metricasAnaliticas']);

    // --- GESTÃO DE ASSINATURA (PORTAL DO INQUILINO) ---
    Route::get('/billing/minha-assinatura', [TenantBillingController::class, 'minhaAssinatura']);
    Route::get('/billing/historico-faturas', [TenantBillingController::class, 'historicoFaturas']);

    // Recursos Humanos & Ponto Eletrônico
    Route::post('/rh/ponto/registrar', [PontoController::class, 'registrar']);
    Route::get('/rh/ponto/hoje', [PontoController::class, 'historicoHoje']);

    Route::get('/rh/colaboradores', [ColaboradorController::class, 'index']);
    Route::post('/rh/colaboradores', [ColaboradorController::class, 'store']);
    Route::put('/rh/colaboradores/{id}', [ColaboradorController::class, 'update']);
    Route::get('/rh/colaboradores/{id}/espelho', [ColaboradorController::class, 'espelhoPonto']);

    Route::get('/rh/departamentos', [ColaboradorController::class, 'departamentos']);
    Route::post('/rh/departamentos', [ColaboradorController::class, 'storeDepartamento']);
    Route::delete('/rh/departamentos/{id}', [ColaboradorController::class, 'destroyDepartamento']);

    Route::get('/rh/escalas', [EscalaTrabalhoController::class, 'index']);
    Route::post('/rh/escalas', [EscalaTrabalhoController::class, 'store']);
    Route::delete('/rh/escalas/{id}', [EscalaTrabalhoController::class, 'destroy']);

    Route::get('/rh/holerites/meus', [HoleriteController::class, 'meusHolerites']);
    Route::get('/rh/holerites/meus/{id}/pdf', [HoleriteController::class, 'baixarMeuPdf'])->whereUuid('id');
    Route::get('/rh/holerites', [HoleriteController::class, 'index']);
    Route::post('/rh/holerites', [HoleriteController::class, 'store']);
    Route::get('/rh/holerites/{id}', [HoleriteController::class, 'show'])->whereUuid('id');

    Route::get('/rh/vagas', [RecrutamentoController::class, 'indexVagas']);
    Route::post('/rh/vagas', [RecrutamentoController::class, 'storeVaga']);
    Route::get('/rh/vagas/{vagaId}/kanban', [RecrutamentoController::class, 'boardKanban']);
    Route::post('/rh/candidatos', [RecrutamentoController::class, 'storeCandidato']);
    Route::put('/rh/candidatos/{id}/mover', [RecrutamentoController::class, 'moverCandidato']);

    Route::get('/rh/etapas', [RecrutamentoController::class, 'indexEtapas']);
    Route::post('/rh/etapas', [RecrutamentoController::class, 'storeEtapa']);
    Route::delete('/rh/etapas/{id}', [RecrutamentoController::class, 'destroyEtapa']);

    Route::post('/rh/enps/campanhas', [DesempenhoClimaController::class, 'storeCampanha']);
    Route::post('/rh/enps/campanhas/{campanhaId}/responder', [DesempenhoClimaController::class, 'responderEnps']);
    Route::get('/rh/enps/campanhas/{campanhaId}/resultados', [DesempenhoClimaController::class, 'resultadosEnps']);

    Route::post('/rh/ninebox/eixos', [DesempenhoClimaController::class, 'storeEixo']);
    Route::get('/rh/enps/campanhas', [DesempenhoClimaController::class, 'indexCampanhas']);
    Route::get('/rh/ninebox/eixos', [DesempenhoClimaController::class, 'indexEixos']);

    // MÓDULO DE FROTAS & TELEMETRIA
    Route::prefix('frota')->group(function () {
        Route::get('/dominios', [FrotaVeiculoController::class, 'dominios']);
        Route::get('/veiculos', [FrotaVeiculoController::class, 'index']);
        Route::post('/veiculos', [FrotaVeiculoController::class, 'store']);
        Route::get('/veiculos/{id}', [FrotaVeiculoController::class, 'show']);
        Route::put('/veiculos/{id}', [FrotaVeiculoController::class, 'update']);
        Route::delete('/veiculos/{id}', [FrotaVeiculoController::class, 'destroy']);
        Route::post('/abastecimentos', [FrotaOperacaoController::class, 'storeAbastecimento']);
    });
    // Dentro do seu grupo de auth Sanctum + IdentifyTenant, adicione:
    Route::prefix('pmo/configuracoes')->group(function () {
        Route::get('/{dominio}', [PmoConfigController::class, 'index']);
        Route::post('/{dominio}', [PmoConfigController::class, 'store']);
        Route::put('/{dominio}/{id}', [PmoConfigController::class, 'update']);
        Route::delete('/{dominio}/{id}', [PmoConfigController::class, 'destroy']);
    });

    // ==========================================
    // Módulo de Projetos (Kanban & Timesheet)
    // ==========================================
    Route::prefix('projetos')->middleware('check.projeto.status')->group(function () {
        Route::get('/', [ProjetoController::class, 'index']);
        Route::post('/', [ProjetoController::class, 'store']);
        Route::put('/{id}', [ProjetoController::class, 'update']);
        Route::put('/{projetoId}/orcamento', [ProjetoController::class, 'atualizarOrcamento']);

        // --- Novas Rotas Nativas do Enterprise PMO ---
        Route::get('/{projetoId}/gantt', [ProjetoController::class, 'gantt']);
        Route::get('/{projetoId}/capacidade', [ProjetoController::class, 'capacidade']);
        // ---------------------------------------------

        Route::get('/{projetoId}/board', [KanbanController::class, 'board']);
        Route::patch('/tarefas/{tarefaId}/mover', [KanbanController::class, 'moverTarefa']);
        Route::post('/etapas/{etapaId}/tarefas', [KanbanController::class, 'adicionarTarefa']);

        Route::post('/tarefas/{tarefaId}/play', [TimesheetController::class, 'play']);
        Route::put('/tarefas/{tarefaId}/stop', [TimesheetController::class, 'stop']);

        Route::get('/{projetoId}/equipe', [ProjetoGestaoController::class, 'listarEquipe']);
        Route::post('/{projetoId}/equipe', [ProjetoGestaoController::class, 'adicionarEquipe']);

        Route::get('/{projetoId}/custos', [ProjetoGestaoController::class, 'listarCustos']);
        Route::post('/{projetoId}/custos', [ProjetoGestaoController::class, 'adicionarCusto']);

        Route::get('/{projetoId}/entregaveis', [ProjetoGestaoController::class, 'listarEntregaveis']);
        Route::post('/{projetoId}/entregaveis', [ProjetoGestaoController::class, 'adicionarEntregavel']);

        Route::post('/tarefas/{tarefaId}/checklists', [KanbanController::class, 'adicionarChecklist']);
        Route::patch('/tarefas/checklists/{checklistId}/toggle', [KanbanController::class, 'toggleChecklist']);

        Route::post('/tarefas/{tarefaId}/dependencias', [KanbanController::class, 'adicionarDependencia']);
        Route::delete('/tarefas/{tarefaId}/dependencias/{dependeDeId}', [KanbanController::class, 'removerDependencia']);

        // Rotas corretivas (Status, Taxonomia e Prioridades)
        Route::patch('/{id}/status', [ProjetoController::class, 'alterarStatus'])->withoutMiddleware('check.projeto.status');
        Route::patch('/tarefas/{tarefaId}/prioridade', [KanbanController::class, 'alterarPrioridade']);
        Route::put('/etapas/{etapaId}', [KanbanController::class, 'renomearEtapa']);

        // Parâmetros de Domínio PMO
        Route::get('/parametros/status', [ProjetoController::class, 'listarStatus']);
        Route::get('/parametros/prioridades', [KanbanController::class, 'listarPrioridades']);
         Route::put('/etapas/{etapaId}', [KanbanController::class, 'renomearEtapa']);
        // Novas rotas de Taxonomia de Fluxos (Etapas)
        Route::post('/{projetoId}/etapas', [KanbanController::class, 'criarEtapa']);
        Route::delete('/etapas/{etapaId}', [KanbanController::class, 'excluirEtapa']);

        // Financeiro do PMO: Custos e Entregáveis
        Route::get('/{projetoId}/custos', [ProjetoController::class, 'custos']);
        Route::post('/{projetoId}/custos', [ProjetoController::class, 'storeCusto']);

        Route::get('/{projetoId}/entregaveis', [ProjetoController::class, 'entregaveis']);
        Route::post('/{projetoId}/entregaveis', [ProjetoController::class, 'storeEntregavel']);
        Route::post('/entregaveis/{entregavelId}/faturar', [ProjetoController::class, 'faturarEntregavel']);
    });

    // ==========================================
    // MÓDULO GED (Cofre Digital)
    // ==========================================
    Route::prefix('ged')->group(function () {
        Route::get('/listar', [GedController::class, 'listar']);
        Route::post('/pastas', [GedController::class, 'criarPasta']);
        Route::post('/upload', [GedController::class, 'upload']);

        Route::post('/upload/tarefa/{tarefaId}', function(\Illuminate\Http\Request $request, $tarefaId) {
            $request->merge([
                'entidade_type' => 'App\Models\Tarefa',
                'entidade_id' => $tarefaId
            ]);
            return app(GedController::class)->upload($request);
        });
    });
});
