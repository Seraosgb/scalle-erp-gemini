<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_funis', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_funis', 'cor_hex')) {
                $table->string('cor_hex', 10)->default('#4f46e5');
            }
            if (!Schema::hasColumn('crm_funis', 'descricao')) {
                $table->string('descricao', 255)->nullable();
            }
        });

        Schema::table('crm_funil_etapas', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_funil_etapas', 'probabilidade_fechamento')) {
                $table->integer('probabilidade_fechamento')->default(20);
            }
        });
    }

    public function down(): void
    {
        // Preserva retrocompatibilidade
    }
};