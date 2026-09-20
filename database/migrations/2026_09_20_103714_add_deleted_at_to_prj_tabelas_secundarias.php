<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prj_projeto_equipe', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_equipe', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('prj_projeto_custos', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_custos', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('prj_projeto_entregaveis', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_entregaveis', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('prj_projeto_equipe', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('prj_projeto_custos', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('prj_projeto_entregaveis', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
