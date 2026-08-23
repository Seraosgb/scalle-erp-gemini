import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCode, 
  ShieldCheck,
  Send
} from 'lucide-react';

export default function FiscalPage() {
  const [search, setSearch] = useState('');
  const [modeloFiltro, setModeloFiltro] = useState('');

  const { data: fiscalResponse, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-documentos', search, modeloFiltro],
    queryFn: async () => {
      const res = await api.get('/fiscal/documentos', {
        params: { modelo: modeloFiltro }
      });
      return res.data;
    }
  });

  const documentos = fiscalResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-400" />
            <span>Motor Fiscal & Documentos Eletrônicos</span>
          </h1>
          <p className="text-sm text-slate-400">Emissão e guarda de NF-e, NFC-e, NFS-e e matriz tributária IBS/CBS</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <span className="px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SEFAZ Online
          </span>
        </div>
      </div>

      {/* Cards de Métricas Fiscais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total NF-e (Modelo 55)</p>
          <h3 className="text-2xl font-mono font-bold text-white mt-1">
            {documentos.filter(d => d.modelo_documento === '55').length} emitidas
          </h3>
        </div>
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">NFC-e Balcão (Modelo 65)</p>
          <h3 className="text-2xl font-mono font-bold text-white mt-1">
            {documentos.filter(d => d.modelo_documento === '65').length} emitidas
          </h3>
        </div>
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reforma Tributária (IBS/CBS)</p>
          <h3 className="text-2xl font-mono font-bold text-indigo-400 mt-1">
            Conforme
          </h3>
        </div>
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Documento</th>
              <th className="p-4">Destinatário</th>
              <th className="p-4">Chave de Acesso</th>
              <th className="p-4 text-right">Valor Total</th>
              <th className="p-4 text-center">Status SEFAZ</th>
              <th className="p-4 text-center">Protocolo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Consultando documentos fiscais...</td>
              </tr>
            ) : documentos.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Nenhum documento fiscal emitido até o momento.</td>
              </tr>
            ) : (
              documentos.map((doc) => {
                const isAutorizado = doc.status === 'AUTORIZADO';
                return (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-white block">
                        Mod. {doc.modelo_documento} #{doc.numero_documento}
                      </span>
                      <span className="text-xs text-slate-500">Série {doc.serie}</span>
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      {doc.destinatario?.nome_razao_social}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-400 truncate max-w-xs">
                      {doc.chave_acesso || '—'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      R$ {parseFloat(doc.valor_total_documento).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isAutorizado 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-xs text-slate-400">
                      {doc.protocolo_autorizacao || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}