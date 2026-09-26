import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileText, ShieldCheck, Server, UploadCloud, RefreshCw,
  CheckCircle2, AlertTriangle, X, Lock, KeyRound, Activity
} from 'lucide-react';

export default function FiscalPage() {
  const [certificado, setCertificado] = useState(null);
  const [sefazStatus, setSefazStatus] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testandoSefaz, setTestandoSefaz] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal de Upload do Certificado A1
  const [modalUpload, setModalUpload] = useState(false);
  const [formCertificado, setFormCertificado] = useState({
    arquivo: null,
    senha: '',
    ambiente_emissao: 'HOMOLOGACAO'
  });
  const [fazendoUpload, setFazendoUpload] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Tenta buscar o certificado ativo e os documentos
      const [resCert, resDocs] = await Promise.allSettled([
        api.get('/fiscal/certificado'),
        api.get('/fiscal/documentos')
      ]);

      if (resCert.status === 'fulfilled' && resCert.value.data?.data) {
        setCertificado(resCert.value.data.data);
      } else {
        setCertificado(null);
      }

      if (resDocs.status === 'fulfilled' && resDocs.value.data?.data) {
        setDocumentos(resDocs.value.data.data);
      }

    } catch (error) {
      console.error("Erro ao carregar módulo fiscal", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const pingSefaz = async () => {
    if (!certificado) {
      setFeedback({ tipo: 'erro', msg: 'Faça o upload do Certificado A1 antes de testar a SEFAZ.' });
      return;
    }

    setTestandoSefaz(true);
    setSefazStatus(null);
    try {
      const res = await api.get('/fiscal/status-sefaz');
      setSefazStatus(res.data?.data?.sefaz);
      setFeedback({ tipo: 'sucesso', msg: 'Comunicação com a SEFAZ estabelecida com sucesso!' });
    } catch (err) {
      setSefazStatus({ status_code: 500, motivo: err.response?.data?.error?.message || 'Falha de comunicação' });
      setFeedback({ tipo: 'erro', msg: 'Falha ao comunicar com os servidores da SEFAZ.' });
    } finally {
      setTestandoSefaz(false);
    }
  };

  const handleUploadCertificado = async (e) => {
    e.preventDefault();
    if (!formCertificado.arquivo) return;

    setFazendoUpload(true);
    const data = new FormData();
    data.append('certificado', formCertificado.arquivo);
    data.append('senha', formCertificado.senha);
    data.append('ambiente_emissao', formCertificado.ambiente_emissao);

    try {
      const res = await api.post('/fiscal/certificado/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message || 'Certificado importado com sucesso!' });
      setModalUpload(false);
      setFormCertificado({ arquivo: null, senha: '', ambiente_emissao: 'HOMOLOGACAO' });
      await carregarDados();

      // Auto-testa a SEFAZ após upload bem-sucedido
      pingSefaz();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao descriptografar o certificado. Verifique a senha.' });
    } finally {
      setFazendoUpload(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-500" /> Motor Fiscal & Mensageria SEFAZ
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestão de Certificados ICP-Brasil, NF-e, NFC-e e monitoramento do webservice.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregarDados}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Atualizar Dados"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" /> Importar Certificado A1
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span className="font-semibold">{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Certificado Digital */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${certificado ? (certificado.is_expirado ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400') : 'bg-slate-800 text-slate-400'}`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Certificado Digital (e-CNPJ A1)</h2>
                <p className="text-[11px] text-slate-400">Armazenamento Criptografado (AES-256)</p>
              </div>
            </div>
            {certificado && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${certificado.ambiente_emissao === 'PRODUCAO' ? 'bg-indigo-950 border-indigo-800 text-indigo-300' : 'bg-amber-950 border-amber-800 text-amber-300'}`}>
                {certificado.ambiente_emissao}
              </span>
            )}
          </div>

          {certificado ? (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Razão Social Vinculada</p>
                <p className="text-sm font-bold text-slate-200">{certificado.razao_social}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">CNPJ: {certificado.cnpj_certificado?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") || 'N/A'}</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Validade ICP-Brasil</p>
                  <p className={`text-sm font-mono font-bold ${certificado.is_expirado ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {new Date(certificado.valido_ate).toLocaleDateString('pt-BR')} {new Date(certificado.valido_ate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                {certificado.is_expirado && <span className="text-[10px] font-bold text-rose-500 bg-rose-950/40 px-2 py-1 rounded">EXPIRADO</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500 border-t border-slate-800 border-dashed mt-2">
              <Lock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-semibold">Nenhum Certificado Ativo</p>
              <p className="text-[10px] mt-1 text-center px-4">Faça o upload do arquivo .pfx para habilitar o Motor Fiscal e as assinaturas.</p>
            </div>
          )}
        </div>

        {/* Card 2: Status da SEFAZ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${sefazStatus?.status_code == 107 ? 'bg-emerald-950 text-emerald-400' : (sefazStatus ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400')}`}>
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Webservice SEFAZ</h2>
                <p className="text-[11px] text-slate-400">Monitoramento de Disponibilidade</p>
              </div>
            </div>
            <button
              onClick={pingSefaz}
              disabled={testandoSefaz || !certificado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Activity className={`h-3.5 w-3.5 ${testandoSefaz ? 'animate-pulse' : ''}`} />
              {testandoSefaz ? 'Ping...' : 'Testar Conexão'}
            </button>
          </div>

          <div className="border-t border-slate-800 pt-4 flex-1 flex flex-col justify-center">
            {sefazStatus ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold uppercase">cStat (Código)</span>
                  <span className={`font-mono font-bold text-sm ${sefazStatus.status_code == 107 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sefazStatus.status_code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Retorno Sefaz</span>
                  <span className="text-xs font-bold text-white truncate max-w-[200px]" title={sefazStatus.motivo}>
                    {sefazStatus.motivo}
                  </span>
                </div>
                {sefazStatus.tempo_medio > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Tempo de Resposta (tMed)</span>
                    <span className="text-xs font-mono text-sky-400 font-bold">{sefazStatus.tempo_medio} seg</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <p className="text-xs font-semibold">Status Desconhecido</p>
                <p className="text-[10px] mt-1">Clique em "Testar Conexão" para realizar um ping assinado nos servidores estaduais.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Últimos Documentos Fiscais (NF-e / NFC-e)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[800px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] sm:text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Modelo/Série</th>
                <th className="py-3 px-4">Número</th>
                <th className="py-3 px-4">Destinatário</th>
                <th className="py-3 px-4">Emissão</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status Sefaz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 font-sans text-xs">
                    Nenhum documento fiscal emitido ainda. Fature uma Venda ou Ordem de Serviço.
                  </td>
                </tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-indigo-400">
                      Mod {doc.modelo_documento} / {doc.serie}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">{doc.numero_documento || '-'}</td>
                    <td className="py-3 px-4 font-sans text-slate-300 truncate max-w-[200px]">
                      {doc.destinatario?.nome_razao_social || 'Consumidor Final'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')} {new Date(doc.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      R$ {parseFloat(doc.valor_total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.status === 'AUTORIZADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        doc.status === 'PROCESSANDO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse' :
                        doc.status === 'CANCELADO' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upload Certificado */}
      {modalUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                Importar Certificado A1 (.pfx)
              </h2>
              <button onClick={() => setModalUpload(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleUploadCertificado} className="p-6 space-y-5 text-xs text-slate-300">
              <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl text-[11px] text-amber-400 flex items-start gap-2">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <p>O arquivo e a senha são criptografados com o algoritmo <strong>AES-256-CBC</strong> antes de irem para o banco de dados. Nós não armazenamos a sua senha em texto puro.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Arquivo do Certificado (*.pfx / *.p12)</label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  required
                  onChange={(e) => setFormCertificado({ ...formCertificado, arquivo: e.target.files[0] })}
                  className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer border border-slate-800 rounded-lg bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Senha de Instalação do Certificado</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formCertificado.senha}
                  onChange={(e) => setFormCertificado({ ...formCertificado, senha: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-medium tracking-widest"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Ambiente de Operação SEFAZ</label>
                <select
                  value={formCertificado.ambiente_emissao}
                  onChange={(e) => setFormCertificado({ ...formCertificado, ambiente_emissao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                >
                  <option value="HOMOLOGACAO">Homologação (Sem Valor Fiscal - Testes)</option>
                  <option value="PRODUCAO">Produção (Validade Jurídica)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalUpload(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition cursor-pointer">Cancelar</button>
                <button type="submit" disabled={fazendoUpload} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2">
                  {fazendoUpload ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {fazendoUpload ? 'Criptografando...' : 'Salvar Certificado Seguro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
