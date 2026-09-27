<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdv_caixas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->uuid('usuario_id')->index();
            $table->dateTime('data_abertura');
            $table->dateTime('data_fechamento')->nullable();
            $table->decimal('saldo_abertura', 15, 2)->default(0.00);
            $table->decimal('saldo_informado', 15, 2)->nullable(); // Fechamento Cego
            $table->decimal('saldo_calculado', 15, 2)->nullable(); // Calculado pelo sistema
            $table->decimal('quebra_caixa', 15, 2)->nullable(); // Diferença (Positiva ou Negativa)
            $table->string('status', 30)->default('ABERTO');
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('pdv_movimentacoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('caixa_id')->index();
            $table->string('tipo_movimento', 30); // SUPRIMENTO, SANGRIA, VENDA_DINHEIRO
            $table->decimal('valor', 15, 2);
            $table->uuid('autorizador_id')->nullable(); // Preenchido se exigiu alçada/senha
            $table->string('forma_pagamento', 50)->default('DINHEIRO');
            $table->text('observacoes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdv_movimentacoes');
        Schema::dropIfExists('pdv_caixas');
    }
};
