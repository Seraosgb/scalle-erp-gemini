<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rh_colaboradores', function (Blueprint $table) {
            // Torna a coluna opcional (nullable) para aceitar envios vazios do frontend
            $table->string('departamento', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('rh_colaboradores', function (Blueprint $table) {
            $table->string('departamento', 100)->nullable(false)->change();
        });
    }
};
