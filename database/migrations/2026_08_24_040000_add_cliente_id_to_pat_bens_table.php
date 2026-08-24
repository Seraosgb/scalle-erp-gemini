<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pat_bens') && !Schema::hasColumn('pat_bens', 'cliente_id')) {
            Schema::table('pat_bens', function (Blueprint $table) {
                $table->foreignUuid('cliente_id')->nullable()->after('empresa_id')->constrained('pes_pessoas')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pat_bens') && Schema::hasColumn('pat_bens', 'cliente_id')) {
            Schema::table('pat_bens', function (Blueprint $table) {
                $table->dropForeign(['cliente_id']);
                $table->dropColumn('cliente_id');
            });
        }
    }
};