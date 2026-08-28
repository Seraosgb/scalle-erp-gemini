<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wms_numeros_serie', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('item_id');
            $table->uuid('deposito_id');
            $table->string('numero_serie', 100);
            $table->string('status', 30)->default('DISPONIVEL'); // DISPONIVEL, RESERVADO, VENDIDO, BAIXADO
            $table->uuid('origem_entrada_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'item_id', 'numero_serie']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wms_numeros_serie');
    }
};