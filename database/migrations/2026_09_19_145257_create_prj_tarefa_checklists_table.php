<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prj_tarefa_checklists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tarefa_id')->index();
            $table->string('descricao', 255);
            $table->boolean('concluido')->default(false);
            $table->timestamps();

            $table->foreign('tarefa_id')->references('id')->on('prj_tarefas')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prj_tarefa_checklists');
    }
};
