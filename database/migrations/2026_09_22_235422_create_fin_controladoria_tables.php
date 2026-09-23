<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Plano de Contas (Natureza da despesa/receita)
        if (!Schema::hasTable('fin_planos_contas')) {
            Schema::create('fin_planos_contas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('parent_id')->nullable()->comment('ID da conta pai para hierarquia');
                $table->string('codigo', 50)->comment('Ex: 1.01.001');
                $table->string('nome', 150);
                $table->string('tipo', 50)->comment('RECEITA, DESPESA, ATIVO, PASSIVO');
                $table->boolean('is_sintetico')->default(false)->comment('True = Apenas agrupadora, False = Aceita lançamentos');
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });

            // FK adicionada num bloco separado para garantir que a tabela já existe no PostgreSQL
            Schema::table('fin_planos_contas', function (Blueprint $table) {
                $table->foreign('parent_id')->references('id')->on('fin_planos_contas')->onDelete('cascade');
            });
        }

        // 2. Centros de Custo (Local/Departamento do gasto)
        if (!Schema::hasTable('fin_centros_custos')) {
            Schema::create('fin_centros_custos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('parent_id')->nullable();
                $table->string('codigo', 50)->comment('Ex: 01.01');
                $table->string('nome', 150);
                $table->boolean('is_sintetico')->default(false);
                $table->boolean('is_ativo')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });

            // FK adicionada num bloco separado
            Schema::table('fin_centros_custos', function (Blueprint $table) {
                $table->foreign('parent_id')->references('id')->on('fin_centros_custos')->onDelete('cascade');
            });
        }

        // 3. Amarrar aos Títulos Financeiros existentes de forma retrocompatível
        if (Schema::hasTable('fin_titulos_financeiros')) {
            Schema::table('fin_titulos_financeiros', function (Blueprint $table) {
                if (!Schema::hasColumn('fin_titulos_financeiros', 'plano_conta_id')) {
                    $table->uuid('plano_conta_id')->nullable()->after('status');
                }
                if (!Schema::hasColumn('fin_titulos_financeiros', 'centro_custo_id')) {
                    $table->uuid('centro_custo_id')->nullable()->after('plano_conta_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('fin_titulos_financeiros')) {
            Schema::table('fin_titulos_financeiros', function (Blueprint $table) {
                if (Schema::hasColumn('fin_titulos_financeiros', 'plano_conta_id')) $table->dropColumn('plano_conta_id');
                if (Schema::hasColumn('fin_titulos_financeiros', 'centro_custo_id')) $table->dropColumn('centro_custo_id');
            });
        }
        Schema::dropIfExists('fin_centros_custos');
        Schema::dropIfExists('fin_planos_contas');
    }
};
