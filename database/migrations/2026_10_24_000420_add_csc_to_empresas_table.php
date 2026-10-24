<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Só tenta adicionar as colunas se elas AINDA NÃO existirem
        if (!Schema::hasColumn('sis_empresas', 'csc_id')) {
            Schema::table('sis_empresas', function (Blueprint $table) {
                $table->string('csc_id', 10)->nullable()->after('inscricao_estadual');
                $table->string('csc_token', 100)->nullable()->after('csc_id');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('sis_empresas', 'csc_id')) {
            Schema::table('sis_empresas', function (Blueprint $table) {
                $table->dropColumn(['csc_id', 'csc_token']);
            });
        }
    }
};
