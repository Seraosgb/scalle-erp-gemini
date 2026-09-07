<?php

namespace Database\Seeders;

use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Perfil;
use App\Models\TabelaDominio;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Criação do Tenant Principal (coluna correta: 'documento')
        $tenant = Tenant::firstOrCreate(
            ['documento' => '00.000.000/0001-91'],
            [
                'id' => (string) Str::uuid(),
                'razao_social' => 'Scalle Enterprise Matriz',
                'nome_fantasia' => 'Scalle Matriz',
                'status' => 'ativo',
            ]
        );

        // 2. Criação da Empresa Matriz
        $empresa = Empresa::firstOrCreate(
            ['tenant_id' => $tenant->id, 'cnpj' => '00.000.000/0001-91'],
            [
                'id' => (string) Str::uuid(),
                'razao_social' => 'Scalle Enterprise Matriz',
                'nome_fantasia' => 'Scalle Matriz',
                'regime_tributario' => 'simples_nacional',
                'is_matriz' => true,
            ]
        );

        // 3. Depósito Padrão WMS
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

        // 4. Perfil de Acesso Administrador (ACL)
        $adminPerfil = Perfil::firstOrCreate(
            ['tenant_id' => $tenant->id, 'nome' => 'ADMINISTRADOR'],
            [
                'id' => (string) Str::uuid(),
                'slug' => 'administrador',
                'descricao' => 'Administrador Geral com Acesso Irrestrito',
                'is_admin' => true,
                'is_sistema' => true,
            ]
        );


        // 6. Listas Suspensas de Domínio (Motivos de Perda CRM & Prioridades OS)
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

        // 7. Catálogo de Itens e Peças
        $this->call([
            ItemSeeder::class,
        ]);
    }
}
