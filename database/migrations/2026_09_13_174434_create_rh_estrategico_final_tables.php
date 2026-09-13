<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ==========================================
        // 1. MÓDULO eNPS (PESQUISA DE CLIMA)
        // ==========================================
        if (!Schema::hasTable('rh_enps_campanhas')) {
            Schema::create('rh_enps_campanhas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('empresa_id')->nullable();
                $table->string('titulo', 150);
                $table->date('data_inicio');
                $table->date('data_fim');
                $table->string('status', 30)->default('ATIVA'); // ATIVA, ENCERRADA
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('rh_enps_respostas')) {
            Schema::create('rh_enps_respostas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('campanha_id');
                // IMPORTANTE: Sem coluna de colaborador_id para garantir anonimato total arquitetural.
                $table->integer('nota'); // 0 a 10
                $table->text('comentario')->nullable();
                $table->timestamps();

                $table->foreign('campanha_id')->references('id')->on('rh_enps_campanhas')->onDelete('cascade');
            });
        }

        // ==========================================
        // 2. MÓDULO NINE-BOX E PDI (AVALIAÇÃO DE DESEMPENHO)
        // ==========================================

        // Tabela de Domínio Dinâmica para os Eixos (Ex: Eixo X = Desempenho, Eixo Y = Potencial Cultural)
        if (!Schema::hasTable('rh_ninebox_eixos')) {
            Schema::create('rh_ninebox_eixos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('empresa_id')->nullable();
                $table->string('tipo', 10); // X ou Y
                $table->string('nome', 100);
                $table->text('descricao')->nullable();
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('rh_avaliacoes_desempenho')) {
            Schema::create('rh_avaliacoes_desempenho', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('empresa_id')->nullable();
                $table->uuid('colaborador_id');
                $table->uuid('eixo_x_id'); // Link para tabela de domínio
                $table->integer('nota_x'); // 1 a 3 (Baixo, Médio, Alto)
                $table->uuid('eixo_y_id'); // Link para tabela de domínio
                $table->integer('nota_y'); // 1 a 3 (Baixo, Médio, Alto)
                $table->date('data_avaliacao');
                $table->text('observacoes_gestor')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('colaborador_id')->references('id')->on('rh_colaboradores')->onDelete('cascade');
                $table->foreign('eixo_x_id')->references('id')->on('rh_ninebox_eixos')->onDelete('restrict');
                $table->foreign('eixo_y_id')->references('id')->on('rh_ninebox_eixos')->onDelete('restrict');
            });
        }

        if (!Schema::hasTable('rh_pdi')) {
            Schema::create('rh_pdi', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('avaliacao_id');
                $table->string('objetivo', 200);
                $table->text('plano_acao');
                $table->date('prazo_conclusao');
                $table->string('status', 30)->default('PENDENTE'); // PENDENTE, EM ANDAMENTO, CONCLUIDO
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('avaliacao_id')->references('id')->on('rh_avaliacoes_desempenho')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        // Migração não destrutiva. Rollback desativado para proteção do core.
    }
};
