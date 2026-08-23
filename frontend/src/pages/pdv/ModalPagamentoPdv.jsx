import React from 'react';
import { usePdvStore } from '../../store/usePdvStore';
import { CreditCard, DollarSign, QrCode, Receipt, X, Check } from 'lucide-react';

export default function ModalPagamentoPdv({ isOpen, onClose, onConfirmar, loading }) {
  const { 
    formaPagamento, 
    setFormaPagamento, 
    valorRecebido, 
    setValorRecebido, 
    getTotalLiquido, 
    getTroco 
  } = usePdvStore();

  if (!isOpen) return null;

  const totalLiquido = getTotalLiquido();
  const troco = getTroco();

  const formas = [
    { id: 'PIX', label: 'PIX Dinâmico', icon: QrCode },
    { id: 'CARTAO_CREDITO', label: 'Cartão Crédito', icon: CreditCard },
    { id: 'CARTAO_DEBITO', label: 'Cartão Débito', icon: CreditCard },
    { id: 'DINHEIRO', label: 'Dinheiro Espécie', icon: DollarSign },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Finalizar Venda (F4)</h3>
              <p className="text-xs text-slate-400">Selecione a forma de pagamento e confirme</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Card de Total */}
          <div className="p-5 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Total a Pagar</span>
            <span className="text-3xl font-mono font-black text-indigo-400">
              R$ {totalLiquido.toFixed(2)}
            </span>
          </div>

          {/* Formas de Pagamento */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-3">
              {formas.map((f) => {
                const Icon = f.icon;
                const active = formaPagamento === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFormaPagamento(f.id);
                      if (f.id !== 'DINHEIRO') setValorRecebido(totalLiquido);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      active 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-bold tracking-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Troco se for dinheiro */}
          {formaPagamento === 'DINHEIRO' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Valor Recebido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorRecebido || ''}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Troco a Devolver
                </label>
                <div className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-lg text-emerald-400 font-bold">
                  R$ {troco.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading || totalLiquido <= 0}
              onClick={onConfirmar}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Faturando...' : 'Confirmar Pagamento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}