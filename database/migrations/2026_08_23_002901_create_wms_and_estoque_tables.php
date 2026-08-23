<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Almoxarifados / Depósitos de Estoque
        Schema::create('wms_depositos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('codigo', 30);
            $table->string('descricao')->nullable();
            $table->boolean('is_padrao')->default(false);
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'empresa_id', 'codigo']);
        });

        // 2. Tabela de Saldo Fracionado por Depósito, Lote e Validade
        Schema::create('wms_estoque_deposito', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('deposito_id')->constrained('wms_depositos')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->string('lote', 50)->nullable();
            $table->date('data_validade')->nullable();
            $table->string('localizacao_rua', 20)->nullable();
            $table->string('localizacao_predio', 20)->nullable();
            $table->string('localizacao_nivel', 20)->nullable();
            $table->string('localizacao_vao', 20)->nullable();
            
            // Saldos com precisão fracionária (até 4 casas decimais)
            $table->decimal('quantidade_saldo', 15, 4)->default(0.0000);
            $table->decimal('quantidade_reservada', 15, 4)->default(0.0000);
            $table->timestamps();

            $table->index(['tenant_id', 'deposito_id', 'item_id']);
        });

        // 3. Tabela de Movimentações Históricas de Estoque (Kardex)
        Schema::create('wms_movimentacoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('deposito_id')->constrained('wms_depositos')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->foreignUuid('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo_movimento', 30); // ENTRADA_COMPRA, SAIDA_VENDA, SAIDA_OS, AJUSTE_INVENTARIO, TRANSFERENCIA_SAIDA, TRANSFERENCIA_ENTRADA
            $table->decimal('quantidade', 15, 4);
            $table->decimal('saldo_anterior', 15, 4);
            $table->decimal('saldo_posterior', 15, 4);
            $table->decimal('custo_unitario', 15, 2)->default(0.00);
            $table->string('documento_origem_tipo', 50)->nullable(); // compras, vendas, os, transferencias
            $table->uuid('documento_origem_id')->nullable();
            $table->text('motivo')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'deposito_id', 'item_id', 'created_at']);
        });

        // 4. Tabela de Transferências Internas entre Depósitos
        Schema::create('wms_transferencias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('solicitante_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('deposito_origem_id')->constrained('wms_depositos')->cascadeOnDelete();
            $table->foreignUuid('deposito_destino_id')->constrained('wms_depositos')->cascadeOnDelete();
            $table->string('modalidade', 30)->default('DIRETO'); // DIRETO, EM_TRANSITO
            $table->string('status', 30)->default('PENDENTE'); // PENDENTE, EM_TRANSITO, CONCLUIDO, CANCELADO
            $table->text('observacoes')->nullable();
            $table->timestamp('concluido_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
        });

        // 5. Itens da Transferência
        Schema::create('wms_transferencia_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transferencia_id')->constrained('wms_transferencias')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->string('lote', 50)->nullable();
            $table->decimal('quantidade_solicitada', 15, 4);
            $table->decimal('quantidade_atendida', 15, 4)->default(0.0000);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wms_transferencia_itens');
        Schema::dropIfExists('wms_transferencias');
        Schema::dropIfExists('wms_movimentacoes');
        Schema::dropIfExists('wms_estoque_deposito');
        Schema::dropIfExists('wms_depositos');
    }
};