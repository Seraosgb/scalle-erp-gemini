<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        // Substitua 'sis_empresas' pelo nome exato que está no seu Model
        Schema::table('sis_empresas', function (Blueprint $table) {
            $table->string('csc_id', 10)->nullable()->after('inscricao_estadual');
            $table->string('csc_token', 100)->nullable()->after('csc_id');
        });
    }

    public function down()
    {
        Schema::table('sis_empresas', function (Blueprint $table) {
            $table->dropColumn(['csc_id', 'csc_token']);
        });
    }
};
