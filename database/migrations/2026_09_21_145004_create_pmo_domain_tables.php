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
                $table->boolean('bloqueia_edicao')->default(false); // Ex: Status "Concluído" congela o projeto
                $table->timestamps();
            });
        }

        // Tabela de Domínio para Prioridades de Tarefas
        if (!Schema::hasTable('prj_prioridades_tarefas')) {
            Schema::create('prj_prioridades_tarefas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100); // Ex: "Crítica", "Alta", "Média", "Baixa"
                $table->integer('peso'); // Para ordenação (ex: 100 para Alta, 10 para Baixa)
                $table->string('cor_hex', 7)->default('#64748b');
                $table->timestamps();
            });
        }

        // Ajuste nas tabelas destino (Alterar de Enum/String/Int rígido para UUID)
        // Como não queremos destruir dados antigos, adicionamos colunas de relacionamento
        Schema::table('projetos', function (Blueprint $table) {
            if (!Schema::hasColumn('projetos', 'status_projeto_id')) {
                $table->uuid('status_projeto_id')->nullable()->after('status');
            }
        });

        Schema::table('prj_tarefas', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_tarefas', 'prioridade_id')) {
                $table->uuid('prioridade_id')->nullable()->after('prioridade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('projetos', function (Blueprint $table) {
            if (Schema::hasColumn('projetos', 'status_projeto_id')) $table->dropColumn('status_projeto_id');
        });
        Schema::table('prj_tarefas', function (Blueprint $table) {
            if (Schema::hasColumn('prj_tarefas', 'prioridade_id')) $table->dropColumn('prioridade_id');
        });
        Schema::dropIfExists('prj_prioridades_tarefas');
        Schema::dropIfExists('prj_status_projetos');
    }
};
