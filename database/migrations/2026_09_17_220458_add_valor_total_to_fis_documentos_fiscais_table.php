<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            if (!Schema::hasColumn('fis_documentos_fiscais', 'valor_total')) {
                $table->decimal('valor_total', 15, 2)->nullable()->after('data_emissao');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            if (Schema::hasColumn('fis_documentos_fiscais', 'valor_total')) {
                $table->dropColumn('valor_total');
            }
        });
    }
};
