<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela Principal de Ordens de Serviço (OS)
        Schema::create('os_ordens_servico', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('cliente_id')->constrained('pes_pessoas')->cascadeOnDelete();
            $table->foreignUuid('tecnico_responsavel_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('deposito_saida_id')->nullable()->constrained('wms_depositos')->nullOnDelete();
            
            // Dados da OS
            $table->bigInteger('numero_os')->nullable();
            $table->string('status', 30)->default('ABERTA'); // ABERTA, EM_ANDAMENTO, AGUARDANDO_PECA, CONCLUIDA, CANCELADA
            $table->string('prioridade', 20)->default('NORMAL'); // BAIXA, NORMAL, ALTA, URGENTE
            $table->string('tipo_manutencao', 30)->default('CORRETIVA'); // CORRETIVA, PREVENTIVA, INSTALACAO, PREDITIVA
            
            // Equipamento / Objeto do Serviço
            $table->string('equipamento_descricao', 200)->nullable();
            $table->string('equipamento_marca_modelo', 150)->nullable();
            $table->string('equipamento_numero_serie', 100)->nullable();
            
            // Diagnóstico e Laudo
            $table->text('defeito_reclamado')->nullable();
            $table->text('diagnostico_tecnico')->nullable();
            $table->text('servico_executado')->nullable();
            
            // Agendamento e Execução
            $table->dateTime('data_abertura')->useCurrent();
            $table->dateTime('data_agendamento')->nullable();
            $table->dateTime('data_inicio_execucao')->nullable();
            $table->dateTime('data_conclusao')->nullable();
            
            // Valores Totais
            $table->decimal('valor_servicos', 15, 2)->default(0.00);
            $table->decimal('valor_pecas', 15, 2)->default(0.00);
            $table->decimal('valor_desconto', 15, 2)->default(0.00);
            $table->decimal('valor_total', 15, 2)->default(0.00);
            
            // Assinatura e Aceite Digital
            $table->text('assinatura_cliente_base64')->nullable();
            $table->string('nome_responsavel_recebimento', 150)->nullable();
            $table->string('documento_responsavel_recebimento', 30)->nullable();
            $table->dateTime('assinado_em')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'tecnico_responsavel_id']);
        });

        // 2. Tabela de Peças e Serviços Utilizados na OS
        Schema::create('os_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ordem_servico_id')->constrained('os_ordens_servico')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->string('tipo_item', 20); // PRODUTO (PEÇA) ou SERVICO
            $table->decimal('quantidade', 15, 4);
            $table->decimal('valor_unitario', 15, 4);
            $table->decimal('valor_total', 15, 2);
            $table->string('lote', 50)->nullable();
            $table->timestamps();
        });

        // 3. Tabela de Fotos e Evidências (Antes e Depois)
        Schema::create('os_fotos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ordem_servico_id')->constrained('os_ordens_servico')->cascadeOnDelete();
            $table->string('tipo_etapa', 20)->default('ANTES'); // ANTES, DURANTE, DEPOIS, LAUDO
            $table->string('url_arquivo', 500);
            $table->string('descricao')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('os_fotos');
        Schema::dropIfExists('os_itens');
        Schema::dropIfExists('os_ordens_servico');
    }
};