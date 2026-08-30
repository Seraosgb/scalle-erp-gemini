<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sis_auditoria_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('sis_auditoria_logs', 'tabela_entidade')) {
                $table->string('tabela_entidade', 100)->nullable();
            }
            if (!Schema::hasColumn('sis_auditoria_logs', 'valores_anteriores')) {
                $table->jsonb('valores_anteriores')->nullable();
            }
            if (!Schema::hasColumn('sis_auditoria_logs', 'valores_novos')) {
                $table->jsonb('valores_novos')->nullable();
            }
            if (!Schema::hasColumn('sis_auditoria_logs', 'ip')) {
                $table->string('ip', 45)->nullable();
            }
            if (!Schema::hasColumn('sis_auditoria_logs', 'user_agent')) {
                $table->text('user_agent')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sis_auditoria_logs', function (Blueprint $table) {
            $cols = ['tabela_entidade', 'valores_anteriores', 'valores_novos', 'ip', 'user_agent'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('sis_auditoria_logs', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};