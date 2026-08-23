import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  FileText, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Boxes,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metricas');
      return res.data.data;
    },
    refetchInterval: 1000 * 30, // Atualização a cada 30 segundos
  });

  const m = dashboardData || {
    faturamento_hoje: 0,
    faturamento_mes: 0,
    total_a_receber: 0,
    total_a_pagar: 0,
    os_abertas: 0,
    os_em_andamento: 0,
    os_concluidas_mes: 0,
    total_nfe_emitidas: 0,
    itens_estoque_baixo: []
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-indigo-400" />
            <span>Painel de Controle Executivo</span>
          </h1>
          <p className="text-sm text-slate-400">Visão consolidada em tempo real da operação do ERP</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-2xl text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sincronização Ativa</span>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Hoje */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vendas de Hoje</p>
            <h3 className="text-2xl font-mono font-bold text-white mt-1">
              R$ {m.faturamento_hoje.toFixed(2)}
            </h3>
            <span className="text-xs text-emerald-400 font-medium">PDV & Pedidos Diretos</span>
          </div>
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Contas a Receber */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total a Receber</p>
            <h3 className="text-2xl font-mono font-bold text-emerald-400 mt-1">
              R$ {m.total_a_receber.toFixed(2)}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Títulos em Aberto</span>
          </div>
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Contas a Pagar */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total a Pagar</p>
            <h3 className="text-2xl font-mono font-bold text-rose-400 mt-1">
              R$ {m.total_a_pagar.toFixed(2)}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Fornecedores & Despesas</span>
          </div>
          <div className="p-3 bg-rose-600/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Ordens de Serviço Ativas */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">OS em Atendimento</p>
            <h3 className="text-2xl font-mono font-bold text-indigo-400 mt-1">
              {m.os_abertas + m.os_em_andamento} ativas
            </h3>
            <span className="text-xs text-slate-400 font-medium">{m.os_concluidas_mes} concluídas no mês</span>
          </div>
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid Secundário: Alertas Operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela de Itens com Estoque Baixo */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Itens com Estoque Baixo / Ruptura</span>
            </h3>
            <span className="text-xs text-slate-500">Saldo &le; 5 unidades</span>
          </div>

          {m.itens_estoque_baixo?.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Nenhum item com estoque crítico no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {m.itens_estoque_baixo.map((saldo) => (
                <div key={saldo.id} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{saldo.item?.nome}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      SKU: {saldo.item?.codigo_sku} • Depósito: {saldo.deposito?.nome}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-mono font-bold">
                    {parseFloat(saldo.quantidade_saldo).toFixed(2)} {saldo.item?.unidade_medida}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo Fiscal e Comercial */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Resumo Operacional do Mês</span>
          </h3>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Faturamento Mensal Consolidado:</span>
              <span className="font-mono font-bold text-white">R$ {m.faturamento_mes.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Documentos Fiscais Autorizados:</span>
              <span className="font-mono font-bold text-emerald-400">{m.total_nfe_emitidas} notas</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Ordens de Serviço Concluídas:</span>
              <span className="font-mono font-bold text-indigo-400">{m.os_concluidas_mes} OS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}