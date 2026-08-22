<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Tenants / Contas Contratantes
        Schema::create('sis_tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nome_fantasia');
            $table->string('razao_social');
            $table->string('documento', 20)->unique(); // CPF ou CNPJ
            $table->string('status', 30)->default('trial'); // trial, ativo, suspenso, cancelado
            $table->jsonb('configuracoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Tabela de Empresas (Suporte a Grupos e Múltiplos CNPJs)
        Schema::create('sis_empresas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->string('nome_fantasia');
            $table->string('razao_social');
            $table->string('cnpj', 20);
            $table->string('inscricao_estadual', 30)->nullable();
            $table->string('regime_tributario', 50)->default('simples_nacional');
            $table->boolean('is_matriz')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'cnpj']);
        });

        // 3. Tabela de Domínio para Listas Suspensas (Dropdowns como Tabelas)
        Schema::create('sis_tabelas_dominio', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('sis_tenants')->cascadeOnDelete();
            $table->string('tipo_lista', 50); // ex: status_os, categoria_produto, motivo_cancelamento
            $table->string('codigo', 50);
            $table->string('nome', 100);
            $table->string('descricao')->nullable();
            $table->string('cor_hex', 10)->nullable(); // Para badges e UI
            $table->integer('ordem_exibicao')->default(0);
            $table->boolean('is_ativo')->default(true);
            $table->boolean('is_sistema')->default(false); // Registros protegidos
            $table->jsonb('metadados')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'tipo_lista', 'is_ativo']);
        });

        // 4. Tabela Centralizada de Trilha de Auditoria
        Schema::create('sis_auditoria_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('sis_tenants')->cascadeOnDelete();
            $table->uuid('usuario_id')->nullable();
            $table->string('acao', 50); // INSERT, UPDATE, DELETE, APROVACAO, LOGIN
            $table->string('modulo', 50);
            $table->string('entidade', 100);
            $table->uuid('registro_id');
            $table->jsonb('valores_antigos')->nullable();
            $table->jsonb('valores_novos')->nullable();
            $table->string('ip_origem', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->uuid('request_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'modulo', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sis_auditoria_logs');
        Schema::dropIfExists('sis_tabelas_dominio');
        Schema::dropIfExists('sis_empresas');
        Schema::dropIfExists('sis_tenants');
    }
};