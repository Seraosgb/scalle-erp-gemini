<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Vincular Ativo na OS
        Schema::table('os_ordens_servico', function (Blueprint $table) {
            $table->foreignUuid('ativo_id')->nullable()->after('deposito_saida_id')->constrained('pat_bens')->nullOnDelete();
        });

        // 2. Tabela de Planos de Manutenção Preventiva (PMOC - Lei 13.589/2018)
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

    public function down(): void
    {
        Schema::dropIfExists('os_planos_preventivos');
        Schema::table('os_ordens_servico', function (Blueprint $table) {
            $table->dropForeign(['ativo_id']);
            $table->dropColumn('ativo_id');
        });
    }
};