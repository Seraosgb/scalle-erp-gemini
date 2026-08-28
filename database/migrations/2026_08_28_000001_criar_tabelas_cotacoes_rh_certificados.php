<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Cotações de Compras
        Schema::create('cmp_cotacoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->uuid('solicitante_id')->nullable();
            $table->uuid('deposito_destino_id');
            $table->string('titulo', 150);
            $table->string('status', 30)->default('ABERTA'); // ABERTA, CONCLUIDA, CANCELADA
            $table->date('data_limite_resposta')->nullable();
            $table->uuid('fornecedor_vencedor_id')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cmp_cotacao_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cotacao_id')->index();
            $table->uuid('item_id');
            $table->decimal('quantidade', 12, 4);
            $table->timestamps();
        });

        Schema::create('cmp_cotacao_propostas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cotacao_id')->index();
            $table->uuid('fornecedor_id');
            $table->decimal('valor_total', 14, 2);
            $table->decimal('valor_frete', 14, 2)->default(0.00);
            $table->integer('prazo_entrega_dias')->default(1);
            $table->string('condicoes_pagamento', 100)->nullable();
            $table->boolean('is_vencedora')->default(false);
            $table->text('observacoes')->nullable();
            $table->timestamps();
        });

        Schema::create('cmp_cotacao_proposta_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('proposta_id')->index();
            $table->uuid('cotacao_item_id');
            $table->decimal('valor_unitario', 12, 4);
            $table->decimal('valor_total', 14, 2);
            $table->timestamps();
        });

        // 2. RH: Retificação de Ponto e Férias/Rescisões
        Schema::create('rh_ponto_retificacoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('ponto_registro_id')->index();
            $table->uuid('autor_id');
            $table->dateTime('data_hora_original');
            $table->dateTime('data_hora_retificada');
            $table->text('justificativa');
            $table->string('hash_retificacao', 64);
            $table->timestamps();
        });

        Schema::create('rh_ferias_rescisoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('colaborador_id')->index();
            $table->string('tipo', 30); // FERIAS, RESCISAO
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->decimal('valor_proventos', 14, 2)->default(0.00);
            $table->decimal('valor_descontos', 14, 2)->default(0.00);
            $table->decimal('valor_liquido', 14, 2)->default(0.00);
            $table->string('status', 30)->default('APROVADO');
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Certificados Digitais A1 Isolados por Tenant/Empresa
        Schema::create('fis_certificados_a1', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->string('nome_arquivo_original', 150);
            $table->text('arquivo_binario_criptografado');
            $table->text('senha_criptografada');
            $table->string('cnpj_certificado', 20)->nullable();
            $table->string('razao_social_certificado', 200)->nullable();
            $table->dateTime('valido_de')->nullable();
            $table->dateTime('valido_ate')->nullable();
            $table->string('ambiente_emissao', 20)->default('HOMOLOGACAO'); // HOMOLOGACAO, PRODUCAO
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fis_certificados_a1');
        Schema::dropIfExists('rh_ferias_rescisoes');
        Schema::dropIfExists('rh_ponto_retificacoes');
        Schema::dropIfExists('cmp_cotacao_proposta_itens');
        Schema::dropIfExists('cmp_cotacao_propostas');
        Schema::dropIfExists('cmp_cotacao_itens');
        Schema::dropIfExists('cmp_cotacoes');
    }
};