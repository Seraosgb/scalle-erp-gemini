<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Migração 100% aditiva e segura: só cria se não existir.
        if (!Schema::hasTable('rh_vagas')) {
            Schema::create('rh_vagas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('titulo', 150);
                $table->string('departamento', 100);
                $table->string('status', 30)->default('ABERTA');
                $table->text('descricao')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('rh_candidatos')) {
            Schema::create('rh_candidatos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('vaga_id');
                $table->string('nome', 150);
                $table->string('email', 150)->nullable();
                $table->string('telefone', 30)->nullable();
                $table->string('etapa_kanban', 50)->default('NOVO');
                $table->text('observacoes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('vaga_id')->references('id')->on('rh_vagas')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
    }
};
