<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (!Schema::hasColumn('ged_documentos', 'mime_type')) {
                $table->string('mime_type', 100)->nullable()->after('caminho_s3');
            }
            if (!Schema::hasColumn('ged_documentos', 'tamanho_bytes')) {
                $table->unsignedBigInteger('tamanho_bytes')->default(0)->after('mime_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ged_documentos', function (Blueprint $table) {
            if (Schema::hasColumn('ged_documentos', 'mime_type')) {
                $table->dropColumn('mime_type');
            }
            if (Schema::hasColumn('ged_documentos', 'tamanho_bytes')) {
                $table->dropColumn('tamanho_bytes');
            }
        });
    }
};
