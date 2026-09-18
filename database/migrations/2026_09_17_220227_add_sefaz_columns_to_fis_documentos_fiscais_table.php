<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            if (!Schema::hasColumn('fis_documentos_fiscais', 'ambiente_emissao')) {
                $table->string('ambiente_emissao', 20)->nullable()->after('numero_documento');
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'chave_acesso')) {
                $table->string('chave_acesso', 50)->nullable();
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'protocolo_autorizacao')) {
                $table->string('protocolo_autorizacao', 50)->nullable();
            }
            if (!Schema::hasColumn('fis_documentos_fiscais', 'mensagem_sefaz')) {
                $table->text('mensagem_sefaz')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('fis_documentos_fiscais', function (Blueprint $table) {
            $colunas = ['ambiente_emissao', 'chave_acesso', 'protocolo_autorizacao', 'mensagem_sefaz'];
            foreach ($colunas as $coluna) {
                if (Schema::hasColumn('fis_documentos_fiscais', $coluna)) {
                    $table->dropColumn($coluna);
                }
            }
        });
    }
};
