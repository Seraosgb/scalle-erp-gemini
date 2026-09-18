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
    Schema::create('prj_tarefas', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->uuid('tenant_id')->index();
        $table->uuid('projeto_id');
        $table->uuid('etapa_id');
        $table->uuid('responsavel_id')->nullable()->comment('Vínculo com usuarios');
        $table->string('titulo');
        $table->text('descricao')->nullable();
        $table->dateTime('data_vencimento')->nullable();
        $table->integer('prioridade')->default(1)->comment('1-Baixa, 2-Media, 3-Alta');
        $table->timestamps();
        $table->softDeletes();

        $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        $table->foreign('etapa_id')->references('id')->on('prj_etapas');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prj_tarefas');
    }
};
