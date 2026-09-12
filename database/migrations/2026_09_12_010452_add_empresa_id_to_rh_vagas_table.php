<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rh_vagas', function (Blueprint $table) {
            if (!Schema::hasColumn('rh_vagas', 'empresa_id')) {
                $table->uuid('empresa_id')->nullable()->after('tenant_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rh_vagas', function (Blueprint $table) {
            $table->dropColumn('empresa_id');
        });
    }
};
