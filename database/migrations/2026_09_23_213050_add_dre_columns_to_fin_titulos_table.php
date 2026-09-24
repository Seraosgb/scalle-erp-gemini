<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fin_titulos', function (Blueprint $table) {
            // Adiciona as colunas permitindo nulo (pois títulos antigos já registados não têm DRE)
            if (!Schema::hasColumn('fin_titulos', 'plano_conta_id')) {
                $table->uuid('plano_conta_id')->nullable();
            }
            if (!Schema::hasColumn('fin_titulos', 'centro_custo_id')) {
                $table->uuid('centro_custo_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('fin_titulos', function (Blueprint $table) {
            $table->dropColumn(['plano_conta_id', 'centro_custo_id']);
        });
    }
};
