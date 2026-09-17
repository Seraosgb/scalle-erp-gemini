<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fis_documentos_fiscais_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('documento_fiscal_id')->index();
            $table->string('tipo_item', 20); // Ex: PRODUTO, SERVICO
            $table->string('cfop', 10);
            $table->decimal('valor_total', 15, 2);
            $table->timestamps();

            // Integridade referencial: Se a nota for excluída, os itens vão junto
            $table->foreign('documento_fiscal_id')
                  ->references('id')
                  ->on('fis_documentos_fiscais')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fis_documentos_fiscais_itens');
    }
};
