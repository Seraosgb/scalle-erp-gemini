<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('prj_projeto_equipe', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('projeto_id');
            $table->uuid('usuario_id');
            $table->uuid('papel_id')->nullable()->comment('Ref: sis_tabelas_dominio (PRJ_PAPEL_EQUIPE)');
            $table->decimal('custo_hora', 10, 2)->default(0.00);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        });
    }
    public function down(): void {
        Schema::dropIfExists('prj_projeto_equipe');
    }
};
