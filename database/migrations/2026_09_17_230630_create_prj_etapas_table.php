<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('prj_etapas', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->uuid('tenant_id')->index();
        $table->uuid('projeto_id');
        $table->string('nome'); // Ex: Backlog, Em Andamento, Impedimento
        $table->integer('ordem')->default(0);
        $table->string('cor_hex', 7)->default('#3b82f6');
        $table->timestamps();
        $table->softDeletes();

        $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prj_etapas');
    }
};
