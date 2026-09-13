<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('rh_recrutamento_etapas')) {
            Schema::create('rh_recrutamento_etapas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('nome', 50);
                $table->string('cor', 30)->default('border-slate-500'); // Ex: border-indigo-500
                $table->integer('ordem')->default(0);
                $table->timestamps();
            });
        }

        Schema::table('rh_candidatos', function (Blueprint $table) {
            if (!Schema::hasColumn('rh_candidatos', 'etapa_id')) {
                $table->uuid('etapa_id')->nullable()->after('vaga_id');
            }
        });
    }

    public function down(): void
    {
        // Sem rollback destrutivo (Padrão Gemini)
    }
};
