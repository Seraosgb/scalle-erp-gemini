<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rh_holerites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('empresa_id');
            $table->uuid('colaborador_id');
            $table->string('competencia', 7); // Ex: 09/2026
            $table->date('data_emissao');
            $table->decimal('salario_base', 15, 2);
            $table->decimal('total_proventos', 15, 2)->default(0);
            $table->decimal('total_descontos', 15, 2)->default(0);
            $table->decimal('valor_liquido', 15, 2)->default(0);
            $table->string('status', 30)->default('GERADO'); // GERADO, PAGO, CANCELADO
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('colaborador_id')->references('id')->on('rh_colaboradores')->onDelete('cascade');
        });

        Schema::create('rh_holerite_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('holerite_id');
            $table->string('tipo', 20); // PROVENTO, DESCONTO
            $table->uuid('rubrica_id')->nullable(); // Link para sis_tabelas_dominio (Tabela Dinâmica)
            $table->string('descricao', 150);
            $table->string('referencia', 50)->nullable(); // Ex: 30 dias, 11%, 10h
            $table->decimal('valor', 15, 2);
            $table->timestamps();

            $table->foreign('holerite_id')->references('id')->on('rh_holerites')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rh_holerite_itens');
        Schema::dropIfExists('rh_holerites');
    }
};
