<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabela de Colaboradores / Funcionários
        Schema::create('rh_colaboradores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->foreignUuid('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('pessoa_id')->constrained('pes_pessoas')->cascadeOnDelete();
            
            $table->string('matricula', 30)->index();
            $table->string('cargo', 100);
            $table->string('departamento', 100);
            $table->date('data_admissao');
            $table->date('data_demissao')->nullable();
            $table->decimal('salario_base', 15, 2);
            $table->string('tipo_contrato', 30)->default('CLT'); // CLT, PJ, ESTAGIO, TEMPORARIO
            $table->string('status', 30)->default('ATIVO'); // ATIVO, FERIAS, AFASTADO, DESLIGADO
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'empresa_id', 'status']);
        });

        // 2. Tabela de Registro de Ponto Eletrônico (REP-P Portaria 671 - Base Imutável)
        Schema::create('rh_pontos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('colaborador_id')->constrained('rh_colaboradores')->cascadeOnDelete();
            $table->dateTime('data_hora_registro')->useCurrent();
            $table->string('tipo_registro', 20); // ENTRADA, INTERVALO_SAIDA, INTERVALO_RETORNO, SAIDA
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('ip_origem', 45)->nullable();
            $table->string('dispositivo_info', 200)->nullable();
            $table->string('hash_registro', 64); // Assinatura SHA-256 de imutabilidade
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'colaborador_id', 'data_hora_registro']);
        });

        // 3. Tabela de Vagas e Funil Kanban de R&S
        Schema::create('rh_vagas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->constrained('sis_empresas')->cascadeOnDelete();
            $table->string('titulo', 150);
            $table->string('departamento', 100);
            $table->integer('quantidade_vagas')->default(1);
            $table->string('status', 30)->default('ABERTA'); // ABERTA, EM_PROCESSO, ENCERRADA
            $table->decimal('salario_oferecido', 15, 2)->nullable();
            $table->text('requisitos')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Tabela de Candidatos do Funil Kanban
        Schema::create('rh_candidatos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('sis_tenants')->cascadeOnDelete();
            $table->foreignUuid('vaga_id')->constrained('rh_vagas')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('email', 150);
            $table->string('telefone', 30);
            $table->string('etapa_kanban', 50)->default('TRIAGEM'); // TRIAGEM, ENTREVISTA, TESTE_TECNICO, PROPOSTA, APROVADO, REPROVADO
            $table->text('observacoes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rh_candidatos');
        Schema::dropIfExists('rh_vagas');
        Schema::dropIfExists('rh_pontos');
        Schema::dropIfExists('rh_colaboradores');
    }
};