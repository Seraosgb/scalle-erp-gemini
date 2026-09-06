<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pro_item_parametros_empresa', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->index();
            $table->uuid('item_id')->index();

            $table->decimal('preco_venda_customizado', 12, 4)->nullable();
            $table->decimal('estoque_minimo_local', 12, 4)->default(0.0000);
            $table->string('cfop_padrao_local', 10)->nullable();
            $table->string('cst_icms_local', 10)->nullable();
            $table->decimal('aliquota_icms_local', 5, 2)->nullable();

            $table->boolean('is_ativo_nesta_empresa')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'item_id'], 'uk_item_empresa_param');
            $table->foreign('tenant_id')->references('id')->on('sis_tenants')->cascadeOnDelete();
            $table->foreign('empresa_id')->references('id')->on('sis_empresas')->cascadeOnDelete();
            $table->foreign('item_id')->references('id')->on('pro_itens')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pro_item_parametros_empresa');
    }
};
