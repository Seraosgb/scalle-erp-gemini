<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Planos Comerciais da Plataforma
        Schema::create('sis_planos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nome', 50); // MEI, Pro, Enterprise
            $table->string('slug', 50)->unique();
            $table->decimal('valor_mensal', 15, 2);
            $table->integer('limite_usuarios')->default(1);
            $table->integer('limite_empresas')->default(1);
            $table->bigInteger('cota_storage_bytes'); // 3GB = 3221225472, 20GB = 21474836480
            $table->jsonb('modulos_habilitados')->nullable(); // Lista de módulos permitidos
            $table->boolean('is_ativo')->default(true);
            $table->timestamps();
        });

        // 2. Tabela de Assinaturas dos Tenants
        Schema::create('sis_assinaturas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('plano_id')->constrained('sis_planos')->cascadeOnDelete();
            $table->string('status', 30)->default('TRIAL'); // TRIAL, ATIVA, PENDENTE, CANCELADA, SOFT_LOCK
            $table->date('data_inicio');
            $table->date('data_proximo_vencimento');
            $table->bigInteger('storage_utilizado_bytes')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sis_assinaturas');
        Schema::dropIfExists('sis_planos');
    }
};