<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('prj_custos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('projeto_id');
            $table->uuid('tipo_custo_id')->nullable()->comment('Ref: sis_tabelas_dominio (PRJ_TIPO_CUSTO)');
            $table->decimal('valor', 15, 2);
            $table->date('data_custo');
            $table->text('descricao')->nullable();
            $table->uuid('apontamento_id')->nullable()->comment('Vínculo se o custo for horas do Timesheet');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        });
    }
    public function down(): void {
        Schema::dropIfExists('prj_custos');
    }
};
