<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Árvore do Plano de Contas (Natureza Financeira)
        Schema::create('fin_planos_contas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->nullable()->index(); // Nulo = Global para o Tenant
            $table->uuid('parent_id')->nullable(); // Auto-relacionamento (Hierarquia)
            $table->string('codigo', 50);
            $table->string('nome', 150);
            $table->string('tipo', 20)->nullable(); // RECEITA, DESPESA, ATIVO, PASSIVO
            $table->boolean('is_sintetico')->default(false); // True = Pasta, False = Conta lançável
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('parent_id')->references('id')->on('fin_planos_contas')->onDelete('cascade');
        });

        // Árvore de Centros de Custo (Departamentalização)
        Schema::create('fin_centros_custos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->nullable()->index();
            $table->uuid('parent_id')->nullable();
            $table->string('codigo', 50);
            $table->string('nome', 150);
            $table->boolean('is_sintetico')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('parent_id')->references('id')->on('fin_centros_custos')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fin_centros_custos');
        Schema::dropIfExists('fin_planos_contas');
    }
};
