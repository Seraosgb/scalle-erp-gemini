<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pcp_apontamentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('ordem_producao_id')->index();
            $table->uuid('operador_id')->nullable()->index();
            $table->decimal('quantidade_produzida', 15, 4);
            $table->decimal('quantidade_refugo', 15, 4)->default(0.0000);
            $table->decimal('horas_mod', 8, 2)->default(0.00);
            $table->decimal('custo_hora_mod', 15, 2)->default(0.00);
            $table->decimal('custo_total_mod', 15, 2)->default(0.00);
            $table->decimal('horas_cif', 8, 2)->default(0.00);
            $table->decimal('custo_hora_cif', 15, 2)->default(0.00);
            $table->decimal('custo_total_cif', 15, 2)->default(0.00);
            $table->decimal('custo_insumos', 15, 2)->default(0.00);
            $table->decimal('custo_total_apontamento', 15, 2)->default(0.00);
            $table->text('observacoes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('sis_tenants')->onDelete('cascade');
            $table->foreign('ordem_producao_id')->references('id')->on('pcp_ordens_producao')->onDelete('cascade');
            $table->foreign('operador_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pcp_apontamentos');
    }
};