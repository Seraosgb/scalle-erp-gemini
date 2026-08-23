import React, { useState } from 'react';
import { api } from '../../services/api';
import { DollarSign, Check, X, AlertCircle } from 'lucide-react';

export default function ModalLiquidarTitulo({ isOpen, titulo, contas, onClose, onSucesso }) {
  const [contaId, setContaId] = useState(contas[0]?.id || '');
  const [valorPago, setValorPago] = useState(titulo?.valor_saldo_aberto || 0);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !titulo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/financeiro/titulos/${titulo.id}/liquidar`, {
        conta_financeira_id: contaId || contas[0]?.id,
        valor_pago: parseFloat(valorPago),
        forma_pagamento: formaPagamento,
      });

      onSucesso();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Falha ao liquidar título.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Baixar Título #{titulo.documento_numero}</h3>
              <p className="text-xs text-slate-400">{titulo.natureza === 'RECEBER' ? 'Recebimento' : 'Pagamento'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Conta Bancária / Caixa
            </label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {parseFloat(c.saldo_atual).toFixed(2)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Valor da Baixa (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Forma de Liquidação
            </label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="PIX">PIX Transferência</option>
              <option value="BOLETO">Boleto Bancário</option>
              <option value="CARTAO">Cartão</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Processando...' : 'Confirmar Baixa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}