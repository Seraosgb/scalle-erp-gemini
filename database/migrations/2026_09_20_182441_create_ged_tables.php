<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ged_pastas')) {
            Schema::create('ged_pastas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->nullable()->index();
                $table->uuid('pasta_pai_id')->nullable()->index();
                $table->string('nome', 150);
                $table->boolean('is_sistema')->default(false);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('ged_documentos')) {
            Schema::create('ged_documentos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->nullable()->index();
                $table->uuid('pasta_id')->nullable()->index();
                $table->string('entidade_vinculada_type')->nullable()->index();
                $table->uuid('entidade_vinculada_id')->nullable()->index();
                $table->string('nome_original', 255);
                $table->string('caminho_s3', 500);
                $table->string('mime_type', 100);
                $table->unsignedBigInteger('tamanho_bytes');
                $table->uuid('usuario_upload_id')->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ged_documentos');
        Schema::dropIfExists('ged_pastas');
    }
};
