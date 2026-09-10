<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rh_escalas_trabalho', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('nome', 100); // Ex: "Comercial 44h", "Plantão 12x36"
            $table->string('tipo_escala', 30); // SEMANAL, 12X36, 6X2
            $table->time('horario_entrada');
            $table->time('horario_saida');
            $table->time('inicio_intervalo')->nullable();
            $table->time('fim_intervalo')->nullable();
            $table->integer('tolerancia_minutos')->default(10); // Tolerância legal Art. 58 CLT
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Adiciona a FK de escala na tabela de colaboradores que já criamos antes
        Schema::table('rh_colaboradores', function (Blueprint $table) {
            $table->uuid('escala_id')->nullable()->after('tipo_contrato');
            $table->foreign('escala_id')->references('id')->on('rh_escalas_trabalho')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rh_colaboradores', function (Blueprint $table) {
            $table->dropForeign(['escala_id']);
            $table->dropColumn('escala_id');
        });

        Schema::dropIfExists('rh_escalas_trabalho');
    }
};
