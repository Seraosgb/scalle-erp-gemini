<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('crm_funis')) {
            Schema::create('crm_funis', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 150);
                $table->string('descricao', 255)->nullable();
                $table->string('token_captacao', 100)->unique()->nullable()->comment('Token para o Webhook de Landing Pages');
                $table->boolean('is_padrao')->default(false);
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('crm_funil_etapas')) {
            Schema::create('crm_funil_etapas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('funil_id')->index();
                $table->string('nome', 100);
                $table->string('cor_hex', 10)->default('#e2e8f0');
                $table->integer('ordem_exibicao')->default(1);
                $table->boolean('exige_justificativa_perda')->default(false);
                $table->timestamps();

                $table->foreign('funil_id')->references('id')->on('crm_funis')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('crm_oportunidades')) {
            Schema::create('crm_oportunidades', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('funil_id')->index();
                $table->uuid('etapa_id')->index();
                $table->uuid('vendedor_id')->nullable()->index();
                $table->uuid('cliente_id')->nullable()->index(); // Se já for um cliente da base
                $table->string('titulo', 200);
                $table->string('nome_contato', 150);
                $table->string('email_contato', 150)->nullable();
                $table->string('telefone_contato', 30)->nullable();
                $table->decimal('valor_estimado', 12, 2)->default(0.00);
                $table->date('data_fechamento_esperada')->nullable();
                $table->string('status', 30)->default('ABERTO'); // ABERTO, GANHO, PERDIDO
                $table->text('observacoes')->nullable();
                $table->string('origem_lead', 100)->default('MANUAL'); // MANUAL, API, FACEBOOK, RD_STATION
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('funil_id')->references('id')->on('crm_funis')->onDelete('cascade');
                $table->foreign('etapa_id')->references('id')->on('crm_funil_etapas')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_oportunidades');
        Schema::dropIfExists('crm_funil_etapas');
        Schema::dropIfExists('crm_funis');
    }
};