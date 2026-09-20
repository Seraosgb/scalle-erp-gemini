<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Adiciona datas para o Gantt nas Tarefas
        Schema::table('prj_tarefas', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_tarefas', 'data_inicio_prevista')) {
                $table->date('data_inicio_prevista')->nullable()->after('descricao');
            }
            if (!Schema::hasColumn('prj_tarefas', 'data_fim_prevista')) {
                $table->date('data_fim_prevista')->nullable()->after('data_inicio_prevista');
            }
        });

        // Adiciona Limite de Horas na tabela de Equipe do Projeto (assumindo nomenclatura padrao prj_projeto_usuarios)
        // Se a sua tabela de equipe tiver outro nome, ajuste aqui antes de rodar.
        if (Schema::hasTable('prj_projeto_usuarios')) {
            Schema::table('prj_projeto_usuarios', function (Blueprint $table) {
                if (!Schema::hasColumn('prj_projeto_usuarios', 'limite_horas_semanais')) {
                    $table->decimal('limite_horas_semanais', 5, 2)->default(40.00)->after('usuario_id');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('prj_tarefas', function (Blueprint $table) {
            if (Schema::hasColumn('prj_tarefas', 'data_inicio_prevista')) $table->dropColumn('data_inicio_prevista');
            if (Schema::hasColumn('prj_tarefas', 'data_fim_prevista')) $table->dropColumn('data_fim_prevista');
        });
        if (Schema::hasTable('prj_projeto_usuarios')) {
            Schema::table('prj_projeto_usuarios', function (Blueprint $table) {
                if (Schema::hasColumn('prj_projeto_usuarios', 'limite_horas_semanais')) $table->dropColumn('limite_horas_semanais');
            });
        }
    }
};
