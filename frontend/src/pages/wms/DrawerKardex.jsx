import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { X, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';

export default function DrawerKardex({ item, onClose }) {
  if (!item) return null;

  const { data: movimentos, isLoading } = useQuery({
    queryKey: ['kardex', item.id],
    queryFn: async () => {
      const res = await api.get(`/itens/${item.id}/kardex`);
      return res.data.data;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{item.nome}</h3>
              <p className="text-xs text-slate-400 font-mono">SKU: {item.codigo_sku}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Linha do Tempo de Movimentações (Kardex)
          </h4>

          {isLoading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Carregando histórico...</div>
          ) : movimentos?.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Nenhuma movimentação registrada para este item.</div>
          ) : (
            <div className="space-y-3">
              {movimentos?.map((mov) => {
                const isEntrada = mov.tipo_movimento.startsWith('ENTRADA');
                return (
                  <div key={mov.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEntrada ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isEntrada ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{mov.tipo_movimento}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(mov.data_movimento).toLocaleDateString('pt-BR')} • Depósito: {mov.deposito?.nome}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-bold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isEntrada ? '+' : '-'}{parseFloat(mov.quantidade).toFixed(2)} {item.unidade_medida}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        Saldo: {parseFloat(mov.saldo_posterior).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}