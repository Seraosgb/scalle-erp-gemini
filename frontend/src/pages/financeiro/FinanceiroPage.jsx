import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, 
  Search, CheckCircle2, Clock, X, AlertTriangle 
} from 'lucide-react';

export default function FinanceiroPage() {
  const [naturezaFiltro, setNaturezaFiltro] = useState('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  const { data: titulosData, isLoading, refetch } = useQuery({
    queryKey: ['financeiro-titulos', naturezaFiltro],
    queryFn: async () => {
      const res = await api.get('/financeiro/titulos', {
        params: { natureza: naturezaFiltro }
      });
      return res.data;
    }
  });

  const rawTitulos = titulosData?.data;
  const titulos = Array.isArray(rawTitulos) ? rawTitulos : (rawTitulos?.data || []);

  const handleLiquidar = async (tituloId) => {
    try {
      const resContas = await api.get('/financeiro/contas');
      const contaId = resContas.data?.data?.[0]?.id;

      if (!contaId) {
        setFeedback({ tipo: 'erro', msg: 'Nenhuma conta bancária/caixa cadastrada para liquidar.' });
        return;
      }

      const res = await api.post(`/financeiro/titulos/${tituloId}/liquidar`, {
        conta_financeira_id: contaId,
        valor_pago: 10.00, // Exemplo parcial/total
        forma_pagamento: 'PIX'
      });

      setFeedback({ tipo: 'sucesso', msg: 'Título liquidado com sucesso!' });
      refetch();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao liquidar título.' });
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-5 text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Gestão Financeira & Tesouraria</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Contas a Pagar, Contas a Receber, Fluxo de Caixa e Liquidações</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button 
          onClick={() => setNaturezaFiltro('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${naturezaFiltro === '' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
        >
          Todos
        </button>
        <button 
          onClick={() => setNaturezaFiltro('RECEBER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${naturezaFiltro === 'RECEBER' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
        >
          A Receber
        </button>
        <button 
          onClick={() => setNaturezaFiltro('PAGAR')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${naturezaFiltro === 'PAGAR' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
        >
          A Pagar
        </button>
      </div>

      {/* Tabela de Títulos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3.5 sm:p-4">Documento</th>
              <th className="p-3.5 sm:p-4">Pessoa / Fornecedor</th>
              <th className="p-3.5 sm:p-4">Vencimento</th>
              <th className="p-3.5 sm:p-4 text-right">Valor Aberto</th>
              <th className="p-3.5 sm:p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">Carregando financeiro...</td></tr>
            ) : titulos.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhum título financeiro encontrado.</td></tr>
            ) : (
              titulos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 sm:p-4 font-mono font-bold text-white">{t.documento_numero}</td>
                  <td className="p-3.5 sm:p-4">{t.pessoa?.nome_razao_social || '—'}</td>
                  <td className="p-3.5 sm:p-4 font-mono text-slate-400">{t.data_vencimento}</td>
                  <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-white">
                    R$ {parseFloat(t.valor_saldo_aberto || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 sm:p-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'LIQUIDADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {t.status}
                    </span>
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