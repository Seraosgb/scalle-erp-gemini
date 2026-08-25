<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Apontamentos de Mão de Obra / Jornada Técnica
        if (!Schema::hasTable('os_apontamentos_horas')) {
            Schema::create('os_apontamentos_horas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('ordem_servico_id')->index();
                $table->uuid('tecnico_id')->index();
                $table->dateTime('data_hora_inicio');
                $table->dateTime('data_hora_fim')->nullable();
                $table->decimal('total_horas', 8, 2)->default(0.00);
                $table->decimal('valor_hora', 10, 2)->default(0.00);
                $table->decimal('valor_total', 10, 2)->default(0.00);
                $table->text('descricao_atividades')->nullable();
                $table->timestamps();

                $table->foreign('ordem_servico_id')->references('id')->on('os_ordens_servico')->onDelete('cascade');
                $table->foreign('tecnico_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 2. Adicionar status do fluxo de almoxarifado nas peças da OS
        if (Schema::hasTable('os_itens') && !Schema::hasColumn('os_itens', 'status_requisicao')) {
            Schema::table('os_itens', function (Blueprint $table) {
                $table->string('status_requisicao', 30)->default('RETIRADO')->after('lote'); // SOLICITADO, DISPONIVEL, RETIRADO
                $table->uuid('almoxarife_id')->nullable()->after('status_requisicao');
                $table->dateTime('atendido_em')->nullable()->after('almoxarife_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('os_apontamentos_horas');
        if (Schema::hasTable('os_itens') && Schema::hasColumn('os_itens', 'status_requisicao')) {
            Schema::table('os_itens', function (Blueprint $table) {
                $table->dropColumn(['status_requisicao', 'almoxarife_id', 'atendido_em']);
            });
        }
    }
};