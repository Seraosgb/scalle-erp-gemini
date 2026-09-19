<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ged_pastas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('empresa_id')->nullable()->index();
            $table->uuid('pasta_pai_id')->nullable()->index();
            $table->string('nome', 150);
            $table->string('cor_hex', 10)->nullable();
            $table->boolean('is_sistema')->default(false); // Ex: Pasta nativa "Notas Fiscais"
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('sis_tenants')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ged_pastas');
    }
};
