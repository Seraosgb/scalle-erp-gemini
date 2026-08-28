<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('ven_regras_comissao')) {
            Schema::create('ven_regras_comissao', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->index();
                $table->string('cargo_ou_perfil', 50)->default('VENDEDOR'); // VENDEDOR, TECNICO, GERENTE
                $table->uuid('categoria_id')->nullable();
                $table->decimal('faixa_valor_min', 10, 2)->default(0.00);
                $table->decimal('faixa_valor_max', 10, 2)->nullable();
                $table->decimal('percentual_comissao', 5, 2)->default(2.50);
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ven_regras_comissao');
    }
};