<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. AÇÃO NÃO DESTRUTIVA: Se a tabela legada existir, renomeia para preservar os dados.
        if (Schema::hasTable('fro_veiculos')) {
            Schema::rename('fro_veiculos', 'fro_veiculos_legacy_bkp');
        }

        // 2. Cria a nova estrutura blindada (V3)
        Schema::create('fro_veiculos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->string('placa', 10)->unique();
            $table->string('chassi', 50)->nullable();
            $table->string('marca', 50);
            $table->string('modelo', 100);
            $table->integer('ano_fabricacao');
            $table->integer('ano_modelo');
            $table->decimal('km_atual', 10, 2)->default(0);

            // Referências dinâmicas blindadas
            $table->uuid('tipo_combustivel_id')->nullable();
            $table->uuid('status_id')->nullable();
            $table->boolean('is_ativo')->default(true);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        // O rollback desfaz a nova e volta a legada (se existir)
        Schema::dropIfExists('fro_veiculos');

        if (Schema::hasTable('fro_veiculos_legacy_bkp')) {
            Schema::rename('fro_veiculos_legacy_bkp', 'fro_veiculos');
        }
    }
};
