<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('iot_leituras', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index(); // Para isolamento Multi-Tenant
            $table->string('device_id')->index(); // Ex: CHILLER-01
            $table->string('tipo_sensor'); // Ex: TEMPERATURA, VIBRACAO, CONTAGEM
            $table->decimal('valor', 10, 2);
            $table->timestamp('created_at')->useCurrent(); // Data exata da leitura
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iot_leituras');
    }
};
