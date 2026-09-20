<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Equipe
        Schema::table('prj_projeto_equipe', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_equipe', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->index();
            }
        });

        // 2. Custos
        Schema::table('prj_projeto_custos', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_custos', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->index();
            }
        });

        // 3. Entregáveis
        Schema::table('prj_projeto_entregaveis', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projeto_entregaveis', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('prj_projeto_equipe', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
        Schema::table('prj_projeto_custos', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
        Schema::table('prj_projeto_entregaveis', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
    }
};
