<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Adicionar parâmetros de CSC (NFC-e) e Endereço Fiscal na Empresa
        Schema::table('sis_empresas', function (Blueprint $table) {
            if (!Schema::hasColumn('sis_empresas', 'csc_token')) {
                $table->string('csc_token', 100)->nullable()->after('regime_tributario');
            }
            if (!Schema::hasColumn('sis_empresas', 'csc_id')) {
                $table->string('csc_id', 20)->default('000001')->after('csc_token');
            }
            if (!Schema::hasColumn('sis_empresas', 'cep')) {
                $table->string('cep', 10)->nullable();
                $table->string('logradouro', 150)->nullable();
                $table->string('numero', 20)->nullable();
                $table->string('bairro', 100)->nullable();
                $table->string('cidade', 100)->nullable();
                $table->string('uf', 2)->default('RJ');
                $table->string('codigo_ibge', 10)->default('3300456');
            }
        });

        // 2. Unificar dados de prj_projeto_custos para prj_custos (Sem perda de dados)
        if (Schema::hasTable('prj_projeto_custos') && Schema::hasTable('prj_custos')) {
            $custosLegados = DB::table('prj_projeto_custos')->get();
            foreach ($custosLegados as $c) {
                $existe = DB::table('prj_custos')->where('id', $c->id)->exists();
                if (!$existe && !empty($c->tenant_id)) {
                    DB::table('prj_custos')->insert([
                        'id' => $c->id,
                        'tenant_id' => $c->tenant_id,
                        'projeto_id' => $c->projeto_id,
                        'descricao' => $c->descricao,
                        'valor' => $c->valor,
                        'data_custo' => $c->data_custo,
                        'created_at' => $c->created_at ?? now(),
                        'updated_at' => $c->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 3. Unificar dados de prj_projeto_entregaveis para prj_entregaveis (Sem perda de dados)
        if (Schema::hasTable('prj_projeto_entregaveis') && Schema::hasTable('prj_entregaveis')) {
            $entregaveisLegados = DB::table('prj_projeto_entregaveis')->get();
            foreach ($entregaveisLegados as $e) {
                $existe = DB::table('prj_entregaveis')->where('id', $e->id)->exists();
                if (!$existe && !empty($e->tenant_id)) {
                    DB::table('prj_entregaveis')->insert([
                        'id' => $e->id,
                        'tenant_id' => $e->tenant_id,
                        'projeto_id' => $e->projeto_id,
                        'titulo' => $e->titulo,
                        'valor_faturamento' => $e->valor_faturamento,
                        'data_prevista' => $e->data_prevista,
                        'created_at' => $e->created_at ?? now(),
                        'updated_at' => $e->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 4. Garantir coluna status em prj_entregaveis para compatibilidade
        if (Schema::hasTable('prj_entregaveis') && !Schema::hasColumn('prj_entregaveis', 'status')) {
            Schema::table('prj_entregaveis', function (Blueprint $table) {
                $table->string('status', 30)->default('PENDENTE')->after('valor_faturamento');
            });
        }
    }

    public function down(): void
    {
        // Migração não destrutiva (Padrão Gemini)
    }
};
