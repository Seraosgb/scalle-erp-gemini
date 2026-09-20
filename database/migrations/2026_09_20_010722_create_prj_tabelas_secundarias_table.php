<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prj_projeto_equipe', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('projeto_id')->index();
            $table->uuid('usuario_id')->index();
            $table->decimal('custo_hora', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
            $table->foreign('usuario_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('prj_projeto_custos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('projeto_id')->index();
            $table->string('descricao', 255);
            $table->decimal('valor', 15, 2);
            $table->date('data_custo');
            $table->timestamps();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        });

        Schema::create('prj_projeto_entregaveis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('projeto_id')->index();
            $table->string('titulo', 255);
            $table->decimal('valor_faturamento', 15, 2);
            $table->date('data_prevista')->nullable();
            $table->string('status', 50)->default('PENDENTE');
            $table->timestamps();

            $table->foreign('projeto_id')->references('id')->on('prj_projetos')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prj_projeto_entregaveis');
        Schema::dropIfExists('prj_projeto_custos');
        Schema::dropIfExists('prj_projeto_equipe');
    }
};
