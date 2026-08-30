<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('crm_oportunidade_atividades')) {
            Schema::create('crm_oportunidade_atividades', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('oportunidade_id')->index();
                $table->uuid('usuario_id')->nullable()->index();
                $table->string('tipo', 30)->default('NOTA'); // NOTA, LIGACAO, REUNIAO, WHATSAPP, TAREFA
                $table->text('descricao');
                $table->dateTime('data_agendamento')->nullable();
                $table->boolean('is_concluida')->default(false);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('oportunidade_id')->references('id')->on('crm_oportunidades')->onDelete('cascade');
                $table->foreign('usuario_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        // Adiciona colunas de motivo de perda e fechamento caso não existam
        Schema::table('crm_oportunidades', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_oportunidades', 'motivo_perda_id')) {
                $table->uuid('motivo_perda_id')->nullable()->index();
            }
            if (!Schema::hasColumn('crm_oportunidades', 'justificativa_perda')) {
                $table->text('justificativa_perda')->nullable();
            }
            if (!Schema::hasColumn('crm_oportunidades', 'data_fechamento')) {
                $table->dateTime('data_fechamento')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_oportunidade_atividades');
    }
};