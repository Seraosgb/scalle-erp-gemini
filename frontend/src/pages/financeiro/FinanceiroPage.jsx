import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import ModalLiquidarTitulo from './ModalLiquidarTitulo';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export default function FinanceiroPage() {
  const [naturezaFiltro, setNaturezaFiltro] = useState('RECEBER');
  const [tituloSelecionado, setTituloSelecionado] = useState(null);

  // Consulta de Títulos
  const { data: titulosResponse, isLoading, refetch } = useQuery({
    queryKey: ['fin-titulos', naturezaFiltro],
    queryFn: async () => {
      const res = await api.get('/financeiro/titulos', {
        params: { natureza: naturezaFiltro }
      });
      return res.data;
    }
  });

  // Consulta de Contas Bancárias
  const { data: contasResponse } = useQuery({
    queryKey: ['fin-contas'],
    queryFn: async () => {
      const res = await api.get('/financeiro/contas');
      return res.data.data;
    }
  });

  const titulos = titulosResponse?.data || [];
  const contas = contasResponse || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            <span>Gestão Financeira & Tesouraria</span>
          </h1>
          <p className="text-sm text-slate-400">Controle de contas a pagar, receber, extrato e liquidações</p>
        </div>

        {/* Seletor de Natureza */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setNaturezaFiltro('RECEBER')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              naturezaFiltro === 'RECEBER'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contas a Receber
          </button>
          <button
            onClick={() => setNaturezaFiltro('PAGAR')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              naturezaFiltro === 'PAGAR'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contas a Pagar
          </button>
        </div>
      </div>

      {/* Cards de Saldo das Contas Bancárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contas.map((conta) => (
          <div key={conta.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{conta.nome}</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">
                R$ {parseFloat(conta.saldo_atual).toFixed(2)}
              </h3>
            </div>
            <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de Títulos */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Documento</th>
              <th className="p-4">Favorecido / Cliente</th>
              <th className="p-4">Vencimento</th>
              <th className="p-4 text-right">Valor Aberto</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Carregando títulos financeiros...</td>
              </tr>
            ) : titulos.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Nenhum título localizado.</td>
              </tr>
            ) : (
              titulos.map((t) => {
                const isLiquidado = t.status === 'LIQUIDADO';
                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-white">#{t.documento_numero}</td>
                    <td className="p-4 font-medium text-slate-200">{t.pessoa?.nome_razao_social}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      R$ {parseFloat(t.valor_saldo_aberto).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isLiquidado 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {!isLiquidado ? (
                        <button
                          onClick={() => setTituloSelecionado(t)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Liquidar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">Quitado</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Liquidação */}
      <ModalLiquidarTitulo
        isOpen={!!tituloSelecionado}
        titulo={tituloSelecionado}
        contas={contas}
        onClose={() => setTituloSelecionado(null)}
        onSucesso={() => refetch()}
      />
    </div>
  );
}