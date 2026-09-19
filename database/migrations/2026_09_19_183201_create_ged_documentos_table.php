<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ged_documentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('pasta_id')->nullable()->index();
            $table->uuid('usuario_id')->index();
            $table->string('nome_original');
            $table->string('caminho_s3');
            $table->string('extensao', 10);
            $table->bigInteger('tamanho_bytes');
            $table->string('hash_arquivo')->nullable();

            // Relacionamento Polimórfico (Onde a mágica acontece com o Kanban e OS)
            $table->uuid('entidade_vinculada_id')->nullable()->index();
            $table->string('entidade_vinculada_type')->nullable()->index();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('sis_tenants')->onDelete('cascade');
            $table->foreign('usuario_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('pasta_id')->references('id')->on('ged_pastas')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ged_documentos');
    }
};
