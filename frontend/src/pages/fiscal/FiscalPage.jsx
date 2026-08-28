import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  X,
  FileCode, 
  ShieldCheck,
  Upload,
  Lock,
  Calendar,
  Send
} from 'lucide-react';

export default function FiscalPage() {
  const [search, setSearch] = useState('');
  const [modeloFiltro, setModeloFiltro] = useState('');
  
  // Estado do Certificado Digital A1
  const [certificadoAtivo, setCertificadoAtivo] = useState(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [modalCertificado, setModalCertificado] = useState(false);
  const [arquivoCert, setArquivoCert] = useState(null);
  const [senhaCert, setSenhaCert] = useState('');
  const [ambienteCert, setAmbienteCert] = useState('HOMOLOGACAO');
  const [salvandoCert, setSalvandoCert] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Consulta de Documentos Fiscais
  const { data: fiscalResponse, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-documentos', search, modeloFiltro],
    queryFn: async () => {
      const res = await api.get('/fiscal', {
        params: { modelo: modeloFiltro, search }
      });
      return res.data;
    }
  });

  const carregarStatusCertificado = async () => {
    setLoadingCert(true);
    try {
      const res = await api.get('/fiscal/certificado');
      setCertificadoAtivo(res.data?.data || null);
    } catch (err) {
      console.warn('Nenhum certificado A1 configurado no tenant:', err);
      setCertificadoAtivo(null);
    } finally {
      setLoadingCert(false);
    }
  };

  useEffect(() => {
    carregarStatusCertificado();
  }, []);

  const handleUploadCertificadoA1 = async (e) => {
    e.preventDefault();
    if (!arquivoCert || !senhaCert) return;

    setSalvandoCert(true);
    const data = new FormData();
    data.append('certificado', arquivoCert);
    data.append('senha', senhaCert);
    data.append('ambiente_emissao', ambienteCert);

    try {
      const res = await api.post('/fiscal/certificado', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message || 'Certificado A1 importado com sucesso!' });
      setModalCertificado(false);
      setArquivoCert(null);
      setSenhaCert('');
      carregarStatusCertificado();
    } catch (err) {
      const msgErro = err.response?.data?.error?.message || 'Erro ao importar e descriptografar o certificado A1.';
      setFeedback({ tipo: 'erro', msg: msgErro });
    } finally {
      setSalvandoCert(false);
    }
  };

  const rawData = fiscalResponse?.data;
  const documentos = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  const docsFiltrados = documentos.filter((doc) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const dest = doc.destinatario?.nome_razao_social?.toLowerCase() || '';
    const num = String(doc.numero_documento || '');
    const chave = String(doc.chave_acesso || '').toLowerCase();
    return dest.includes(s) || num.includes(s) || chave.includes(s);
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400 shrink-0" />
            <span>Motor Fiscal & Documentos Eletrônicos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Emissão, autorização e guarda de NF-e, NFC-e, NFS-e e matriz tributária IBS/CBS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalCertificado(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" /> 
            {certificadoAtivo ? 'Atualizar Certificado A1' : 'Configurar Certificado A1'}
          </button>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-emerald-400">SEFAZ Online</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Card Status do Certificado Digital A1 */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition ${
        certificadoAtivo 
          ? (certificadoAtivo.is_expirado ? 'bg-rose-950/30 border-rose-800' : 'bg-slate-900/90 border-slate-800')
          : 'bg-amber-950/20 border-amber-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              certificadoAtivo 
                ? (certificadoAtivo.is_expirado ? 'bg-rose-900/50 text-rose-300' : 'bg-emerald-950 text-emerald-400 border border-emerald-800') 
                : 'bg-amber-900/50 text-amber-300'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs sm:text-sm">
                  {certificadoAtivo ? certificadoAtivo.razao_social : 'Nenhum Certificado A1 Ativo no Tenant'}
                </span>
                {certificadoAtivo && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    certificadoAtivo.ambiente_emissao === 'PRODUCAO' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {certificadoAtivo.ambiente_emissao}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {certificadoAtivo ? (
                  <>CNPJ: <span className="font-mono text-slate-300">{certificadoAtivo.cnpj_certificado || 'Vinculado ao Tenant'}</span> | Válido até: <span className="font-mono text-emerald-400 font-semibold">{new Date(certificadoAtivo.valido_ate).toLocaleDateString('pt-BR')}</span></>
                ) : (
                  'Faça o upload do arquivo .pfx/.p12 para habilitar a assinatura digital e emissão oficial de NF-e/NFC-e.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalCertificado(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs self-start sm:self-center cursor-pointer shadow-md transition"
          >
            {certificadoAtivo ? 'Substituir / Gerenciar' : 'Importar A1 Agora'}
          </button>
        </div>
      </div>

      {/* Cards de Métricas Fiscais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total NF-e (Modelo 55)</p>
            <h3 className="text-xl font-mono font-bold text-white mt-1">
              {documentos.filter(d => d.modelo_documento === '55').length} <span className="text-xs text-slate-500">emitidas</span>
            </h3>
          </div>
          <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-indigo-400"><FileCode className="h-5 w-5" /></div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">NFC-e Balcão (Modelo 65)</p>
            <h3 className="text-xl font-mono font-bold text-white mt-1">
              {documentos.filter(d => d.modelo_documento === '65').length} <span className="text-xs text-slate-500">emitidas</span>
            </h3>
          </div>
          <div className="p-2 bg-purple-950/60 border border-purple-800/60 rounded-xl text-purple-400"><FileText className="h-5 w-5" /></div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reforma Tributária (IBS/CBS)</p>
            <h3 className="text-xl font-mono font-bold text-emerald-400 mt-1">
              Conforme
            </h3>
          </div>
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400"><CheckCircle2 className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModeloFiltro('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              modeloFiltro === '' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Todos os Modelos
          </button>
          <button
            type="button"
            onClick={() => setModeloFiltro('55')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              modeloFiltro === '55' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            NF-e (55)
          </button>
          <button
            type="button"
            onClick={() => setModeloFiltro('65')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              modeloFiltro === '65' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            NFC-e (65)
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Destinatário, Número ou Chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
          <thead className="bg-slate-950/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3.5 sm:p-4">Documento</th>
              <th className="p-3.5 sm:p-4">Destinatário</th>
              <th className="p-3.5 sm:p-4">Chave de Acesso</th>
              <th className="p-3.5 sm:p-4 text-right">Valor Total</th>
              <th className="p-3.5 sm:p-4 text-center">Status SEFAZ</th>
              <th className="p-3.5 sm:p-4 text-center">Protocolo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Consultando documentos fiscais...</td>
              </tr>
            ) : docsFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Nenhum documento fiscal encontrado para os filtros selecionados.</td>
              </tr>
            ) : (
              docsFiltrados.map((doc) => {
                const isAutorizado = doc.status === 'AUTORIZADO';
                return (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 sm:p-4">
                      <span className="font-mono text-xs font-bold text-white block">
                        Mod. {doc.modelo_documento} #{doc.numero_documento}
                      </span>
                      <span className="text-[10px] text-slate-500">Série {doc.serie || '1'}</span>
                    </td>
                    <td className="p-3.5 sm:p-4 font-medium text-slate-200">
                      {doc.destinatario?.nome_razao_social || 'Consumidor Final'}
                    </td>
                    <td className="p-3.5 sm:p-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {doc.chave_acesso || '—'}
                    </td>
                    <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-white">
                      R$ {parseFloat(doc.valor_total_documento || 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 sm:p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAutorizado 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3.5 sm:p-4 text-center font-mono text-[11px] text-slate-400">
                      {doc.protocolo_autorizacao || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Upload Certificado Digital A1 */}
      {modalCertificado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Configurar Certificado Digital A1 (.pfx/.p12)
              </h3>
              <button type="button" onClick={() => setModalCertificado(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleUploadCertificadoA1} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Arquivo do Certificado Digital (.pfx / .p12) *</label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  required
                  onChange={(e) => setArquivoCert(e.target.files[0])}
                  className="w-full text-slate-300 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Senha do Certificado *</label>
                  <input
                    type="password"
                    required
                    placeholder="Digite a senha do .pfx"
                    value={senhaCert}
                    onChange={(e) => setSenhaCert(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Ambiente de Emissão *</label>
                  <select
                    value={ambienteCert}
                    onChange={(e) => setAmbienteCert(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="HOMOLOGACAO">Homologação (Testes)</option>
                    <option value="PRODUCAO">Produção Oficial</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1 text-[11px] text-slate-300">
                <span className="font-bold text-indigo-400 block flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Isolamento Criptográfico por Tenant:
                </span>
                <p>O arquivo e sua senha serão armazenados com criptografia simétrica AES-256 atrelada à chave exclusiva do seu tenant.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCertificado(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCert}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold cursor-pointer transition shadow-md"
                >
                  {salvandoCert ? 'Validando OpenSSL...' : 'Importar & Ativar A1'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}