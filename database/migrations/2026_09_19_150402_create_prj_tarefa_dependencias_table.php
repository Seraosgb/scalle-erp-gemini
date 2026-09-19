<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prj_tarefa_dependencias', function (Blueprint $table) {
            $table->uuid('tarefa_id')->index(); // Tarefa que está bloqueada
            $table->uuid('depende_de_id')->index(); // Tarefa que precisa ser concluída primeiro

            $table->foreign('tarefa_id')->references('id')->on('prj_tarefas')->onDelete('cascade');
            $table->foreign('depende_de_id')->references('id')->on('prj_tarefas')->onDelete('cascade');

            $table->primary(['tarefa_id', 'depende_de_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prj_tarefa_dependencias');
    }
};
