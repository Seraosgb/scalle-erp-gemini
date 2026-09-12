<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rh_vagas', function (Blueprint $table) {
            if (!Schema::hasColumn('rh_vagas', 'descricao')) {
                $table->text('descricao')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rh_vagas', function (Blueprint $table) {
            if (Schema::hasColumn('rh_vagas', 'descricao')) {
                $table->dropColumn('descricao');
            }
        });
    }
};
