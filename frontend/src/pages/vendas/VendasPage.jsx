import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingBag, Plus, Search, DollarSign, CheckCircle2, 
  AlertTriangle, X, FileText, Ban, RefreshCw, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VendasPage() {
  const [pedidos, setPedidos] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [feedback, setFeedback] = useState(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resVendas, resMetricas] = await Promise.all([
        api.get('/vendas', { params: { search, status: filtroStatus } }).catch(() => ({ data: { data: [] } })),
        api.get('/vendas/metricas').catch(() => ({ data: { data: null } })),
      ]);

      const raw = resVendas.data?.data;
      setPedidos(Array.isArray(raw) ? raw : (raw?.data || []));
      setMetricas(resMetricas.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(carregarDados, 300);
    return () => clearTimeout(delay);
  }, [search, filtroStatus]);

  const handleCancelar = async (pedido) => {
    const motivo = window.prompt(`Motivo do cancelamento do Pedido #${pedido.numero_pedido}:`);
    if (!motivo) return;

    try {
      const res = await api.post(`/vendas/${pedido.id}/cancelar`, { motivo });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cancelar pedido.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-indigo-500" />
            Comércio & Vendas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gestão de Pedidos faturados, Orçamentos e Frente de Caixa PDV
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/pdv"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
          >
            Abrir Frente de Caixa (PDV)
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {metricas && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Vendas Hoje</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1 block">
              R$ {metricas.faturamento_hoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Qtd Vendas Hoje</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-1 block">{metricas.vendas_hoje_qtd}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Orçamentos Abertos</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1 block">{metricas.orcamentos_abertos_qtd}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Faturamento Mês</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-indigo-400 mt-1 block">
              R$ {metricas.faturamento_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex gap-2">
          {['', 'FATURADO', 'ORCAMENTO', 'AGUARDANDO_APROVACAO', 'CANCELADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroStatus === st ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {st === '' ? 'Todos' : st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nº Pedido ou Cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabela de Vendas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
            <tr>
              <th className="py-3 px-4">NÚMERO</th>
              <th className="py-3 px-4">CLIENTE</th>
              <th className="py-3 px-4 text-center">DATA</th>
              <th className="py-3 px-4 text-right">TOTAL LÍQUIDO</th>
              <th className="py-3 px-4 text-center">STATUS</th>
              <th className="py-3 px-4 text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {pedidos.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-slate-500">Nenhum pedido ou venda registrado.</td></tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">#{p.numero_pedido}</td>
                  <td className="py-3 px-4 text-white font-medium">{p.cliente?.nome_razao_social}</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">{p.data_emissao}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    R$ {parseFloat(p.valor_total_liquido).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'FATURADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      p.status === 'ORCAMENTO' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      p.status === 'AGUARDANDO_APROVACAO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.status !== 'CANCELADO' && (
                      <button
                        type="button"
                        onClick={() => handleCancelar(p)}
                        title="Cancelar Venda"
                        className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-800"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}