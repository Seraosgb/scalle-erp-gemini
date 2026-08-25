<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pat_bens') && Schema::hasColumn('pat_bens', 'valor_aquisicao')) {
            Schema::table('pat_bens', function (Blueprint $table) {
                $table->decimal('valor_aquisicao', 12, 2)->default(0.00)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pat_bens') && Schema::hasColumn('pat_bens', 'valor_aquisicao')) {
            Schema::table('pat_bens', function (Blueprint $table) {
                $table->decimal('valor_aquisicao', 12, 2)->nullable(false)->change();
            });
        }
    }
};