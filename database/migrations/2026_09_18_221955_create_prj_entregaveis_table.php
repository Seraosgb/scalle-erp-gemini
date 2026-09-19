<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('prj_entregaveis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('projeto_id');
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->date('data_prevista')->nullable();
            $table->date('data_entrega')->nullable();
            $table->decimal('valor_faturamento', 15, 2)->default(0.00);
            $table->uuid('status_id')->nullable()->comment('Ref: sis_tabelas_dominio (PRJ_STATUS_ENTREGAVEL)');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        });
    }
    public function down(): void {
        Schema::dropIfExists('prj_entregaveis');
    }
};
