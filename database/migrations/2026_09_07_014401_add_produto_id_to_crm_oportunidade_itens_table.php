<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('crm_oportunidade_itens')
            && !Schema::hasColumn('crm_oportunidade_itens', 'produto_id')) {

            Schema::table('crm_oportunidade_itens', function (Blueprint $table) {
                $table->uuid('produto_id')
                    ->nullable()
                    ->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('crm_oportunidade_itens')
            && Schema::hasColumn('crm_oportunidade_itens', 'produto_id')) {

            Schema::table('crm_oportunidade_itens', function (Blueprint $table) {
                $table->dropColumn('produto_id');
            });
        }
    }
};
