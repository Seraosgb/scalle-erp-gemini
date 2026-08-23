<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela Principal de Pedidos de Venda, Orçamentos e Vendas PDV
        Schema::create('ven_pedidos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('cliente_id')->constrained('pes_pessoas')->cascadeOnDelete();
            $table->foreignUuid('vendedor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('deposito_saida_id')->constrained('wms_depositos')->cascadeOnDelete();
            
            // Identificação e Fluxo
            $table->string('tipo_documento', 20)->default('PEDIDO'); // ORCAMENTO, PEDIDO, PDV
            $table->bigInteger('numero_pedido')->nullable();
            $table->string('status', 30)->default('ORCAMENTO'); // ORCAMENTO, AGUARDANDO_APROVACAO, APROVADO, FATURADO, CANCELADO
            $table->date('data_emissao')->useCurrent();
            $table->date('data_validade_orcamento')->nullable();
            
            // Valores Consolidados
            $table->decimal('valor_subtotal_itens', 15, 2)->default(0.00);
            $table->decimal('valor_frete', 15, 2)->default(0.00);
            $table->decimal('valor_seguro', 15, 2)->default(0.00);
            $table->decimal('valor_outras_despesas', 15, 2)->default(0.00);
            $table->decimal('percentual_desconto', 8, 2)->default(0.00);
            $table->decimal('valor_desconto', 15, 2)->default(0.00);
            $table->decimal('valor_total_liquido', 15, 2)->default(0.00);
            
            // Controle de PDV Offline
            $table->uuid('pdv_offline_uuid')->nullable()->index(); // ID gerado pelo PDV em modo offline
            $table->timestamp('sincronizado_em')->nullable();
            
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'tipo_documento', 'data_emissao']);
        });

        // 2. Tabela de Itens do Pedido / PDV
        Schema::create('ven_pedido_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pedido_id')->constrained('ven_pedidos')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->decimal('quantidade', 15, 4);
            $table->decimal('preco_tabela_unitario', 15, 4);
            $table->decimal('percentual_desconto', 8, 2)->default(0.00);
            $table->decimal('valor_desconto_unitario', 15, 4)->default(0.0000);
            $table->decimal('preco_venda_unitario', 15, 4);
            $table->decimal('valor_total_bruto', 15, 2);
            $table->decimal('valor_total_liquido', 15, 2);
            $table->string('lote', 50)->nullable();
            $table->timestamps();
        });

        // 3. Tabela de Formas de Pagamento Vinculadas à Venda
        Schema::create('ven_pedido_pagamentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pedido_id')->constrained('ven_pedidos')->cascadeOnDelete();
            $table->string('forma_pagamento', 50); // DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO, BOLETO, CREDIARIO
            $table->integer('parcelas')->default(1);
            $table->decimal('valor_pago', 15, 2);
            $table->decimal('valor_troco', 15, 2)->default(0.00);
            $table->string('status', 30)->default('CONFIRMADO'); // CONFIRMADO, PENDENTE
            $table->string('transacao_nsu_autorizacao', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ven_pedido_pagamentos');
        Schema::dropIfExists('ven_pedido_itens');
        Schema::dropIfExists('ven_pedidos');
    }
};