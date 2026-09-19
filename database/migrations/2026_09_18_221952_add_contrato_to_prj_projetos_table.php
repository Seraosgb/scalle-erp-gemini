<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('prj_projetos', function (Blueprint $table) {
            if (!Schema::hasColumn('prj_projetos', 'contrato_id')) {
                $table->uuid('contrato_id')->nullable()->after('cliente_id');
                $table->decimal('custo_total_real', 15, 2)->default(0.00)->after('orcamento_previsto');
            }
        });
    }
    public function down(): void {
        Schema::table('prj_projetos', function (Blueprint $table) {
            $table->dropColumn(['contrato_id', 'custo_total_real']);
        });
    }
};
