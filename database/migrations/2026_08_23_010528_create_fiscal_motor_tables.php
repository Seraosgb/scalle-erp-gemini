<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Regras e Matriz Tributária por Operação
        Schema::create('fis_regras_tributarias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->string('descricao', 100);
            $table->string('cfop', 10);
            $table->string('uf_destino', 2)->nullable(); // Se nulo, aplica para todas as UFs
            
            // Regimes Vigentes
            $table->string('cst_csosn_icms', 10)->nullable();
            $table->decimal('aliquota_icms', 5, 2)->default(0.00);
            $table->string('cst_pis', 10)->nullable();
            $table->decimal('aliquota_pis', 5, 2)->default(0.00);
            $table->string('cst_cofins', 10)->nullable();
            $table->decimal('aliquota_cofins', 5, 2)->default(0.00);
            $table->decimal('aliquota_issqn', 5, 2)->default(0.00);
            
            // Suporte Nativo à Reforma Tributária (IBS / CBS)
            $table->string('cst_ibs_cbs', 10)->nullable();
            $table->decimal('aliquota_ibs', 5, 2)->default(0.00);
            $table->decimal('aliquota_cbs', 5, 2)->default(0.00);
            
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'cfop', 'uf_destino']);
        });

        // 2. Tabela Principal de Documentos Fiscais Emitidos (NF-e, NFC-e, NFS-e)
        Schema::create('fis_documentos_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('destinatario_id')->constrained('pes_pessoas')->cascadeOnDelete();
            
            // Origem do Documento Fiscal (Vendas, Compras, OS)
            $table->string('origem_tipo', 50)->nullable();
            $table->uuid('origem_id')->nullable();
            
            // Dados de Identificação SEFAZ / Prefeitura
            $table->string('modelo_documento', 10)->default('55'); // 55 = NF-e, 65 = NFC-e, NFS-e = Servico
            $table->integer('serie')->default(1);
            $table->bigInteger('numero_documento');
            $table->string('chave_acesso', 44)->nullable()->unique();
            $table->string('ambiente', 20)->default('HOMOLOGACAO'); // HOMOLOGACAO, PRODUCAO
            $table->string('status', 30)->default('PENDENTE'); // PENDENTE, TRANSMITINDO, AUTORIZADO, REJEITADO, CANCELADO, CONTINGENCIA
            
            // Protocolos e Retornos Oficiais
            $table->string('protocolo_autorizacao', 60)->nullable();
            $table->string('codigo_status_sefaz', 10)->nullable(); // Ex: 100 = Autorizado, 135 = Cancelado
            $table->text('motivo_status_sefaz')->nullable();
            
            // Valores Fiscais Consolidados
            $table->decimal('valor_total_produtos', 15, 2)->default(0.00);
            $table->decimal('valor_total_servicos', 15, 2)->default(0.00);
            $table->decimal('valor_total_documento', 15, 2)->default(0.00);
            $table->decimal('valor_icms', 15, 2)->default(0.00);
            $table->decimal('valor_pis', 15, 2)->default(0.00);
            $table->decimal('valor_cofins', 15, 2)->default(0.00);
            $table->decimal('valor_issqn', 15, 2)->default(0.00);
            $table->decimal('valor_ibs', 15, 2)->default(0.00);
            $table->decimal('valor_cbs', 15, 2)->default(0.00);
            
            // Armazenamento de Arquivos
            $table->text('xml_assinado')->nullable();
            $table->text('xml_protocolado')->nullable();
            $table->string('url_danfe_pdf', 500)->nullable();
            
            $table->dateTime('data_emissao')->useCurrent();
            $table->dateTime('data_autorizacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'modelo_documento', 'status', 'data_emissao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fis_documentos_fiscais');
        Schema::dropIfExists('fis_regras_tributarias');
    }
};