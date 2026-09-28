<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            // Colunas cruciais para o motor NFePHP que faltavam na tabela original
            if (!Schema::hasColumn('fis_documentos_fiscais', 'xml_conteudo')) {
                $table->text('xml_conteudo')->nullable();
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'mensagem_sefaz')) {
                $table->text('mensagem_sefaz')->nullable();
            }

            // Garantir que as colunas de valor e status existem e estão corretas
            if (!Schema::hasColumn('fis_documentos_fiscais', 'status')) {
                $table->string('status', 50)->default('PROCESSANDO');
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'chave_acesso')) {
                $table->string('chave_acesso', 50)->nullable();
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'valor_total')) {
                $table->decimal('valor_total', 15, 2)->default(0.00);
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'data_emissao')) {
                $table->dateTime('data_emissao')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            $table->dropColumn(['xml_conteudo', 'mensagem_sefaz']);
        });
    }
};
