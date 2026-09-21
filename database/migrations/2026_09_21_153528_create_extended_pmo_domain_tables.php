<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tipos de Projetos (Ex: Manutenção Civil, Implantação de Software)
        if (!Schema::hasTable('prj_tipos_projetos')) {
            Schema::create('prj_tipos_projetos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100);
                $table->string('cor_hex', 7)->default('#3b82f6');
                $table->timestamps();
            });
        }

        // 2. Departamentos (Ex: TI, Engenharia, Financeiro)
        if (!Schema::hasTable('prj_departamentos')) {
            Schema::create('prj_departamentos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100);
                $table->timestamps();
            });
        }

        // 3. Categorias de Custo (Ex: Materiais, Terceiros, Viagens)
        if (!Schema::hasTable('prj_categorias_custos')) {
            Schema::create('prj_categorias_custos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('nome', 100);
                $table->timestamps();
            });
        }

        // 4. Injetar as amarrações nas tabelas pai (sem quebrar dados legados)
        if (Schema::hasTable('prj_projetos')) {
            Schema::table('prj_projetos', function (Blueprint $table) {
                if (!Schema::hasColumn('prj_projetos', 'tipo_projeto_id')) $table->uuid('tipo_projeto_id')->nullable()->after('status_projeto_id');
                if (!Schema::hasColumn('prj_projetos', 'departamento_id')) $table->uuid('departamento_id')->nullable()->after('tipo_projeto_id');
            });
        }

        // Assumindo que a sua tabela de custos chama prj_custos (se for outro nome, ajuste aqui)
        if (Schema::hasTable('prj_custos')) {
            Schema::table('prj_custos', function (Blueprint $table) {
                if (!Schema::hasColumn('prj_custos', 'categoria_custo_id')) $table->uuid('categoria_custo_id')->nullable()->after('valor');
            });
        }
    }

    public function down(): void
    {
        // Rollbacks seguros
        if (Schema::hasTable('prj_projetos')) {
            Schema::table('prj_projetos', function (Blueprint $table) {
                if (Schema::hasColumn('prj_projetos', 'tipo_projeto_id')) $table->dropColumn('tipo_projeto_id');
                if (Schema::hasColumn('prj_projetos', 'departamento_id')) $table->dropColumn('departamento_id');
            });
        }
        if (Schema::hasTable('prj_custos')) {
            Schema::table('prj_custos', function (Blueprint $table) {
                if (Schema::hasColumn('prj_custos', 'categoria_custo_id')) $table->dropColumn('categoria_custo_id');
            });
        }
        Schema::dropIfExists('prj_categorias_custos');
        Schema::dropIfExists('prj_departamentos');
        Schema::dropIfExists('prj_tipos_projetos');
    }
};
