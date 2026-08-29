<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sis_faturas_billing')) {
            Schema::create('sis_faturas_billing', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('assinatura_id')->nullable()->index();
                $table->string('gateway_payment_id')->nullable()->index(); // ID da cobrança no Asaas (pay_...)
                $table->string('status', 30)->default('PENDING'); // PENDING, RECEIVED, OVERDUE, CANCELLED
                $table->decimal('valor', 12, 2)->default(0.00);
                $table->string('forma_pagamento', 30)->default('PIX');
                $table->date('data_vencimento');
                $table->timestamp('data_pagamento')->nullable();
                $table->string('url_fatura_gateway')->nullable();
                $table->json('payload_webhook')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('sis_tenants')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sis_faturas_billing');
    }
};