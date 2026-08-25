<?php

namespace Database\Seeders;

use App\Models\Permissao;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PermissoesSeeder extends Seeder
{
    public function run(): void
    {
        $permissoes = [
            // Módulo WMS & Estoque
            ['modulo' => 'WMS', 'slug' => 'wms.visualizar', 'nome' => 'Visualizar Estoque e Saldos', 'descricao' => 'Consulta lista de itens e posições de estoque'],
            ['modulo' => 'WMS', 'slug' => 'wms.inventario.ajustar', 'nome' => 'Ajustar Inventário Físico', 'descricao' => 'Permite alterar saldos manuais e endereçamento'],
            ['modulo' => 'WMS', 'slug' => 'wms.transferir', 'nome' => 'Realizar Transferências Internas', 'descricao' => 'Transfere estoque entre almoxarifados'],
            ['modulo' => 'WMS', 'slug' => 'wms.deposito.gerenciar', 'nome' => 'Cadastrar/Editar Depósitos', 'descricao' => 'Cria novos depósitos e almoxarifados'],
            
            // Módulo Compras & Suprimentos
            ['modulo' => 'COMPRAS', 'slug' => 'compras.visualizar', 'nome' => 'Visualizar Pedidos de Compra', 'descricao' => 'Consulta entradas e compras'],
            ['modulo' => 'COMPRAS', 'slug' => 'compras.criar', 'nome' => 'Lançar Pedidos de Entrada', 'descricao' => 'Cria entradas manuais com crédito em estoque'],
            ['modulo' => 'COMPRAS', 'slug' => 'compras.xml.importar', 'nome' => 'Importar XML de NF-e', 'descricao' => 'Processa arquivos XML de fornecedores'],
            
            // Módulo Vendas & PDV
            ['modulo' => 'VENDAS', 'slug' => 'vendas.pdv.operar', 'nome' => 'Operar Caixa / Frente de PDV', 'descricao' => 'Realiza vendas no balcão'],
            ['modulo' => 'VENDAS', 'slug' => 'vendas.desconto.aplicar', 'nome' => 'Conceder Descontos em Vendas', 'descricao' => 'Aplica descontos comerciais'],
            
            // Módulo Ordens de Serviço (CMMS)
            ['modulo' => 'OS', 'slug' => 'os.abrir', 'nome' => 'Abrir Ordens de Serviço', 'descricao' => 'Cadastra novas solicitações de manutenção'],
            ['modulo' => 'OS', 'slug' => 'os.executar', 'nome' => 'Executar e Apontar Peças', 'descricao' => 'Lança materiais e laudo técnico'],
            ['modulo' => 'OS', 'slug' => 'os.concluir', 'nome' => 'Concluir OS e Coletar Assinatura', 'descricao' => 'Encerra o serviço com aceite jurídico'],
            
            // Módulo Financeiro
            ['modulo' => 'FINANCEIRO', 'slug' => 'financeiro.visualizar', 'nome' => 'Visualizar Contas a Pagar/Receber', 'descricao' => 'Acessa relatórios e títulos'],
            ['modulo' => 'FINANCEIRO', 'slug' => 'financeiro.liquidar', 'nome' => 'Liquidar/Baixar Títulos', 'descricao' => 'Dá baixa financeira e movimenta extrato'],
            
            // Governança & Configurações
            ['modulo' => 'GOVERNANCA', 'slug' => 'governanca.usuarios.gerenciar', 'nome' => 'Gerenciar Usuários e Acessos', 'descricao' => 'Cadastra novos membros e altera senhas'],
            ['modulo' => 'GOVERNANCA', 'slug' => 'governanca.filiais.gerenciar', 'nome' => 'Cadastrar/Editar Filiais', 'descricao' => 'Gerencia as empresas do tenant'],
        ];

        foreach ($permissoes as $p) {
            Permissao::firstOrCreate(
                ['slug' => $p['slug']],
                [
                    'id' => (string) Str::uuid(),
                    'modulo' => $p['modulo'],
                    'nome' => $p['nome'],
                    'descricao' => $p['descricao'],
                ]
            );
        }
    }
}