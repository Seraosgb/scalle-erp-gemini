<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            if (!Schema::hasColumn('fis_documentos_fiscais', 'serie_documento')) {
                $table->string('serie_documento', 10)->nullable()->after('modelo_documento');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            if (Schema::hasColumn('fis_documentos_fiscais', 'serie_documento')) {
                $table->dropColumn('serie_documento');
            }
        });
    }
};
