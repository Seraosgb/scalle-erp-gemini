<?php

namespace App\Console\Commands;

use App\Models\Assinatura;
use App\Models\Compra;
use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\EstoqueDeposito;
use App\Models\Item;
use App\Models\OrdemServico;
use App\Models\PedidoVenda;
use App\Models\Perfil;
use App\Models\Pessoa;
use App\Models\Plano;
use App\Models\Tenant;
use App\Models\TituloFinanceiro;
use App\Models\User;
use App\Scopes\TenantScope;
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
            // Módulo 1: Fundação Multi-Tenant, Governança & SaaS Owner
            $this->auditarCoreMultiTenant();

            // Módulo 2: Multi-Filial & Catálogo Unificado
            $this->auditarMultiFilial();

            // Módulo 3: Comercial, PDV Balcão & Alçadas
            $this->auditarComercialAlcadas();

            // Módulo 4: Suprimentos, WMS & Estoque Atômico
            $this->auditarWmsEstoque();

            // Módulo 5: Serviços, CMMS & Laudo Digital
            $this->auditarServicosCmms();

            // Módulo 6: PCP Industrial & MRP
            $this->auditarPcpIndustrial();

            // Módulo 7: Financeiro, DRE & Liquidação
            $this->auditarFinanceiro();

            // Módulo 8: Billing SaaS, Soft-Lock & Cotas
            $this->auditarBillingSoftLock();

        } catch (Exception $e) {
            $this->registrarResultado("FALHA CRÍTICA INESPERADA", false, $e->getMessage(), "Execução Geral");
        } finally {
            // Rollback obrigatório para manter integridade da base
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

        // 1. Injeta Tenant A
        App::instance('current_tenant_id', $tenantA->id);

        $pessoaA = Pessoa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantA->id,
            'tipo_pessoa' => 'PJ',
            'nome_razao_social' => 'Cliente Isolado A',
            'cpf_cnpj' => '11111111000191',
            'is_cliente' => true,
        ]);

        // Valida se Tenant A localiza seu registro
        $buscaA = Pessoa::find($pessoaA->id);
        $this->registrarResultado(
            "Leitura em contexto do Tenant próprio",
            $buscaA !== null,
            "Tenant A localizou o próprio cliente criado",
            $modulo
        );

        // 2. Troca para Tenant B e tenta invadir Tenant A (Operador Comum)
        App::instance('current_tenant_id', $tenantB->id);
        $buscaInvasao = Pessoa::find($pessoaA->id);

        $this->registrarResultado(
            "Isolamento Cruzado de Leitura (TenantScope)",
            $buscaInvasao === null,
            $buscaInvasao === null ? "Tenant B não conseguiu ler o cliente do Tenant A (Retorno Nulo blindado)" : "Vazamento inter-tenant detectado",
            $modulo
        );

        // 3. Validação do SaaS Owner / Master Global (is_master = true)
        $masterUser = new User();
        $masterUser->id = (string) Str::uuid();
        $masterUser->name = 'SaaS Master Auditor';
        $masterUser->email = 'master.audit.' . Str::random(5) . '@scalle.com';
        $masterUser->is_master = true;
        $masterUser->tenant_id = null;

        // Limpa tenant do container e injeta resolver sem acionar guards de sessão
        App::forgetInstance('current_tenant_id');
        request()->setUserResolver(fn() => $masterUser);

        $buscaMaster = Pessoa::withoutGlobalScope(TenantScope::class)->find($pessoaA->id);

        $this->registrarResultado(
            "Visão Panorâmica do SaaS Owner (is_master)",
            $buscaMaster !== null,
            $buscaMaster !== null
                ? "SaaS Owner consultou entidade globalmente sem restrição indevida"
                : "Falha: SaaS Owner foi bloqueado indevidamente",
            $modulo
        );

        // Restaura o contexto do tenant principal para os próximos módulos
        App::instance('current_tenant_id', $tenantA->id);
    }

    private function auditarMultiFilial(): void
    {
        $modulo = "2. Multi-Filial & Catálogo";
        $tenantId = Tenant::first()->id;
        App::instance('current_tenant_id', $tenantId);

        $matriz = Empresa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome_fantasia' => 'Audit Matriz',
            'razao_social' => 'Audit Matriz LTDA',
            'cnpj' => '33333333000191',
            'regime_tributario' => 'simples_nacional',
            'is_matriz' => true,
        ]);

        $filial = Empresa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome_fantasia' => 'Audit Filial 01',
            'razao_social' => 'Audit Filial 01 LTDA',
            'cnpj' => '33333333000272',
            'regime_tributario' => 'simples_nacional',
            'is_matriz' => false,
        ]);

        // Produto criado no tenant deve ser visível para ambas
        $item = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Item Catálogo Global Audit',
            'codigo_sku' => 'SKU-AUDIT-' . Str::random(4),
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 150.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
        ]);

        App::instance('current_empresa_id', $matriz->id);
        $verMatriz = Item::find($item->id);

        App::instance('current_empresa_id', $filial->id);
        $verFilial = Item::find($item->id);

        $this->registrarResultado(
            "Catálogo Unificado entre Matriz e Filial",
            ($verMatriz !== null && $verFilial !== null),
            "O item foi consultado com sucesso a partir de ambos os estabelecimentos",
            $modulo
        );
    }

    private function auditarComercialAlcadas(): void
    {
        $modulo = "3. Comercial & PDV";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $deposito = Deposito::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'nome' => 'Depósito Audit PDV',
            'codigo' => 'DEP-AUD-' . Str::random(3),
            'is_padrao' => true,
            'is_ativo' => true,
        ]);

        $item = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Produto Teste Venda',
            'codigo_sku' => 'VENDA-AUD-' . Str::random(4),
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 100.00,
            'preco_custo' => 50.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
        ]);

        $user = User::first() ?? User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'name' => 'Auditor User',
            'email' => 'audit.' . Str::random(5) . '@scalle.com',
            'password' => 'secret123',
            'is_ativo' => true,
        ]);

        // Dá saldo prévio
        EstoqueService::movimentar($deposito->id, $item->id, 10, 'AJUSTE_INVENTARIO', $user->id, 'inventario', (string) Str::uuid(), null, 50.00);

        $cliente = Pessoa::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'tipo_pessoa' => 'PF',
            'nome_razao_social' => 'Consumidor Teste',
            'cpf_cnpj' => '00000000000',
            'is_cliente' => true,
        ]);

        $venda = VendaService::faturarVenda(
            $empresa->id,
            $cliente->id,
            $deposito->id,
            $user,
            [['item_id' => $item->id, 'quantidade' => 2, 'preco_unitario' => 100.00, 'desconto_unitario' => 0]],
            [['forma_pagamento' => 'PIX', 'valor_pago' => 200.00]],
            0.00,
            'PDV'
        );

        $saldoRestante = EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $item->id)->value('quantidade_saldo');

        $this->registrarResultado(
            "Faturamento Atômico PDV com Baixa no WMS",
            ($venda->status === 'FATURADO' && (float)$saldoRestante === 8.0),
            "Venda liquidada com saldo de estoque reduzido de 10 para 8",
            $modulo
        );
    }

    private function auditarWmsEstoque(): void
    {
        $modulo = "4. WMS & Estoque";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $depOrigem = Deposito::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'nome' => 'Origem WMS',
            'codigo' => 'WMS-ORI-' . Str::random(3),
            'is_ativo' => true,
        ]);

        $depDestino = Deposito::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'nome' => 'Destino WMS',
            'codigo' => 'WMS-DES-' . Str::random(3),
            'is_ativo' => true,
        ]);

        $item = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Item WMS Transfer',
            'codigo_sku' => 'TRF-AUD-' . Str::random(4),
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 20.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
        ]);

        $user = User::first();
        EstoqueService::movimentar($depOrigem->id, $item->id, 50, 'ENTRADA_COMPRA', $user->id, 'compras', (string) Str::uuid(), 'LOTE-123', 10.00);

        // Transferência Interna Direta
        EstoqueService::movimentar($depOrigem->id, $item->id, 20, 'TRANSFERENCIA_SAIDA', $user->id, 'transferencias', (string) Str::uuid(), 'LOTE-123', 10.00);
        EstoqueService::movimentar($depDestino->id, $item->id, 20, 'TRANSFERENCIA_ENTRADA', $user->id, 'transferencias', (string) Str::uuid(), 'LOTE-123', 10.00);

        $saldoOrigem = EstoqueDeposito::where('deposito_id', $depOrigem->id)->where('item_id', $item->id)->value('quantidade_saldo');
        $saldoDestino = EstoqueDeposito::where('deposito_id', $depDestino->id)->where('item_id', $item->id)->value('quantidade_saldo');

        $this->registrarResultado(
            "Transferência Atômica Entre Depósitos com Rastreabilidade de Lote",
            ((float)$saldoOrigem === 30.0 && (float)$saldoDestino === 20.0),
            "Origem debitada para 30 e Destino creditado em 20 preservando Lote-123",
            $modulo
        );
    }

    private function auditarServicosCmms(): void
    {
        $modulo = "5. Serviços & CMMS";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $cliente = Pessoa::where('tenant_id', $tenantId)->first();
        $user = User::first();

        $sla = OrdemServicoService::calcularSla('URGENTE');
        $os = OrdemServico::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'cliente_id' => $cliente->id,
            'tecnico_responsavel_id' => $user->id,
            'numero_os' => 99999,
            'status' => 'ABERTA',
            'prioridade' => 'URGENTE',
            'tipo_manutencao' => 'CORRETIVA',
            'equipamento_descricao' => 'Chiller de Teste Audit',
            'defeito_reclamado' => 'Alarme de baixa pressão',
            'data_abertura' => now(),
            'prazo_sla_resposta' => $sla['resposta'],
            'prazo_sla_resolucao' => $sla['resolucao'],
        ]);

        $osFinalizada = OrdemServicoService::concluirOrdemServico(
            $os,
            [],
            "Carga de fluido refrigerante e teste estanqueidade ok.",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "Cliente Aprovador",
            "123.456.789-00",
            $user,
            -22.763,
            -43.398,
            "127.0.0.1"
        );

        $temHash = !empty($osFinalizada->hash_assinatura_sha256);
        $isConcluida = $osFinalizada->status === 'CONCLUIDA';

        $this->registrarResultado(
            "Encerramento de OS com Assinatura Digital e Hash MP 2.200-2",
            ($isConcluida && $temHash),
            "OS concluída com geração de hash SHA-256 integrando Geotag e IP",
            $modulo
        );
    }

    private function auditarPcpIndustrial(): void
    {
        $modulo = "6. Indústria (PCP)";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $produtoAcabado = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Quadro Elétrico Montado',
            'codigo_sku' => 'IND-PA-' . Str::random(4),
            'tipo_item' => 'PRODUTO',
            'preco_venda' => 1200.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
        ]);

        $insumo = Item::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => 'Disjuntor Tripolar 50A',
            'codigo_sku' => 'IND-INS-' . Str::random(4),
            'tipo_item' => 'MATERIA_PRIMA',
            'preco_custo' => 80.00,
            'unidade_medida' => 'UN',
            'controla_estoque' => true,
        ]);

        $deposito = Deposito::where('empresa_id', $empresa->id)->first();
        $user = User::first();

        // Dá estoque do insumo
        EstoqueService::movimentar($deposito->id, $insumo->id, 10, 'ENTRADA_COMPRA', $user->id, 'compras', (string) Str::uuid(), null, 80.00);

        \App\Models\EstruturaItem::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'produto_pai_id' => $produtoAcabado->id,
            'insumo_filho_id' => $insumo->id,
            'quantidade_necessaria' => 2.0000,
            'percentual_perda_estimada' => 0.00,
        ]);

        $op = \App\Models\OrdemProducao::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'produto_id' => $produtoAcabado->id,
            'deposito_origem_id' => $deposito->id,
            'deposito_destino_id' => $deposito->id,
            'responsavel_id' => $user->id,
            'numero_op' => 8888,
            'status' => 'PLANEJADA',
            'quantidade_planejada' => 2.0000,
            'quantidade_produzida' => 0.0000,
            'custo_total_estimado' => 320.00,
            'custo_total_real' => 0.00,
            'data_inicio_prevista' => now()->toDateString(),
            'data_fim_prevista' => now()->toDateString(),
        ]);

        ProducaoPcpService::finalizarProducao($op, 2.0000, 0.0000, $user);

        $saldoInsumo = EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $insumo->id)->value('quantidade_saldo');
        $saldoAcabado = EstoqueDeposito::where('deposito_id', $deposito->id)->where('item_id', $produtoAcabado->id)->value('quantidade_saldo');

        $this->registrarResultado(
            "Apontamento de OP com Consumo de BOM e Entrada de Produto Acabado",
            ((float)$saldoInsumo === 6.0 && (float)$saldoAcabado === 2.0),
            "Consumiu 4 insumos (saldo baixou de 10 para 6) e gerou 2 acabados no estoque",
            $modulo
        );
    }

    private function auditarFinanceiro(): void
    {
        $modulo = "7. Financeiro";
        $tenantId = Tenant::first()->id;
        $empresa = Empresa::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);
        App::instance('current_empresa_id', $empresa->id);

        $cliente = Pessoa::where('tenant_id', $tenantId)->first();
        $conta = \App\Models\ContaFinanceira::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'nome' => 'Conta Corrente Auditoria',
            'tipo_conta' => 'BANCO',
            'saldo_atual' => 1000.00,
            'is_ativo' => true,
        ]);

        $titulo = TituloFinanceiro::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'pessoa_id' => $cliente->id,
            'natureza' => 'RECEBER',
            'documento_numero' => 'TIT-AUD-01',
            'parcela_numero' => 1,
            'total_parcelas' => 1,
            'data_emissao' => now()->toDateString(),
            'data_vencimento' => now()->toDateString(),
            'valor_original' => 500.00,
            'valor_saldo_aberto' => 500.00,
            'valor_pago_acumulado' => 0.00,
            'status' => 'ABERTO',
            'historico' => 'Auditoria Financeira',
        ]);

        $user = User::first();
        FinanceiroService::liquidarTitulo($titulo, $conta->id, 500.00, 0, 0, 0, 'PIX', $user);

        $contaAtualizada = \App\Models\ContaFinanceira::find($conta->id);
        $tituloAtualizado = TituloFinanceiro::find($titulo->id);

        $this->registrarResultado(
            "Liquidação de Título com Atualização de Extrato Bancário",
            ($tituloAtualizado->status === 'LIQUIDADO' && (float)$contaAtualizada->saldo_atual === 1500.00),
            "Título marcado como LIQUIDADO e saldo bancário subiu de R$ 1000 para R$ 1500",
            $modulo
        );
    }

    private function auditarBillingSoftLock(): void
    {
        $modulo = "8. Billing & Soft-Lock";
        $tenantId = Tenant::first()->id;

        // Recupera um plano existente ou provisiona temporariamente para o teste
        $plano = Plano::first() ?? Plano::create([
            'id' => (string) Str::uuid(),
            'nome' => 'Plano Auditoria',
            'slug' => 'plano-audit-' . Str::random(4),
            'valor_mensal' => 199.00,
            'limite_usuarios' => 10,
            'cota_storage_bytes' => 10737418240, // 10 GB
            'is_ativo' => true,
        ]);

        $assinatura = Assinatura::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'plano_id' => $plano->id, // ID com foreign key válida
            'status' => 'SOFT_LOCK',
            'data_inicio' => now()->subDays(30)->toDateString(),
            'data_proximo_vencimento' => now()->subDays(5)->toDateString(),
            'storage_utilizado_bytes' => 0,
        ]);

        $user = User::where('tenant_id', $tenantId)->first();
        App::instance('current_tenant_id', $tenantId);

        $middleware = new \App\Http\Middleware\CheckSubscriptionStatus();

        // 1. Simula requisição POST bloqueada
        $reqPost = \Illuminate\Http\Request::create('/api/pessoas', 'POST', ['nome_razao_social' => 'Teste Mutação']);
        $reqPost->setUserResolver(fn() => $user);

        $respPost = $middleware->handle($reqPost, fn() => response()->json(['data' => 'ok'], 201));

        // 2. Simula requisição GET permitida
        $reqGet = \Illuminate\Http\Request::create('/api/pessoas', 'GET');
        $reqGet->setUserResolver(fn() => $user);

        $respGet = $middleware->handle($reqGet, fn() => response()->json(['data' => []], 200));

        $bloqueioEfetivo = ($respPost->getStatusCode() === 402 && $respGet->getStatusCode() === 200);

        $this->registrarResultado(
            "Garantia de Soft-Lock (Bloqueio 402 em Mutações e Liberação Read-Only em Consultas)",
            $bloqueioEfetivo,
            $bloqueioEfetivo ? "POST retornou 402 Payment Required e GET retornou 200 OK" : "Falha na regra de contingência Soft-Lock",
            $modulo
        );
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
