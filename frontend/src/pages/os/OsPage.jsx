import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import ModalConcluirOs from './ModalConcluirOs';
import { 
  Wrench, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function OsPage() {
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [osSelecionada, setOsSelecionada] = useState(null);

  const { data: osResponse, isLoading, refetch } = useQuery({
    queryKey: ['ordens-servico', search, statusFiltro],
    queryFn: async () => {
      const res = await api.get('/ordens-servico', {
        params: { search, status: statusFiltro }
      });
      return res.data;
    }
  });

  const ordens = osResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-indigo-400" />
            <span>Ordens de Serviço & CMMS</span>
          </h1>
          <p className="text-sm text-slate-400">Field service, laudos técnicos e assinatura digital em campo</p>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova OS</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-500 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por equipamento, defeito ou número da OS..."
            className="w-full bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none text-sm"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="w-full h-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos os Status</option>
            <option value="ABERTA">Abertas</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>
        </div>
      </div>

      {/* Lista de Ordens de Serviço (Card Grid Mobile-Friendly) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">Carregando ordens de serviço...</div>
        ) : ordens.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">Nenhuma ordem de serviço encontrada.</div>
        ) : (
          ordens.map((os) => {
            const isConcluida = os.status === 'CONCLUIDA';
            return (
              <div
                key={os.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      OS #{os.numero_os}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isConcluida 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {os.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-tight mb-1">
                    {os.equipamento_descricao}
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">Cliente: {os.cliente?.nome_razao_social}</p>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                    {os.defeito_reclamado}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-400">
                    Total: <strong className="text-emerald-400">R$ {parseFloat(os.valor_total || 0).toFixed(2)}</strong>
                  </div>

                  {!isConcluida ? (
                    <button
                      onClick={() => setOsSelecionada(os)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <span>Finalizar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Assinado</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Conclusão e Assinatura */}
      <ModalConcluirOs
        isOpen={!!osSelecionada}
        os={osSelecionada}
        onClose={() => setOsSelecionada(null)}
        onSucesso={() => refetch()}
      />
    </div>
  );
}