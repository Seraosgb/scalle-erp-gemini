<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Motoristas (Extensão de Pessoas)
        Schema::create('fro_motoristas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('pessoa_id')->unique(); // Link com pes_pessoas
            $table->string('numero_cnh', 20)->unique();
            $table->string('categoria_cnh', 5);
            $table->date('validade_cnh');
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Tabela de Abastecimentos (Integrado ao Financeiro)
        Schema::create('fro_abastecimentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->uuid('veiculo_id')->index();
            $table->uuid('motorista_id')->index();
            $table->uuid('posto_id')->index(); // Link com pes_pessoas (Fornecedor)

            $table->date('data_abastecimento');
            $table->decimal('km_marcador', 10, 2);
            $table->decimal('litros', 8, 2);
            $table->decimal('valor_total', 10, 2);

            $table->uuid('tipo_combustivel_id')->nullable(); // Link com sis_tabelas_dominio
            $table->uuid('titulo_financeiro_id')->nullable(); // Link com Contas a Pagar

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fro_abastecimentos');
        Schema::dropIfExists('fro_motoristas');
    }
};
