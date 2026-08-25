<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pat_bens')) {
            // Executa o comando nativo do PostgreSQL para remover a restrição NOT NULL
            DB::statement('ALTER TABLE pat_bens ALTER COLUMN valor_aquisicao DROP NOT NULL;');
            DB::statement('ALTER TABLE pat_bens ALTER COLUMN valor_aquisicao SET DEFAULT 0.00;');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pat_bens')) {
            DB::statement('ALTER TABLE pat_bens ALTER COLUMN valor_aquisicao SET NOT NULL;');
        }
    }
};