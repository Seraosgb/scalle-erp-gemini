<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (!Schema::hasColumn('ged_documentos', 'usuario_upload_id')) {
                $table->uuid('usuario_upload_id')->nullable()->index()->after('tamanho_bytes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (Schema::hasColumn('ged_documentos', 'usuario_upload_id')) {
                $table->dropColumn('usuario_upload_id');
            }
        });
    }
};
