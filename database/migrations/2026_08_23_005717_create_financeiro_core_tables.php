<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Contas Bancárias / Caixas / Carteiras
        Schema::create('fin_contas_financeiras', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('tipo_conta', 30)->default('CORRENTE'); // CORRENTE, POUPANCA, CAIXA_FISICO, APLICACAO, CARTEIRA_DIGITAL
            $table->string('codigo_banco', 10)->nullable();
            $table->string('agencia', 20)->nullable();
            $table->string('numero_conta', 30)->nullable();
            $table->decimal('saldo_inicial', 15, 2)->default(0.00);
            $table->decimal('saldo_atual', 15, 2)->default(0.00);
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'empresa_id', 'is_ativo']);
        });

        // 2. Tabela de Títulos Financeiros (A Pagar e A Receber)
        Schema::create('fin_titulos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('pessoa_id')->constrained('pes_pessoas')->cascadeOnDelete();
            $table->foreignUuid('conta_padrao_id')->nullable()->constrained('fin_contas_financeiras')->nullOnDelete();
            
            // Classificação
            $table->string('natureza', 10); // 'PAGAR' ou 'RECEBER'
            $table->string('documento_numero', 50)->nullable();
            $table->integer('parcela_numero')->default(1);
            $table->integer('total_parcelas')->default(1);
            
            // Origem do Título (Rastreabilidade de Vendas, Compras ou OS)
            $table->string('origem_tipo', 50)->nullable(); // vendas, compras, os, manual
            $table->uuid('origem_id')->nullable();
            
            // Datas
            $table->date('data_emissao')->useCurrent();
            $table->date('data_vencimento');
            $table->date('data_liquidacao')->nullable();
            
            // Valores
            $table->decimal('valor_original', 15, 2);
            $table->decimal('valor_juros', 15, 2)->default(0.00);
            $table->decimal('valor_multa', 15, 2)->default(0.00);
            $table->decimal('valor_desconto', 15, 2)->default(0.00);
            $table->decimal('valor_pago_acumulado', 15, 2)->default(0.00);
            $table->decimal('valor_saldo_aberto', 15, 2);
            
            $table->string('status', 30)->default('ABERTO'); // ABERTO, PARCIAL, LIQUIDADO, CANCELADO
            $table->text('historico')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'natureza', 'status', 'data_vencimento']);
        });

        // 3. Tabela de Movimentações Bancárias / Extrato Financeiro
        Schema::create('fin_movimentacoes_extrato', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('conta_financeira_id')->constrained('fin_contas_financeiras')->cascadeOnDelete();
            $table->foreignUuid('titulo_id')->nullable()->constrained('fin_titulos')->nullOnDelete();
            $table->foreignUuid('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('tipo_movimento', 10); // 'ENTRADA' ou 'SAIDA'
            $table->decimal('valor', 15, 2);
            $table->decimal('saldo_anterior', 15, 2);
            $table->decimal('saldo_posterior', 15, 2);
            $table->string('forma_pagamento', 50)->default('OUTROS'); // DINHEIRO, PIX, TRANSFERENCIA, BOLETO, CARTAO
            $table->date('data_movimento')->useCurrent();
            $table->text('descricao');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'conta_financeira_id', 'data_movimento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fin_movimentacoes_extrato');
        Schema::dropIfExists('fin_titulos');
        Schema::dropIfExists('fin_contas_financeiras');
    }
};