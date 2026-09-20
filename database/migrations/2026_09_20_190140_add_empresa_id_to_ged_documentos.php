<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (!Schema::hasColumn('ged_documentos', 'empresa_id')) {
                $table->uuid('empresa_id')->nullable()->index()->after('tenant_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (Schema::hasColumn('ged_documentos', 'empresa_id')) {
                $table->dropColumn('empresa_id');
            }
        });
    }
};
