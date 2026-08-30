<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sis_auditoria_logs')) {
            if (Schema::hasColumn('sis_auditoria_logs', 'entidade')) {
                DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN entidade DROP NOT NULL;');
            }
        }
    }

    public function down(): void
    {
        // Operação não destrutiva para manter compatibilidade
    }
};