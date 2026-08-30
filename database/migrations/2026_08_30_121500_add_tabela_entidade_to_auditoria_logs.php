<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sis_auditoria_logs', function (Blueprint $table) {
            // Adiciona a coluna de forma segura apenas se ela não existir
            if (!Schema::hasColumn('sis_auditoria_logs', 'tabela_entidade')) {
                $table->string('tabela_entidade', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sis_auditoria_logs', function (Blueprint $table) {
            if (Schema::hasColumn('sis_auditoria_logs', 'tabela_entidade')) {
                $table->dropColumn('tabela_entidade');
            }
        });
    }
};