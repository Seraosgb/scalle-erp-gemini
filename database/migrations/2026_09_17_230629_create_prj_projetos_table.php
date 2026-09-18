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
    Schema::create('prj_projetos', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->uuid('tenant_id')->index();
        $table->uuid('cliente_id')->nullable()->comment('Vínculo com pes_pessoas');
        $table->string('nome');
        $table->text('descricao')->nullable();
        $table->date('data_inicio')->nullable();
        $table->date('data_fim_prevista')->nullable();
        $table->decimal('orcamento_previsto', 15, 2)->nullable();
        $table->uuid('status_id')->nullable()->comment('Vínculo com sis_tabelas_dominio para status dinâmico');
        $table->timestamps();
        $table->softDeletes();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prj_projetos');
    }
};
