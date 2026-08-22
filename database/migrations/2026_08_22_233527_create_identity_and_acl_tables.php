<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Perfis de Acesso (Roles)
        Schema::create('sis_perfis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('slug', 100);
            $table->string('descricao')->nullable();
            $table->boolean('is_admin')->default(false);
            $table->boolean('is_sistema')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'slug']);
        });

        // 2. Tabela de Permissões Granulares
        Schema::create('sis_permissoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('modulo', 50); // ex: vendas, financeiro, os, estoque
            $table->string('slug', 100)->unique(); // ex: financeiro.receber.criar, vendas.desconto.aprovar
            $table->string('nome', 100);
            $table->string('descricao')->nullable();
            $table->timestamps();
        });

        // 3. Pivô Perfil x Permissão
        Schema::create('sis_perfil_permissao', function (Blueprint $table) {
            $table->foreignUuid('perfil_id')->constrained('sis_perfis')->cascadeOnDelete();
            $table->foreignUuid('permissao_id')->constrained('sis_permissoes')->cascadeOnDelete();
            $table->primary(['perfil_id', 'permissao_id']);
        });

        // 4. Modificar Tabela Padrão de Usuários para Suporte a Tenant e UUID
        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('tenant_id')->nullable()->after('id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_padrao_id')->nullable()->after('tenant_id')->constrained('sis_empresas')->nullOnDelete();
            $table->foreignUuid('perfil_id')->nullable()->after('empresa_padrao_id')->constrained('sis_perfis')->nullOnDelete();
            $table->string('telefone', 30)->nullable()->after('email');
            $table->boolean('is_ativo')->default(true)->after('telefone');
            $table->boolean('mfa_ativo')->default(false)->after('is_ativo');
            $table->string('mfa_secret')->nullable()->after('mfa_ativo');
            $table->softDeletes()->after('updated_at');

            $table->index(['tenant_id', 'is_ativo']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['empresa_padrao_id']);
            $table->dropForeign(['perfil_id']);
            $table->dropColumn(['tenant_id', 'empresa_padrao_id', 'perfil_id', 'telefone', 'is_ativo', 'mfa_ativo', 'mfa_secret', 'deleted_at']);
        });

        Schema::dropIfExists('sis_perfil_permissao');
        Schema::dropIfExists('sis_permissoes');
        Schema::dropIfExists('sis_perfis');
    }
};