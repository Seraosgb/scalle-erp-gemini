<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('os_ordens_servico', function (Blueprint $table) {
            $table->dateTime('prazo_sla_resposta')->nullable()->after('data_abertura');
            $table->dateTime('prazo_sla_resolucao')->nullable()->after('prazo_sla_resposta');
            $table->string('hash_assinatura_sha256', 64)->nullable()->after('assinado_em');
            $table->string('ip_assinatura', 45)->nullable()->after('hash_assinatura_sha256');
            $table->decimal('latitude_assinatura', 10, 8)->nullable()->after('ip_assinatura');
            $table->decimal('longitude_assinatura', 11, 8)->nullable()->after('latitude_assinatura');
        });
    }

    public function down(): void
    {
        Schema::table('os_ordens_servico', function (Blueprint $table) {
            $table->dropColumn([
                'prazo_sla_resposta',
                'prazo_sla_resolucao',
                'hash_assinatura_sha256',
                'ip_assinatura',
                'latitude_assinatura',
                'longitude_assinatura'
            ]);
        });
    }
};