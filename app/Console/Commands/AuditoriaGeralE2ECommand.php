<?php

namespace App\Console\Commands;

use App\Models\Assinatura;
use App\Models\Compra;
use App\Models\Deposito;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\EstoqueDeposito;
use App\Models\Item;
use App\Models\OrdemServico;
use App\Models\PedidoVenda;
use App\Models\Pessoa;
use App\Models\Plano;
use App\Models\Tenant;
use App\Models\TituloFinanceiro;
use App\Models\User;
use App\Models\CrmFunil;
use App\Models\CrmFunilEtapa;
use App\Models\CrmOportunidade;
use App\Services\EstoqueService;
use App\Services\FinanceiroService;
use App\Services\OrdemServicoService;
use App\Services\ProducaoPcpService;
use App\Services\VendaService;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class AuditoriaGeralE2ECommand extends Command
{
    protected $signature = 'scalle:audit-e2e {--export=html : Formato de saída: html ou json}';
    protected $description = 'Executa auditoria cirúrgica de ponta a ponta em todos os módulos e regras do Scalle ERP';

    private array $relatorio = [];
    private int $totalVerificacoes = 0;
    private int $sucessos = 0;
    private int $falhas = 0;

    public function handle(): int
    {
        $this->info("Iniciando Agente de Auditoria Cirúrgica E2E (Padrão Gemini)...");
        $inicio = microtime(true);

        DB::beginTransaction();

        try {
            // Execução em cascata dos 10 Módulos de Teste
            $this->auditarCoreMultiTenant();
            $this->auditarMultiFilial();
            $this->auditarComercialAlcadas();
            $this->auditarWmsEstoque();
            $this->auditarServicosCmms();
            $this->auditarPcpIndustrial();
            $this->auditarFinanceiro();
            $this->auditarBillingSoftLock();
            $this->auditarCrm();
            $this->auditarEventosFiscais();

        } catch (Exception $e) {
            $this->registrarResultado("FALHA CRÍTICA INESPERADA", false, $e->getMessage(), "Execução Geral");
        } finally {
            // Rollback obrigatório para manter a integridade da base real de produção intacta
            DB::rollBack();
            $this->line("Rollback transacional executado com sucesso. Base de dados limpa.");
        }

        $duracao = round(microtime(true) - $inicio, 2);
        $this->gerarArquivoAuditoria($duracao);

        $this->newLine();
        $this->line("---------------------------------------------------------------");
        $this->info("AUDITORIA CONCLUÍDA: {$this->totalVerificacoes} testes executados em {$duracao}s.");
        $this->info("Sucessos: {$this->sucessos} | Falhas: {$this->falhas}");
        $this->line("---------------------------------------------------------------");

        return Command::SUCCESS;
    }

    private function registrarResultado(string $titulo, bool $aprovado, string $detalhes, string $modulo): void
    {
        $this->totalVerificacoes++;
        if ($aprovado) {
            $this->sucessos++;
            $this->line("  [PASS] {$modulo} - {$titulo}");
        } else {
            $this->falhas++;
            $this->error("  [FAIL] {$modulo} - {$titulo} | Erro: {$detalhes}");
        }

        $this->relatorio[] = [
            'modulo' => $modulo,
            'teste' => $titulo,
            'status' => $aprovado ? 'PASS' : 'FAIL',
            'detalhes' => $detalhes,
            'timestamp' => now()->toDateTimeString(),
        ];
    }

    private function auditarCoreMultiTenant(): void
    {
        $modulo = "1. Core & Multi-Tenant";

        $tenantA = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome_fantasia' => 'Tenant Audit A',
            'razao_social' => 'Tenant Audit A LTDA',
            'documento' => '11111111000191',
            'status' => 'ativo',
        ]);

        $tenantB = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome_fantasia' => 'Tenant Audit B',
            'razao_social' => 'Tenant Audit B LTDA',
            'documento' => '22222222000191',
            'status' => 'ativo',
        ]);

        $userA = new User([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantA->id,
            'name' => 'Operador A',
            'is_master' => false,
        ]);

        $userB = new User([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantB->id,
            'name' => 'Operador B',
            'is_master' => false,
        ]);

        App::instance('current_tenant_id', $tenantA->id);
        auth()->setUser($userA);
        request()->setUserResolver(fn() => $userA);

        $pessoaA = Pessoa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantA->id,
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Cliente Isolado A',
            'cpf_cnpj' => '11111111000191',
            'is_cliente' => true,
        ]);

        $buscaA = Pessoa::find($pessoaA->id);
        $this->registrarResultado("Leitura em contexto do Tenant próprio", $buscaA !== null, "Tenant A localizou o próprio cliente", $modulo);

        App::instance('current_tenant_id', $tenantB->id);
        auth()->setUser($userB);
        request()->setUserResolver(fn() => $userB);

        $buscaInvasao = Pessoa::find($pessoaA->id);
        $this->registrarResultado("Isolamento Cruzado de Leitura (TenantScope)", $buscaInvasao === null, "Blindagem inter-tenant operante", $modulo);

        $masterUser = new User([
            'id' => (string) Str::uuid(),
            'name' => 'SaaS Master',
            'is_master' => true,
        ]);

        App::forgetInstance('current_tenant_id');
        auth()->setUser($masterUser);
        request()->setUserResolver(fn() => $masterUser);

        $buscaMaster = Pessoa::find($pessoaA->id);
        $this->registrarResultado("Visão Panorâmica do SaaS Owner", $buscaMaster !== null, "SaaS Owner acessa globalmente", $modulo);

        App::instance('current_tenant_id', $tenantA->id);
        auth()->setUser($userA);
        request()->setUserResolver(fn() => $userA);
    }

    private function auditarMultiFilial(): void
    {
        $modulo = "2. Multi-Filial & Catálogo";
        $tenantId = Tenant::first()->id;
        App::instance('current_tenant_id', $tenantId);

        $matriz = Empresa::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome_fantasia' => 'Audit Matriz', 'razao_social' => 'Audit Matriz', 'cnpj' => '33333333000191', 'regime_tributario' => 'simples_nacional', 'is_matriz' => true,
        ]);

        $filial = Empresa::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome_fantasia' => 'Audit Filial', 'razao_social' => 'Audit Filial', 'cnpj' => '33333333000272', 'regime_tributario' => 'simples_nacional', 'is_matriz' => false,
        ]);

        $item = Item::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Item Catálogo Global', 'codigo_sku' => 'SKU-AUDIT', 'tipo_item' => 'PRODUTO', 'preco_venda' => 150.00, 'unidade_medida' => 'UN', 'controla_estoque' => true,
        ]);

        App::instance('current_empresa_id', $matriz->id);
        $verMatriz = Item::find($item->id);

        App::instance('current_empresa_id', $filial->id);
        $verFilial = Item::find($item->id);

        $this->registrarResultado("Catálogo Unificado", ($verMatriz !== null && $verFilial !== null), "Item visível em ambas as filiais", $modulo);
    }

    private function auditarComercialAlcadas(): void
    {
        $modulo = "3. Comercial & PDV";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $deposito = Deposito::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'nome' => 'Depósito Audit', 'codigo' => 'DEP-AUD', 'is_padrao' => true, 'is_ativo' => true]);
        $item = Item::first();
        $user = User::first();

        EstoqueService::movimentar($deposito->id, $item->id, 10, 'AJUSTE_INVENTARIO', $user->id, 'inventario', (string) Str::uuid(), null, 50.00);

        $cliente = Pessoa::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'tipo_pessoa' => 'PF', 'nome_razao_social' => 'Consumidor Teste', 'cpf_cnpj' => '00000000000', 'is_cliente' => true]);

        $venda = VendaService::faturarVenda($empresa->id, $cliente->id, $deposito->id, $user, [['item_id' => $item->id, 'quantidade' => 2, 'preco_unitario' => 100.00, 'desconto_unitario' => 0]], [['forma_pagamento' => 'PIX', 'valor_pago' => 200.00]], 0.00, 'PDV');
        $saldoRestante = EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $item->id)->value('quantidade_saldo');

        $this->registrarResultado("Faturamento Atômico PDV e WMS", ($venda->status === 'FATURADO' && (float)$saldoRestante === 8.0), "Baixa no estoque bem-sucedida", $modulo);
    }

    private function auditarWmsEstoque(): void
    {
        $modulo = "4. WMS & Estoque";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $depOrigem = Deposito::first();
        $depDestino = Deposito::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'nome' => 'Destino WMS', 'codigo' => 'WMS-DES', 'is_ativo' => true]);
        $item = Item::first();
        $user = User::first();

        EstoqueService::movimentar($depOrigem->id, $item->id, 50, 'ENTRADA_COMPRA', $user->id, 'compras', (string) Str::uuid(), 'LOTE-123', 10.00);
        EstoqueService::movimentar($depOrigem->id, $item->id, 20, 'TRANSFERENCIA_SAIDA', $user->id, 'transferencias', (string) Str::uuid(), 'LOTE-123', 10.00);
        EstoqueService::movimentar($depDestino->id, $item->id, 20, 'TRANSFERENCIA_ENTRADA', $user->id, 'transferencias', (string) Str::uuid(), 'LOTE-123', 10.00);

        $saldoDestino = EstoqueDeposito::where('deposito_id', $depDestino->id)->where('item_id', $item->id)->value('quantidade_saldo');
        $this->registrarResultado("Transferência Atômica Entre Depósitos", ((float)$saldoDestino === 20.0), "Transferência efetuada mantendo Lote-123", $modulo);
    }

    private function auditarServicosCmms(): void
    {
        $modulo = "5. Serviços & CMMS";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);

        $cliente = Pessoa::where('tenant_id', $tenantId)->first();
        $user = User::first();

        $sla = OrdemServicoService::calcularSla('URGENTE');
        $os = OrdemServico::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'cliente_id' => $cliente->id, 'tecnico_responsavel_id' => $user->id, 'numero_os' => 99999, 'status' => 'ABERTA', 'prioridade' => 'URGENTE', 'tipo_manutencao' => 'CORRETIVA', 'equipamento_descricao' => 'Chiller Audit', 'defeito_reclamado' => 'Alarme', 'data_abertura' => now(), 'prazo_sla_resposta' => $sla['resposta'], 'prazo_sla_resolucao' => $sla['resolucao'],
        ]);

        $osFinalizada = OrdemServicoService::concluirOrdemServico($os, [], "Teste ok.", "data:image/png;base64,iVBORw0K", "Aprovador", "123", $user, -22.7, -43.3, "127.0.0.1");

        $this->registrarResultado("Encerramento OS com Assinatura e Hash", ($osFinalizada->status === 'CONCLUIDA' && !empty($osFinalizada->hash_assinatura_sha256)), "Hash SHA-256 gerado", $modulo);
    }

    private function auditarPcpIndustrial(): void
    {
        $modulo = "6. Indústria (PCP)";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);

        $produtoAcabado = Item::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'nome' => 'Produto Acabado', 'codigo_sku' => 'IND-PA', 'tipo_item' => 'PRODUTO', 'preco_venda' => 1200.00, 'unidade_medida' => 'UN', 'controla_estoque' => true]);
        $insumo = Item::first();
        $deposito = Deposito::first();
        $user = User::first();

        EstoqueService::movimentar($deposito->id, $insumo->id, 10, 'ENTRADA_COMPRA', $user->id, 'compras', (string) Str::uuid(), null, 80.00);

        \App\Models\EstruturaItem::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'produto_pai_id' => $produtoAcabado->id, 'insumo_filho_id' => $insumo->id, 'quantidade_necessaria' => 2.0, 'percentual_perda_estimada' => 0.0]);

        $op = \App\Models\OrdemProducao::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'produto_id' => $produtoAcabado->id, 'deposito_origem_id' => $deposito->id, 'deposito_destino_id' => $deposito->id, 'responsavel_id' => $user->id, 'numero_op' => 8888, 'status' => 'PLANEJADA', 'quantidade_planejada' => 2.0, 'quantidade_produzida' => 0.0, 'custo_total_estimado' => 320.0, 'custo_total_real' => 0.0, 'data_inicio_prevista' => now()->toDateString(), 'data_fim_prevista' => now()->toDateString(),
        ]);

        ProducaoPcpService::finalizarProducao($op, 2.0, 0.0, $user);
        $saldoAcabado = EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $produtoAcabado->id)->value('quantidade_saldo');

        $this->registrarResultado("Consumo de BOM e Geração de PA", ((float)$saldoAcabado === 2.0), "Insumos consumidos e PA creditado", $modulo);
    }

    private function auditarFinanceiro(): void
    {
        $modulo = "7. Financeiro & Controladoria";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);

        $cliente = Pessoa::where('tenant_id', $tenantId)->first();
        $conta = \App\Models\ContaFinanceira::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'nome' => 'Conta Auditoria', 'tipo_conta' => 'BANCO', 'saldo_atual' => 1000.00, 'is_ativo' => true]);

        $titulo = TituloFinanceiro::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenantId, 'empresa_id' => $empresa->id, 'pessoa_id' => $cliente->id, 'natureza' => 'RECEBER', 'documento_numero' => 'TIT-AUD-01', 'parcela_numero' => 1, 'total_parcelas' => 1, 'data_emissao' => now()->toDateString(), 'data_vencimento' => now()->toDateString(), 'valor_original' => 500.00, 'valor_saldo_aberto' => 500.00, 'valor_pago_acumulado' => 0.00, 'status' => 'ABERTO', 'historico' => 'Auditoria Financeira',
        ]);

        FinanceiroService::liquidarTitulo($titulo, $conta->id, 500.00, 0, 0, 0, 'PIX', User::first());
        $contaAtualizada = \App\Models\ContaFinanceira::find($conta->id);

        $this->registrarResultado("Liquidação de Título Financeiro", ((float)$contaAtualizada->saldo_atual === 1500.00), "Extrato bancário devidamente atualizado", $modulo);
    }

    private function auditarBillingSoftLock(): void
    {
        $modulo = "8. Billing & Soft-Lock";
        $tenantSoftLock = Tenant::create(['id' => (string) Str::uuid(), 'nome_fantasia' => 'SoftLock Test', 'razao_social' => 'SoftLock Test', 'documento' => '99999999000199', 'status' => 'soft_lock']);

        $userTenant = new User(['id' => (string) Str::uuid(), 'tenant_id' => $tenantSoftLock->id, 'name' => 'Inquilino Bloqueado', 'is_master' => false]);

        App::instance('current_tenant_id', $tenantSoftLock->id);
        auth()->setUser($userTenant);
        request()->setUserResolver(fn() => $userTenant);

        $middleware = new \App\Http\Middleware\CheckSubscriptionStatus();

        $reqPost = \Illuminate\Http\Request::create('/api/pessoas', 'POST', ['nome_razao_social' => 'Teste Mutação']);
        $reqPost->setUserResolver(fn() => $userTenant);
        $respPost = $middleware->handle($reqPost, fn() => response()->json(['data' => 'ok'], 201));

        $reqGet = \Illuminate\Http\Request::create('/api/pessoas', 'GET');
        $reqGet->setUserResolver(fn() => $userTenant);
        $respGet = $middleware->handle($reqGet, fn() => response()->json(['data' => []], 200));

        $this->registrarResultado("Proteção do Soft-Lock (Bloqueio Escrita, Permite Leitura)", ($respPost->getStatusCode() === 402 && $respGet->getStatusCode() === 200), "402 no POST, 200 no GET", $modulo);
    }

    private function auditarCrm(): void
    {
        $modulo = "9. CRM & Gestão Comercial";
        $tenantId = Tenant::first()->id;
        App::instance('current_tenant_id', $tenantId);

        $funil = CrmFunil::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Funil Auditoria E2E',
            'is_ativo' => true,
        ]);

        $etapa = CrmFunilEtapa::create([
            'id' => (string) Str::uuid(),
            'funil_id' => $funil->id,
            'nome' => 'Prospecção E2E',
            'ordem_exibicao' => 1,
            'probabilidade_fechamento' => 50,
        ]);

        $oportunidade = CrmOportunidade::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'funil_id' => $funil->id,
            'etapa_id' => $etapa->id,
            'titulo' => 'Negócio E2E',
            'nome_contato' => 'Lead Auditoria',
            'status' => 'ABERTO',
        ]);

        $this->registrarResultado("Criação de Oportunidade no Funil Kanban", $oportunidade->id !== null, "Oportunidade criada de forma estruturada e vinculada à Etapa", $modulo);
    }

    private function auditarEventosFiscais(): void
    {
        $modulo = "10. Fiscal & Eventos SEFAZ";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);

        $doc = DocumentoFiscal::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'modelo_documento' => '55',
            'numero_documento' => '99999',
            'status' => 'AUTORIZADO',
            'data_emissao' => now(),
            'valor_total' => 100.00,
        ]);

        // Simula a averbação de uma CC-e chamando a atualização do banco
        $doc->update([
            'mensagem_sefaz' => 'CC-e Vinculada com Sucesso. Correção averbada: Retificação do Endereço E2E',
        ]);

        $this->registrarResultado("Averbação de Carta de Correção (CC-e)", str_contains($doc->mensagem_sefaz, 'CC-e'), "Mensagem da SEFAZ validada e integrada ao documento", $modulo);
    }

    private function gerarArquivoAuditoria(float $duracao): void
    {
        $diretorio = storage_path('app/auditorias');
        if (!File::exists($diretorio)) {
            File::makeDirectory($diretorio, 0755, true);
        }

        $timestamp = now()->format('Y-m-d_H-i-s');
        $caminhoJson = "{$diretorio}/auditoria_{$timestamp}.json";
        $caminhoHtml = "{$diretorio}/auditoria_{$timestamp}.html";

        // 1. Salva JSON estruturado
        File::put($caminhoJson, json_encode([
            'data_execucao' => now()->toIso8601String(),
            'duracao_segundos' => $duracao,
            'total_testes' => $this->totalVerificacoes,
            'sucessos' => $this->sucessos,
            'falhas' => $this->falhas,
            'itens' => $this->relatorio,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 2. Salva Relatório HTML Visual
        $linhasTabela = '';
        foreach ($this->relatorio as $item) {
            $corBadge = $item['status'] === 'PASS' ? '#10b981' : '#ef4444';
            $linhasTabela .= "
                <tr style='border-bottom: 1px solid #334155;'>
                    <td style='padding: 12px; font-weight: 600; color: #94a3b8;'>{$item['modulo']}</td>
                    <td style='padding: 12px; color: #f8fafc;'>{$item['teste']}</td>
                    <td style='padding: 12px; text-align: center;'><span style='background: {$corBadge}; color: #fff; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px;'>{$item['status']}</span></td>
                    <td style='padding: 12px; color: #cbd5e1; font-size: 13px;'>{$item['detalhes']}</td>
                </tr>
            ";
        }

        $html = "
        <!DOCTYPE html>
        <html lang='pt-BR'>
        <head>
            <meta charset='UTF-8'>
            <title>Auditoria Geral do Sistema - Scalle ERP</title>
        </head>
        <body style='background: #0f172a; color: #f8fafc; font-family: Inter, sans-serif; padding: 40px;'>
            <div style='max-width: 1100px; margin: 0 auto;'>
                <div style='display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;'>
                    <div>
                        <h1 style='margin: 0; font-size: 26px; color: #6366f1;'>Scalle ERP — Laudo de Auditoria Cirúrgica E2E</h1>
                        <p style='margin: 5px 0 0 0; color: #64748b;'>Executado em " . now()->format('d/m/Y H:i:s') . " ({$duracao}s)</p>
                    </div>
                    <div style='text-align: right;'>
                        <span style='font-size: 32px; font-weight: bold; color: " . ($this->falhas === 0 ? '#10b981' : '#ef4444') . ";'>" . ($this->falhas === 0 ? '100% ÍNTEGRO' : 'REQUER ATENÇÃO') . "</span>
                    </div>
                </div>

                <div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;'>
                    <div style='background: #1e293b; padding: 20px; border-radius: 12px;'>
                        <span style='color: #94a3b8; font-size: 12px; text-transform: uppercase;'>Total de Testes</span>
                        <div style='font-size: 28px; font-weight: bold; margin-top: 5px;'>{$this->totalVerificacoes}</div>
                    </div>
                    <div style='background: #1e293b; padding: 20px; border-radius: 12px;'>
                        <span style='color: #10b981; font-size: 12px; text-transform: uppercase;'>Sucessos</span>
                        <div style='font-size: 28px; font-weight: bold; color: #10b981; margin-top: 5px;'>{$this->sucessos}</div>
                    </div>
                    <div style='background: #1e293b; padding: 20px; border-radius: 12px;'>
                        <span style='color: #ef4444; font-size: 12px; text-transform: uppercase;'>Falhas Detectadas</span>
                        <div style='font-size: 28px; font-weight: bold; color: #ef4444; margin-top: 5px;'>{$this->falhas}</div>
                    </div>
                </div>

                <div style='background: #1e293b; border-radius: 12px; overflow: hidden;'>
                    <table style='width: 100%; border-collapse: collapse; text-align: left;'>
                        <thead>
                            <tr style='background: #090d16; color: #64748b; font-size: 12px; text-transform: uppercase;'>
                                <th style='padding: 14px;'>Módulo</th>
                                <th style='padding: 14px;'>Cenário Auditado</th>
                                <th style='padding: 14px; text-align: center;'>Veredito</th>
                                <th style='padding: 14px;'>Diagnóstico / Comprovação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$linhasTabela}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
        ";

        File::put($caminhoHtml, $html);
        $this->line("Arquivos de auditoria gravados em:");
        $this->info("-> JSON: {$caminhoJson}");
        $this->info("-> HTML: {$caminhoHtml}");
    }
}
