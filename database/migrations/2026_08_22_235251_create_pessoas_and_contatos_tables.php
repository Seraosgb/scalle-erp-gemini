<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela Unificada de Pessoas (Clientes, Fornecedores, Técnicos, Parceiros)
        Schema::create('pes_pessoas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->string('tipo_pessoa', 2)->default('PJ'); // 'PF' ou 'PJ'
            $table->string('nome_razao_social', 200);
            $table->string('nome_fantasia_apelido', 200)->nullable();
            $table->string('cpf_cnpj', 20);
            $table->string('rg_ie', 30)->nullable();
            $table->string('inscricao_municipal', 30)->nullable();
            $table->string('email_principal')->nullable();
            $table->string('telefone_principal', 30)->nullable();
            $table->string('whatsapp', 30)->nullable();
            
            // Flags de Papel (uma pessoa pode ser cliente e fornecedor ao mesmo tempo)
            $table->boolean('is_cliente')->default(true);
            $table->boolean('is_fornecedor')->default(false);
            $table->boolean('is_tecnico')->default(false);
            $table->boolean('is_transportadora')->default(false);
            $table->boolean('is_ativo')->default(true);
            
            // Parâmetros Financeiros e Fiscais
            $table->string('regime_tributario', 50)->nullable();
            $table->decimal('limite_credito', 15, 2)->default(0.00);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'cpf_cnpj']);
            $table->index(['tenant_id', 'is_cliente', 'is_ativo']);
        });

        // 2. Tabela de Endereços Múltiplos por Pessoa (Cobrança, Entrega, Instalação)
        Schema::create('pes_enderecos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('pessoa_id')->constrained('pes_pessoas')->cascadeOnDelete();
            $table->string('tipo_endereco', 30)->default('principal'); // principal, cobranca, entrega, instalacao
            $table->string('cep', 10);
            $table->string('logradouro', 200);
            $table->string('numero', 20);
            $table->string('complemento', 100)->nullable();
            $table->string('bairro', 100);
            $table->string('cidade', 100);
            $table->string('uf', 2);
            $table->string('codigo_ibge', 10)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'pessoa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pes_enderecos');
        Schema::dropIfExists('pes_pessoas');
    }
};