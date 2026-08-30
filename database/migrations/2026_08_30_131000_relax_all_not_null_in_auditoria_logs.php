<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sis_auditoria_logs')) {
            // Remove as travas NOT NULL de colunas secundárias de auditoria
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN modulo DROP NOT NULL;');
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN usuario_id DROP NOT NULL;');
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN registro_id DROP NOT NULL;');
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN acao DROP NOT NULL;');
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN ip DROP NOT NULL;');
            DB::statement('ALTER TABLE sis_auditoria_logs ALTER COLUMN user_agent DROP NOT NULL;');
        }
    }

    public function down(): void
    {
        // Operação não destrutiva para preservar retrocompatibilidade
    }
};