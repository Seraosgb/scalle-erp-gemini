import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  Folder, FileText, Upload, Plus, ChevronRight,
  HardDrive, ShieldCheck, Image as ImageIcon,
  FileArchive, FileSpreadsheet, File, X, AlertTriangle, CheckCircle2,
  Download
} from 'lucide-react';

export default function CofreDigitalPage() {
  const [pastaAtual, setPastaAtual] = useState(null);
  const [caminho, setCaminho] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [modalNovaPasta, setModalNovaPasta] = useState(false);
  const [nomePasta, setNomePasta] = useState('');
  const fileInputRef = useRef(null);

  const carregarCofre = async (pastaId = null) => {
    setLoading(true);
    try {
      const res = await api.get('/ged/listar', { params: { pasta_id: pastaId } });
      const { caminho: novoCaminho, pastas: novasPastas, documentos: novosDocs } = res.data.data;

      setCaminho(novoCaminho || []);
      setPastas(novasPastas || []);
      setDocumentos(novosDocs || []);
      setPastaAtual(pastaId);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao carregar o diretório do Cofre Digital.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCofre();
  }, []);

  const handleCriarPasta = async (e) => {
    e.preventDefault();
    if (!nomePasta.trim()) return;
    try {
      await api.post('/ged/pastas', { nome: nomePasta, pasta_pai_id: pastaAtual });
      setModalNovaPasta(false);
      setNomePasta('');
      setFeedback({ tipo: 'sucesso', msg: 'Pasta corporativa criada com sucesso!' });
      carregarCofre(pastaAtual);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao criar pasta.' });
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Bloqueio preventivo no Frontend antes do Middleware (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setFeedback({ tipo: 'erro', msg: 'O arquivo excede o limite máximo de 20MB.' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('arquivo', file);
    if (pastaAtual) {
      formData.append('pasta_id', pastaAtual);
    }

    try {
      await api.post('/ged/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFeedback({ tipo: 'sucesso', msg: 'Arquivo criptografado e armazenado no Cofre!' });
      carregarCofre(pastaAtual);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao enviar o arquivo. Verifique a cota do seu plano.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('image')) return <ImageIcon className="h-8 w-8 text-emerald-400" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-rose-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className="h-8 w-8 text-emerald-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="h-8 w-8 text-amber-500" />;
    return <File className="h-8 w-8 text-slate-400" />;
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Cofre Digital (GED)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gestão Eletrônica de Documentos corporativos e anexos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalNovaPasta(true)}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold py-2 px-4 rounded-xl transition cursor-pointer"
          >
            <Folder className="h-4 w-4" /> Nova Pasta
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-sm font-medium shadow-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {feedback.msg}
          </div>
          <button onClick={() => setFeedback(null)} className="hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Navegação / Breadcrumbs */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 overflow-x-auto text-sm font-semibold whitespace-nowrap shadow-sm">
        <button
          onClick={() => carregarCofre(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition ${!pastaAtual ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <HardDrive className="h-4 w-4" /> Disco Raiz
        </button>

        {caminho.map((p, index) => (
          <React.Fragment key={p.id}>
            <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
            <button
              onClick={() => carregarCofre(p.id)}
              className={`cursor-pointer transition ${index === caminho.length - 1 ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {p.nome}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Explorer Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[400px] shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold">Acessando o cofre seguro...</p>
          </div>
        ) : pastas.length === 0 && documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-950/50">
            <Folder className="h-12 w-12 text-slate-700 mb-3" />
            <p className="font-bold">Esta pasta está vazia.</p>
            <p className="text-xs mt-1">Crie uma nova subpasta ou faça upload de um arquivo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Pastas */}
            {pastas.map((pasta) => (
              <div
                key={pasta.id}
                onClick={() => carregarCofre(pasta.id)}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition group shadow-sm"
              >
                <Folder className="h-10 w-10 text-indigo-400 group-hover:text-indigo-300 mb-2 transition" fill="currentColor" fillOpacity={0.2} />
                <span className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2 w-full px-1">{pasta.nome}</span>
              </div>
            ))}

            {/* Documentos */}
            {documentos.map((doc) => {
              const urlBase = api.defaults.baseURL?.replace('/api', '') || '';
              const docUrl = `${urlBase}/storage/${doc.caminho_s3}`;

              return (
                <a
                  key={doc.id}
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 p-4 rounded-xl flex flex-col items-center justify-between text-center cursor-pointer transition group shadow-sm relative h-32"
                  title={`${doc.nome_original} \nEnviado por: ${doc.uploader?.name || 'Sistema'}`}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-slate-800 p-1 rounded text-slate-300 hover:text-white">
                      <Download className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center mt-2">
                    {getFileIcon(doc.mime_type)}
                  </div>

                  <div className="w-full mt-2">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-1 break-all px-1">
                      {doc.nome_original}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {formatBytes(doc.tamanho_bytes)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Pasta */}
      {modalNovaPasta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Folder className="h-5 w-5 text-indigo-400" /> Criar Nova Pasta
              </h3>
            </div>
            <form onSubmit={handleCriarPasta} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome da Pasta</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Contratos, Relatórios..."
                  value={nomePasta}
                  onChange={(e) => setNomePasta(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaPasta(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
