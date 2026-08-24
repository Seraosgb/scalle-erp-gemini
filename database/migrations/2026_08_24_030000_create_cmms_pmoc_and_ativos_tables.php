<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Criar tabela de Bens Patrimoniais / Ativos se não existir
        if (!Schema::hasTable('pat_bens')) {
            Schema::create('pat_bens', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
                $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
                $table->foreignUuid('responsavel_atual_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('codigo_patrimonio', 50);
                $table->string('descricao', 200);
                $table->string('marca_modelo', 150)->nullable();
                $table->string('numero_serie', 100)->nullable();
                $table->string('qr_code_hash', 64)->nullable();
                $table->date('data_aquisicao')->nullable();
                $table->decimal('valor_aquisicao', 15, 2)->nullable();
                $table->string('status', 30)->default('ATIVO');
                $table->string('localizacao_fisica', 150)->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Adicionar coluna ativo_id na OS se não existir
        if (Schema::hasTable('os_ordens_servico') && !Schema::hasColumn('os_ordens_servico', 'ativo_id')) {
            Schema::table('os_ordens_servico', function (Blueprint $table) {
                $table->foreignUuid('ativo_id')->nullable()->after('deposito_saida_id')->constrained('pat_bens')->nullOnDelete();
            });
        }

        // 3. Tabela de Planos Preventivos (PMOC)
        if (!Schema::hasTable('os_planos_preventivos')) {
            Schema::create('os_planos_preventivos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
                $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
                $table->foreignUuid('cliente_id')->constrained('pes_pessoas')->cascadeOnDelete();
                $table->foreignUuid('ativo_id')->nullable()->constrained('pat_bens')->nullOnDelete();
                $table->foreignUuid('tecnico_padrao_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('titulo_plano', 150);
                $table->string('frequencia', 30); // MENSAL, BIMESTRAL, TRIMESTRAL, SEMESTRAL, ANUAL
                $table->date('proxima_execucao');
                $table->date('ultima_execucao')->nullable();
                $table->jsonb('checklist_itens')->nullable();
                $table->text('instrucoes_tecnicas')->nullable();
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('os_planos_preventivos');
        if (Schema::hasColumn('os_ordens_servico', 'ativo_id')) {
            Schema::table('os_ordens_servico', function (Blueprint $table) {
                $table->dropForeign(['ativo_id']);
                $table->dropColumn('ativo_id');
            });
        }
        Schema::dropIfExists('pat_bens');
    }
};