<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela para transição tributária (Coexistência de Impostos e Split Payment)
        Schema::create('fis_regras_reforma_tributaria', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('tipo_imposto', 10); // CBS, IBS, ICMS, PIS, COFINS
            $table->date('validade_inicio');
            $table->date('validade_fim')->nullable();
            $table->decimal('aliquota', 5, 2);
            $table->boolean('is_split_payment')->default(false);
            $table->decimal('percentual_split', 5, 2)->nullable();
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Tabela para Eventos Fiscais (Cancelamento, Inutilização, CC-e)
        Schema::create('fis_eventos_documentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('documento_fiscal_id')->index(); // Link com a NF-e
            $table->string('tipo_evento', 50); // CANCELAMENTO, CCE, INUTILIZACAO
            $table->text('justificativa');
            $table->string('protocolo_retorno', 50)->nullable();
            $table->string('status_evento', 30)->default('PENDENTE'); // PENDENTE, PROCESSANDO, HOMOLOGADO, REJEITADO
            $table->text('xml_evento')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fis_eventos_documentos');
        Schema::dropIfExists('fis_regras_reforma_tributaria');
    }
};
