<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sis_auditoria_logs')) {
            Schema::create('sis_auditoria_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('usuario_id')->nullable()->index();
                $table->string('acao', 50);
                $table->string('modulo', 100)->nullable();
                $table->string('tabela_entidade', 100);
                $table->uuid('registro_id')->nullable()->index();
                $table->jsonb('valores_anteriores')->nullable();
                $table->jsonb('valores_novos')->nullable();
                $table->string('ip', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sis_auditoria_logs');
    }
};