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
                $table->uuid('parent_id')->nullable();
                $table->string('nome', 150);
                $table->string('cor_hex', 10)->default('#4f46e5');
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
                $table->uuid('usuario_id')->index();

                $table->string('nome_original', 255);
                $table->string('caminho_storage', 500);
                $table->string('extensao', 10);
                $table->string('tipo_mime', 100);
                $table->unsignedBigInteger('tamanho_bytes');
                $table->string('hash_sha256', 64)->nullable(); // Integridade e Antifraude

                // Vínculos Polimórficos Dinâmicos (Para linkar com OS, Projetos, Clientes)
                $table->string('entidade_type', 150)->nullable();
                $table->uuid('entidade_id')->nullable();

                $table->boolean('is_sigiloso')->default(false); // LGPD
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
