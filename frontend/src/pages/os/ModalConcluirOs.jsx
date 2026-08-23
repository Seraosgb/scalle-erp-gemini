import React, { useState } from 'react';
import { api } from '../../services/api';
import CanvasAssinatura from './CanvasAssinatura';
import { Wrench, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';

export default function ModalConcluirOs({ isOpen, os, onClose, onSucesso }) {
  const [laudo, setLaudo] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [docResponsavel, setDocResponsavel] = useState('');
  const [assinaturaBase64, setAssinaturaBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !os) return null;

  const handleConcluir = async (e) => {
    e.preventDefault();
    if (!assinaturaBase64) {
      setError('A assinatura digital do cliente é obrigatória para encerrar a OS.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/ordens-servico/${os.id}/concluir`, {
        laudo_tecnico: laudo,
        nome_responsavel: nomeResponsavel,
        documento_responsavel: docResponsavel,
        assinatura_base64: assinaturaBase64,
        itens: [
          {
            item_id: os.itens?.[0]?.item_id || '00000000-0000-0000-0000-000000000000',
            tipo_item: 'SERVICO',
            quantidade: 1,
            valor_unitario: parseFloat(os.valor_total || 100.00)
          }
        ]
      });

      onSucesso();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Falha ao concluir a ordem de serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Finalizar OS #{os.numero_os}</h3>
              <p className="text-xs text-slate-400">{os.equipamento_descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConcluir} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Diagnóstico / Laudo Técnico de Encerramento
            </label>
            <textarea
              required
              rows={3}
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              placeholder="Descreva detalhadamente o serviço executado..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome do Recebedor / Cliente
              </label>
              <input
                type="text"
                required
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                CPF / Documento
              </label>
              <input
                type="text"
                value={docResponsavel}
                onChange={(e) => setDocResponsavel(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <CanvasAssinatura
            onSalvar={(base64) => setAssinaturaBase64(base64)}
            onLimpar={() => setAssinaturaBase64('')}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-slate-400 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Concluir e Assinar OS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}