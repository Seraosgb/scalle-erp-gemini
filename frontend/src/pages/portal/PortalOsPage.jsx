import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Wrench, CheckCircle2, AlertTriangle, Clock, User, 
  Building2, QrCode, Copy, Printer, ShieldCheck, Camera, Check, FileText
} from 'lucide-react';

export default function PortalOsPage() {
  const { token } = useParams();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [processandoAprovacao, setProcessandoAprovacao] = useState(false);

  const carregarOs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/portal/os/${token}`);
      setOs(res.data.data);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Ordem de Serviço não localizada ou link expirado.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOs();
  }, [token]);

  const handleCopiarPix = () => {
    if (os?.pix?.payload_copia_cola) {
      navigator.clipboard.writeText(os.pix.payload_copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const handleAprovar = async () => {
    if (!confirm('Confirma a aprovação do orçamento e autorização da execução dos serviços?')) return;
    setProcessandoAprovacao(true);
    try {
      const res = await axios.post(`/api/portal/os/${token}/aprovar`);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarOs();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao processar aprovação.' });
    } finally {
      setProcessandoAprovacao(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando dados da Ordem de Serviço...</span>
        </div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">OS Não Encontrada</h2>
          <p className="text-xs text-slate-400">Este link de autoatendimento é inválido ou foi encerrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* Header do Estabelecimento */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Building2 className="h-4 w-4" />
            <span>{os.empresa?.nome || 'Scalle ERP'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Ordem de Serviço #{os.numero_os}</h1>
          <p className="text-xs text-slate-400">Equipamento: <strong className="text-slate-200">{os.equipamento}</strong> {os.marca_modelo ? `(${os.marca_modelo})` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            os.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
            os.status === 'EM_EXECUCAO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
            'bg-amber-950 text-amber-300 border border-amber-800'
          }`}>
            {os.status}
          </span>
          <button type="button" onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer">
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/90 border border-emerald-800 text-emerald-300' : 'bg-rose-950/90 border border-rose-800 text-rose-300'
        }`}>
          {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Relato e Laudo Técnico */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-400" /> Detalhamento dos Serviços
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-slate-500 font-bold block">Solicitação / Defeito Reclamado:</span>
            <p className="text-slate-200">{os.defeito_reclamado}</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-slate-500 font-bold block">Diagnóstico / Laudo Técnico:</span>
            <p className="text-slate-200">{os.servico_executado || os.diagnostico_tecnico || 'Aguardando encerramento técnico.'}</p>
          </div>
        </div>

        {/* Tabela de Peças e Valores */}
        <div className="border border-slate-800 rounded-xl overflow-hidden mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Item / Peça / Serviço</th>
                <th className="py-2.5 px-3 text-center">Qtd</th>
                <th className="py-2.5 px-3 text-right">Valor Un.</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {os.itens?.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5 px-3 font-sans text-slate-200">{it.item?.nome || 'Serviço Técnico Especializado'}</td>
                  <td className="py-2.5 px-3 text-center">{it.quantidade}</td>
                  <td className="py-2.5 px-3 text-right">R$ {parseFloat(it.valor_unitario).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">R$ {parseFloat(it.valor_total).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-950/60 font-bold font-sans">
                <td colSpan="3" className="py-3 px-3 text-right text-white">VALOR TOTAL:</td>
                <td className="py-3 px-3 text-right text-sm text-emerald-400 font-mono font-bold">R$ {os.valor_total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Botão de Aprovação de Orçamento (Se não concluída) */}
        {os.status !== 'CONCLUIDA' && os.status !== 'EM_EXECUCAO' && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={processandoAprovacao}
              onClick={handleAprovar}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition"
            >
              <Check className="h-4 w-4" /> Aprovar Orçamento & Autorizar Execução
            </button>
          </div>
        )}
      </div>

      {/* Evidências Fotográficas */}
      {os.fotos?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-indigo-400" /> Evidências Fotográficas do Atendimento
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {os.fotos.map((f) => (
              <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <img src={f.url_arquivo} alt="Evidência" className="h-28 w-full object-cover" />
                <div className="p-2 text-[10px] flex justify-between items-center">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${f.tipo_etapa === 'ANTES' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>{f.tipo_etapa}</span>
                  <span className="text-slate-500 truncate max-w-[100px]">{f.descricao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagamento Instantâneo via PIX */}
      {os.valor_total > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-emerald-400" /> Pagamento Instantâneo via PIX
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
              <img src={os.pix.qr_code_url} alt="QR Code PIX" className="w-40 h-40" />
            </div>
            <div className="space-y-3 flex-1 w-full text-xs">
              <div>
                <span className="text-slate-400 block">Total a Pagar:</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">R$ {os.valor_total.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Código PIX Copia e Cola:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={os.pix.payload_copia_cola}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopiarPix}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition shadow-md"
                  >
                    {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Abra o app do seu banco, escolha a opção <strong>PIX Copia e Cola</strong> ou aponte a câmera para o QR Code acima.</p>
            </div>
          </div>
        </div>
      )}

      {/* Aceite Jurídico / Assinatura Coletada */}
      {os.status === 'CONCLUIDA' && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Autenticação Jurídica (MP 2.200-2/2001)
          </h2>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block">Recebedor: <strong className="text-white">{os.nome_responsavel_recebimento}</strong></span>
              <span className="text-slate-500 font-mono text-[10px] block truncate max-w-sm">Hash Criptográfico: {os.hash_assinatura_sha256}</span>
              <span className="text-slate-500 text-[10px] block">Data/Hora: {new Date(os.assinado_em).toLocaleString('pt-BR')}</span>
            </div>
            {os.assinatura_cliente_base64 && (
              <div className="p-1.5 bg-white rounded-xl border border-slate-700">
                <img src={os.assinatura_cliente_base64} alt="Assinatura" className="h-14" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}