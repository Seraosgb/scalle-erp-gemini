<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabela de Domínio para Status de Projetos
        if (!Schema::hasTable('prj_status_projetos')) {
            Schema::create('prj_status_projetos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100);
                $table->string('cor_hex', 7)->default('#64748b'); // Ex: #10b981 (Emerald)
                $table->boolean('bloqueia_edicao')->default(false);
                $table->timestamps();
            });
        }

        // Tabela de Domínio para Prioridades de Tarefas
        if (!Schema::hasTable('prj_prioridades_tarefas')) {
            Schema::create('prj_prioridades_tarefas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100);
                $table->integer('peso');
                $table->string('cor_hex', 7)->default('#64748b');
                $table->timestamps();
            });
        }

        // CORREÇÃO AQUI: prj_projetos em vez de projetos
        if (Schema::hasTable('prj_projetos')) {
            Schema::table('prj_projetos', function (Blueprint $table) {
                if (!Schema::hasColumn('prj_projetos', 'status_projeto_id')) {
                    $table->uuid('status_projeto_id')->nullable()->after('status');
                }
            });
        }

        if (Schema::hasTable('prj_tarefas')) {
            Schema::table('prj_tarefas', function (Blueprint $table) {
                if (!Schema::hasColumn('prj_tarefas', 'prioridade_id')) {
                    $table->uuid('prioridade_id')->nullable()->after('prioridade');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('prj_projetos')) {
            Schema::table('prj_projetos', function (Blueprint $table) {
                if (Schema::hasColumn('prj_projetos', 'status_projeto_id')) {
                    $table->dropColumn('status_projeto_id');
                }
            });
        }
        if (Schema::hasTable('prj_tarefas')) {
            Schema::table('prj_tarefas', function (Blueprint $table) {
                if (Schema::hasColumn('prj_tarefas', 'prioridade_id')) {
                    $table->dropColumn('prioridade_id');
                }
            });
        }
        Schema::dropIfExists('prj_prioridades_tarefas');
        Schema::dropIfExists('prj_status_projetos');
    }
};
