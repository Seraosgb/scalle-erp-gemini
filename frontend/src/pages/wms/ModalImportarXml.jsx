import React, { useState } from 'react';
import { api } from '../../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileCode } from 'lucide-react';

export default function ModalImportarXml({ isOpen, onClose, depositos, onSucesso }) {
  const [file, setFile] = useState(null);
  const [depositoId, setDepositoId] = useState(depositos[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo XML válido.');
      return;
    }
    if (!depositoId) {
      setError('Selecione o almoxarifado de destino para as mercadorias.');
      return;
    }

    setLoading(true);
    setError('');
    setSucesso('');

    const formData = new FormData();
    formData.append('xml_file', file);
    formData.append('deposito_id', depositoId);

    try {
      const response = await api.post('/wms/importar-xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSucesso(response.data.data.message);
      setTimeout(() => {
        onSucesso();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Falha ao processar arquivo XML.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Importar NF-e (XML)</h3>
              <p className="text-xs text-slate-400">Entrada automática de estoque e compras</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
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

          {sucesso && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Depósito / Almoxarifado de Entrada
            </label>
            <select
              value={depositoId}
              onChange={(e) => setDepositoId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Arquivo da Nota Fiscal (.XML)
            </label>
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
              <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
              <span className="text-sm font-medium text-slate-300">
                {file ? file.name : 'Selecione ou arraste o XML aqui'}
              </span>
              <span className="text-xs text-slate-500 mt-1">Formato oficial NF-e padrão SEFAZ</span>
              <input
                type="file"
                accept=".xml"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </label>
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20"
            >
              {loading ? 'Processando XML...' : 'Importar Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}