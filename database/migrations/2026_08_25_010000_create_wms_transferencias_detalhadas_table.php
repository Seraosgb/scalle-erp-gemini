<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('wms_transferencias')) {
            Schema::create('wms_transferencias', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->index();
                $table->uuid('deposito_origem_id')->index();
                $table->uuid('deposito_destino_id')->index();
                $table->uuid('item_id')->index();
                $table->uuid('solicitante_id')->index();
                $table->uuid('recebedor_id')->nullable();
                $table->decimal('quantidade_enviada', 12, 4);
                $table->decimal('quantidade_recebida', 12, 4)->nullable();
                $table->string('lote', 50)->nullable();
                $table->string('modalidade', 30)->default('EM_TRANSITO'); // DIRETO, EM_TRANSITO
                $table->string('status', 30)->default('EM_TRANSITO'); // EM_TRANSITO, CONCLUIDA, CANCELADA, DIVERGENCIA
                $table->text('observacoes')->nullable();
                $table->text('motivo_divergencia')->nullable();
                $table->dateTime('data_envio');
                $table->dateTime('data_recebimento')->nullable();
                $table->timestamps();

                $table->foreign('deposito_origem_id')->references('id')->on('wms_depositos')->onDelete('cascade');
                $table->foreign('deposito_destino_id')->references('id')->on('wms_depositos')->onDelete('cascade');
                $table->foreign('item_id')->references('id')->on('pro_itens')->onDelete('cascade');
                $table->foreign('solicitante_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('recebedor_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wms_transferencias');
    }
};
