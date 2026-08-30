<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sis_auditoria_logs', function (Blueprint $table) {
            if (Schema::hasColumn('sis_auditoria_logs', 'modulo')) {
                $table->string('modulo', 50)->nullable()->change();
            }
            if (Schema::hasColumn('sis_auditoria_logs', 'usuario_id')) {
                $table->uuid('usuario_id')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        // Preserva compatibilidade
    }
};