<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Estrutura de Produtos / Ficha Técnica (BOM - Bill of Materials)
        Schema::create('pcp_estrutura_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('produto_pai_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->foreignUuid('insumo_filho_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->decimal('quantidade_necessaria', 15, 4); // Quantidade de insumo por 1 unidade produzida
            $table->decimal('percentual_perda_estimada', 5, 2)->default(0.00);
            $table->timestamps();

            $table->index(['tenant_id', 'produto_pai_id']);
        });

        // 2. Tabela de Ordens de Produção (OP)
        Schema::create('pcp_ordens_producao', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('produto_id')->constrained('pro_itens')->cascadeOnDelete();
            $table->foreignUuid('deposito_origem_id')->constrained('wms_depositos')->cascadeOnDelete(); // Onde saem os insumos
            $table->foreignUuid('deposito_destino_id')->constrained('wms_depositos')->cascadeOnDelete(); // Onde entra o produto final
            $table->foreignUuid('responsavel_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->bigInteger('numero_op')->nullable();
            $table->string('status', 30)->default('PLANEJADA'); // PLANEJADA, EM_PRODUCAO, CONCLUIDA, CANCELADA
            $table->decimal('quantidade_planejada', 15, 4);
            $table->decimal('quantidade_produzida', 15, 4)->default(0.0000);
            $table->decimal('custo_total_estimado', 15, 2)->default(0.00);
            $table->decimal('custo_total_real', 15, 2)->default(0.00);
            
            $table->date('data_inicio_prevista');
            $table->date('data_fim_prevista');
            $table->dateTime('data_inicio_real')->nullable();
            $table->dateTime('data_fim_real')->nullable();
            
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'produto_id']);
        });

        // 3. Tabela de Frotas / Veículos da Empresa
        Schema::create('fro_veiculos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('motorista_padrao_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('placa', 10)->index();
            $table->string('marca_modelo', 100);
            $table->integer('ano_fabricacao');
            $table->string('chassi', 30)->nullable();
            $table->string('renavam', 30)->nullable();
            $table->string('tipo_combustivel', 30)->default('FLEX');
            $table->decimal('km_atual', 10, 2)->default(0.00);
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'empresa_id', 'is_ativo']);
        });

        // 4. Tabela de Abastecimentos e Manutenções de Frotas
        Schema::create('fro_manutencoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('veiculo_id')->constrained('fro_veiculos')->cascadeOnDelete();
            $table->foreignUuid('motorista_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo_registro', 30); // ABASTECIMENTO, PREVENTIVA, CORRETIVA, TROCA_OLEO
            $table->decimal('km_registro', 10, 2);
            $table->decimal('litros_combustivel', 10, 3)->nullable();
            $table->decimal('valor_total', 15, 2);
            $table->date('data_registro')->useCurrent();
            $table->text('descricao_servico')->nullable();
            $table->timestamps();
        });

        // 5. Tabela de Bens Patrimoniais e Ferramentas com QR Code
        Schema::create('pat_bens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('responsavel_atual_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('codigo_patrimonio', 50)->index(); // Número de tombamento / Tag
            $table->string('descricao', 200);
            $table->string('marca_modelo', 100)->nullable();
            $table->string('numero_serie', 100)->nullable();
            $table->string('qr_code_hash', 100)->unique();
            $table->date('data_aquisicao')->nullable();
            $table->decimal('valor_aquisicao', 15, 2)->default(0.00);
            $table->string('status', 30)->default('DISPONIVEL'); // DISPONIVEL, EM_USO, EM_MANUTENCAO, BAIXADO
            $table->string('localizacao_fisica', 150)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pat_bens');
        Schema::dropIfExists('fro_manutencoes');
        Schema::dropIfExists('fro_veiculos');
        Schema::dropIfExists('pcp_ordens_producao');
        Schema::dropIfExists('pcp_estrutura_itens');
    }
};