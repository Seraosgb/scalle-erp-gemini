import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Wrench, CheckCircle2, AlertTriangle, Camera, PenTool, 
  Printer, QrCode, Building2, Clock, ShieldCheck 
} from 'lucide-react';

export default function PortalOsPage() {
  const { token } = useParams();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  useEffect(() => {
    const carregarOsPublica = async () => {
      try {
        const res = await axios.get(`/api/portal/os/${token}`);
        setOs(res.data.data);
      } catch (err) {
        setError('Ordem de Serviço não encontrada ou link expirado.');
      } finally {
        setLoading(false);
      }
    };
    carregarOsPublica();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Wrench className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Carregando espelho da Ordem de Serviço...</p>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
        <h1 className="text-lg font-bold text-white mb-1">Acesso Indisponível</h1>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'Não foi possível carregar a OS solicitada.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        
        {/* Cabeçalho da Empresa Prestadora */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
              <Building2 className="h-5 w-5" />
              <span>{os.empresa?.nome}</span>
            </div>
            <p className="text-xs text-slate-400">CNPJ: {os.empresa?.documento}</p>
          </div>
          <div className="text-right sm:text-right">
            <span className="font-mono text-xs text-indigo-400 font-bold block">ORDEM DE SERVIÇO #{os.numero_os}</span>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              os.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
            }`}>
              {os.status}
            </span>
          </div>
        </div>

        {/* Resumo do Ativo & Defeito */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Wrench className="h-4 w-4 text-indigo-400" /> Dados do Equipamento & Diagnóstico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block">Equipamento:</span>
              <span className="font-bold text-white text-sm">{os.equipamento}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Marca / Modelo:</span>
              <span className="text-slate-300">{os.marca_modelo || 'Não informado'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 block">Defeito Reclamado:</span>
              <p className="text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">{os.defeito_reclamado}</p>
            </div>
          </div>
        </div>

        {/* Laudo Técnico */}
        {os.laudo_tecnico && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 text-xs">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Laudo Técnico de Execução
            </h2>
            <p className="text-slate-300 whitespace-pre-line">{os.laudo_tecnico}</p>
          </div>
        )}

        {/* Galeria de Fotos Antes / Depois */}
        {os.fotos && os.fotos.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Camera className="h-4 w-4 text-indigo-400" /> Evidências Fotográficas da Intervenção
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {os.fotos.map((f) => (
                <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                  <img src={f.url_arquivo} alt="Evidência" className="h-28 w-full object-cover" />
                  <div className="p-1.5 text-[10px] text-center font-bold">
                    <span className={f.tipo_etapa === 'ANTES' ? 'text-amber-400' : 'text-emerald-400'}>{f.tipo_etapa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faturamento e Pagamento PIX */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white">Valor Total do Atendimento</span>
            <span className="font-mono text-xl font-bold text-emerald-400">R$ {parseFloat(os.valor_total || 0).toFixed(2)}</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-950/80 border border-indigo-800 rounded-xl text-indigo-400">
                <QrCode className="h-8 w-8" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Pagamento Instantâneo via PIX</span>
                <span className="text-[11px] text-slate-400">Aponte a câmera ou use o Copia e Cola</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`00020101021226580014BR.GOV.BCB.PIX2536os-${os.numero_os}@scalle.com.br520400005303986540${os.valor_total}5802BR5915SCALLE_SERVICOS6008BRASIL62070503***6304`);
                setPixCopiado(true);
                setTimeout(() => setPixCopiado(false), 2500);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition shadow-lg shadow-indigo-600/30"
            >
              {pixCopiado ? 'Chave Copiada!' : 'Copiar Chave PIX'}
            </button>
          </div>
        </div>

        {/* Rodapé de Impressão */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Comprovante
          </button>
        </div>

      </div>
    </div>
  );
}