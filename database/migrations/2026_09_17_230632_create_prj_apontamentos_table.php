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
    Schema::create('prj_apontamentos', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->uuid('tenant_id')->index();
        $table->uuid('tarefa_id');
        $table->uuid('usuario_id');
        $table->dateTime('inicio');
        $table->dateTime('fim')->nullable();
        $table->text('descricao')->nullable();
        $table->boolean('is_faturavel')->default(true);
        $table->timestamps();
        $table->softDeletes();

        $table->foreign('tarefa_id')->references('id')->on('prj_tarefas')->onDelete('cascade');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prj_apontamentos');
    }
};
