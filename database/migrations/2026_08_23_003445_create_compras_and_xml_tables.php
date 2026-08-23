<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela Principal de Compras / Entradas de Notas
        Schema::create('cmp_compras', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('fornecedor_id')->constrained('pes_pessoas')->cascadeOnDelete();
            $table->foreignUuid('deposito_destino_id')->constrained('wms_depositos')->cascadeOnDelete();
            $table->foreignUuid('comprador_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Dados Fiscais da Nota de Entrada
            $table->string('numero_nota', 30)->nullable();
            $table->string('serie_nota', 10)->nullable();
            $table->string('chave_acesso_nfe', 44)->nullable()->index();
            $table->string('status', 30)->default('DIGITACAO'); // DIGITACAO, APROVADO, RECEBIDO, CANCELADO
            $table->date('data_emissao')->nullable();
            $table->date('data_entrada')->useCurrent();
            
            // Valores Totais
            $table->decimal('valor_produtos', 15, 2)->default(0.00);
            $table->decimal('valor_frete', 15, 2)->default(0.00);
            $table->decimal('valor_seguro', 15, 2)->default(0.00);
            $table->decimal('valor_desconto', 15, 2)->default(0.00);
            $table->decimal('valor_outras_despesas', 15, 2)->default(0.00);
            $table->decimal('valor_total', 15, 2)->default(0.00);
            
            $table->text('observacoes')->nullable();
            $table->text('xml_conteudo')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'data_entrada']);
        });

        // 2. Tabela de Itens da Compra
        Schema::create('cmp_compra_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('compra_id')->constrained('cmp_compras')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->string('codigo_fornecedor', 50)->nullable();
            $table->string('descricao_fornecedor', 200)->nullable();
            $table->string('unidade_fornecedor', 10)->nullable();
            $table->decimal('fator_conversao', 10, 4)->default(1.0000); // Ex: 1 Caixa = 12 Unidades
            
            $table->decimal('quantidade_comercial', 15, 4);
            $table->decimal('quantidade_estoque', 15, 4);
            $table->decimal('valor_unitario', 15, 4);
            $table->decimal('valor_total_item', 15, 2);
            
            // Dados de Rastreabilidade
            $table->string('lote', 50)->nullable();
            $table->date('data_validade')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cmp_compra_itens');
        Schema::dropIfExists('cmp_compras');
    }
};