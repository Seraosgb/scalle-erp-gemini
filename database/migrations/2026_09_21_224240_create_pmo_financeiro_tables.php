<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('prj_custos')) {
            Schema::create('prj_custos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('projeto_id')->index();
                $table->string('descricao', 255);
                $table->decimal('valor', 15, 2);
                $table->date('data_custo');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('prj_entregaveis')) {
            Schema::create('prj_entregaveis', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('projeto_id')->index();
                $table->string('titulo', 255);
                $table->decimal('valor_faturamento', 15, 2);
                $table->date('data_prevista')->nullable();
                $table->string('status', 50)->default('PENDENTE'); // PENDENTE, FATURADO
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('prj_entregaveis');
        Schema::dropIfExists('prj_custos');
    }
};
