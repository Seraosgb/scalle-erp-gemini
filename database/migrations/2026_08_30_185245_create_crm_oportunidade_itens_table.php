<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('crm_oportunidade_itens')) {
            Schema::create('crm_oportunidade_itens', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('oportunidade_id')->index();
                $table->uuid('produto_id')->nullable()->index();
                $table->string('descricao');
                $table->decimal('quantidade', 15, 4)->default(1);
                $table->decimal('valor_unitario', 15, 4)->default(0);
                $table->decimal('valor_total', 15, 4)->default(0);
                $table->timestamps();

                $table->foreign('oportunidade_id')->references('id')->on('crm_oportunidades')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_oportunidade_itens');
    }
};