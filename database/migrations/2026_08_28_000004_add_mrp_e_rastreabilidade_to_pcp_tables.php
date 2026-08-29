<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Campos adicionais na Ordem de Produção
        Schema::table('pcp_ordens_producao', function (Blueprint $table) {
            if (!Schema::hasColumn('pcp_ordens_producao', 'lote_produzido')) {
                $table->string('lote_produzido', 50)->nullable()->after('quantidade_produzida');
            }
            if (!Schema::hasColumn('pcp_ordens_producao', 'data_validade_lote')) {
                $table->date('data_validade_lote')->nullable()->after('lote_produzido');
            }
            if (!Schema::hasColumn('pcp_ordens_producao', 'oee_percentual')) {
                $table->decimal('oee_percentual', 5, 2)->default(0.00)->after('custo_total_real');
            }
        });

        // 2. Tabela de Genealogia de Lotes (Rastreabilidade Bidirecional Insumo -> Acabado)
        if (!Schema::hasTable('pcp_lotes_rastreabilidade')) {
            Schema::create('pcp_lotes_rastreabilidade', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('ordem_producao_id')->index();
                $table->uuid('insumo_id')->index();
                $table->string('lote_insumo', 50)->nullable();
                $table->decimal('quantidade_consumida', 12, 4);
                $table->string('lote_acabado_gerado', 50);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pcp_lotes_rastreabilidade');
        Schema::table('pcp_ordens_producao', function (Blueprint $table) {
            $table->dropColumn(['lote_produzido', 'data_validade_lote', 'oee_percentual']);
        });
    }
};