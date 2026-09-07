<?php

namespace Database\Seeders;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\TabelaDominio;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Tenant, Matriz e Usuário Master Global
        $this->call([
            MasterOwnerSeeder::class,
        ]);

        $tenant = Tenant::first();
        $empresa = Empresa::where('tenant_id', $tenant->id)->first();

        // 2. Depósito Padrão WMS
        Deposito::firstOrCreate(
            ['empresa_id' => $empresa->id, 'codigo' => 'DEP-01'],
            [
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'nome' => 'Depósito Central / Matriz',
                'descricao' => 'Almoxarifado Geral de Operações',
                'is_padrao' => true,
                'is_ativo' => true,
            ]
        );

        // 3. Permissões Granulares e Matriz de Acesso RBAC
        $this->call([
            PermissoesSeeder::class,
        ]);

        // 4. Tabelas de Domínio Dinâmicas (CRM & OS)
        $motivosPerda = [
            ['codigo' => 'PRECO_ALTO', 'nome' => 'Preço Acima do Orçamento', 'cor_hex' => '#ef4444'],
            ['codigo' => 'CONCORRENTE', 'nome' => 'Fechou com Concorrente', 'cor_hex' => '#f97316'],
            ['codigo' => 'SEM_RETORNO', 'nome' => 'Lead Parou de Responder', 'cor_hex' => '#64748b'],
            ['codigo' => 'SEM_INTERESSE', 'nome' => 'Sem Interesse / Projeto Cancelado', 'cor_hex' => '#a855f7'],
        ];

        foreach ($motivosPerda as $idx => $m) {
            TabelaDominio::firstOrCreate(
                ['tenant_id' => $tenant->id, 'tipo_lista' => 'CRM_MOTIVO_PERDA', 'codigo' => $m['codigo']],
                [
                    'id' => (string) Str::uuid(),
                    'nome' => $m['nome'],
                    'cor_hex' => $m['cor_hex'],
                    'ordem_exibicao' => $idx + 1,
                    'is_ativo' => true,
                    'is_sistema' => true,
                ]
            );
        }

        $prioridades = [
            ['codigo' => 'BAIXA', 'nome' => 'Baixa (72h)', 'cor_hex' => '#64748b', 'sla' => 72],
            ['codigo' => 'NORMAL', 'nome' => 'Normal (24h)', 'cor_hex' => '#3b82f6', 'sla' => 24],
            ['codigo' => 'ALTA', 'nome' => 'Alta (12h)', 'cor_hex' => '#f59e0b', 'sla' => 12],
            ['codigo' => 'URGENTE', 'nome' => 'Urgente (6h)', 'cor_hex' => '#ef4444', 'sla' => 6],
        ];

        foreach ($prioridades as $idx => $p) {
            TabelaDominio::firstOrCreate(
                ['tenant_id' => $tenant->id, 'tipo_lista' => 'PRIORIDADE_OS', 'codigo' => $p['codigo']],
                [
                    'id' => (string) Str::uuid(),
                    'nome' => $p['nome'],
                    'cor_hex' => $p['cor_hex'],
                    'ordem_exibicao' => $idx + 1,
                    'metadados' => ['horas_sla' => $p['sla']],
                    'is_ativo' => true,
                    'is_sistema' => true,
                ]
            );
        }

        // 5. Catálogo de Itens de Estoque e Serviços
        $this->call([
            ItemSeeder::class,
        ]);
    }
}
