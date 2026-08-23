import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  QrCode, 
  FileText, 
  Layers 
} from 'lucide-react';

export default function PortalClientePage() {
  const { token } = useParams();

  const { data: portalData, isLoading, error } = useQuery({
    queryKey: ['portal-os', token],
    queryFn: async () => {
      const res = await api.get(`/portal/os/${token}`);
      return res.data.data;
    },
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-slate-400 text-sm font-medium">Carregando dados do serviço...</div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center">
          <p className="text-rose-400 text-sm font-semibold mb-2">Ordem de Serviço Não Encontrada</p>
          <p className="text-slate-500 text-xs">O link informado é inválido ou já expirou.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">{portalData.empresa?.nome}</h1>
              <p className="text-xs text-slate-400">Portal de Atendimento ao Cliente</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {portalData.status}
          </span>
        </div>

        {/* Detalhes do Equipamento */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-400" />
              <span>Ordem de Serviço #{portalData.numero_os}</span>
            </h2>
            <span className="font-mono text-xs text-slate-400">
              {new Date(portalData.data_abertura).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2">
            <p className="text-sm font-semibold text-white">{portalData.equipamento}</p>
            {portalData.marca_modelo && (
              <p className="text-xs text-slate-400">Modelo: {portalData.marca_modelo}</p>
            )}
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/80">
              Defeito Informado: {portalData.defeito_reclamado}
            </p>
          </div>

          {portalData.laudo_tecnico && (
            <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Laudo Técnico</span>
              <p className="text-sm text-slate-300">{portalData.laudo_tecnico}</p>
            </div>
          )}
        </div>

        {/* Resumo de Valores e PIX */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Valor Total do Atendimento</span>
            <h3 className="text-3xl font-mono font-bold text-emerald-400 mt-1">
              R$ {portalData.valor_total.toFixed(2)}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span>Assinatura Digital Coletada</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}