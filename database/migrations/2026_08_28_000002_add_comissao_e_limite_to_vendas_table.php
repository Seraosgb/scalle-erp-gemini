<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ven_pedidos', function (Blueprint $table) {
            if (!Schema::hasColumn('ven_pedidos', 'valor_comissao_vendedor')) {
                $table->decimal('valor_comissao_vendedor', 10, 2)->default(0.00)->after('valor_total_liquido');
            }
            if (!Schema::hasColumn('ven_pedidos', 'percentual_comissao_vendedor')) {
                $table->decimal('percentual_comissao_vendedor', 5, 2)->default(0.00)->after('valor_comissao_vendedor');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ven_pedidos', function (Blueprint $table) {
            $table->dropColumn(['valor_comissao_vendedor', 'percentual_comissao_vendedor']);
        });
    }
};