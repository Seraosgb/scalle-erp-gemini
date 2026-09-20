<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prj_projetos', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projetos', 'status')) {
                $table->string('status', 30)->default('ATIVO')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('prj_projetos', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
