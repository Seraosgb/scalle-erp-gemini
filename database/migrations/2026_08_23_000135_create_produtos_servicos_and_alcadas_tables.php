<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela Unificada de Catálogo de Itens (Produtos e Serviços)
        Schema::create('pro_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->string('tipo_item', 20)->default('PRODUTO'); // PRODUTO, SERVICO, MATERIA_PRIMA, INSUMO
            $table->string('codigo_sku', 50)->nullable();
            $table->string('codigo_barras_ean', 30)->nullable();
            $table->string('nome', 200);
            $table->text('descricao')->nullable();
            $table->string('unidade_medida', 10)->default('UN'); // UN, KG, M, CX, L, HR
            $table->foreignUuid('categoria_id')->nullable()->constrained('sis_tabelas_dominio')->nullOnDelete();
            
            // Preços e Custos
            $table->decimal('preco_venda', 15, 2)->default(0.00);
            $table->decimal('preco_custo', 15, 2)->default(0.00);
            $table->decimal('custo_medio', 15, 2)->default(0.00);
            $table->decimal('margem_lucro_markup', 8, 2)->default(0.00);
            
            // Parâmetros Fiscais
            $table->string('ncm', 15)->nullable();
            $table->string('cest', 15)->nullable();
            $table->string('cfop_padrao', 10)->nullable();
            $table->string('origem_mercadoria', 2)->default('0'); // 0 = Nacional
            
            // Controle de Estoque
            $table->boolean('controla_estoque')->default(true);
            $table->decimal('estoque_minimo', 15, 4)->default(0.0000);
            $table->decimal('estoque_maximo', 15, 4)->default(0.0000);
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'codigo_sku']);
            $table->index(['tenant_id', 'tipo_item', 'is_ativo']);
        });

       // 2. Tabela de Motor de Alçadas e Aprovações
        Schema::create('sis_alcadas_aprovacoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('solicitante_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('aprovador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo_operacao', 50); // DESCONTO_VENDA, COMPRA_VALOR, CANCELAMENTO_NF
            $table->string('entidade_origem', 50); // pedidos, compras, os
            $table->uuid('registro_origem_id');
            $table->decimal('valor_solicitado', 15, 2)->default(0.00);
            $table->decimal('percentual_solicitado', 8, 2)->nullable();
            $table->string('status', 30)->default('PENDENTE'); // PENDENTE, APROVADO, REJEITADO
            $table->text('justificativa_solicitacao')->nullable();
            $table->text('justificativa_resposta')->nullable();
            $table->timestamp('respondido_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'tipo_operacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sis_alcadas_aprovacoes');
        Schema::dropIfExists('pro_itens');
    }
};