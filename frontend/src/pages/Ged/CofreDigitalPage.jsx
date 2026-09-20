import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Folder, File, FileText, Upload, FolderPlus, ArrowLeft, MoreVertical, Search, Lock, ShieldCheck } from 'lucide-react';

export default function CofreDigitalPage() {
    const [pastas, setPastas] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [pastaAtual, setPastaAtual] = useState(null); // null = Raiz
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const fileInputRef = useRef(null);

    const carregarPasta = async (pastaId = null) => {
        setLoading(true);
        try {
            const params = pastaId ? { pasta_id: pastaId } : {};
            if (busca) params.search = busca;

            const res = await api.get('/ged/listar', { params });
            const data = res.data?.data || res.data;

            setPastas(data.pastas || []);
            setDocumentos(data.documentos || []);

            if (data.pasta_atual) {
                setPastaAtual(data.pasta_atual);
                setBreadcrumbs(data.breadcrumbs || []);
            } else {
                setPastaAtual(null);
                setBreadcrumbs([]);
            }
        } catch (err) {
            console.error("Erro ao carregar GED", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarPasta(pastaAtual?.id);
    }, [busca]); // Recarrega se a busca mudar

    const entrarNaPasta = (pasta) => {
        setBusca('');
        carregarPasta(pasta.id);
    };

    const voltarParaRaiz = () => {
        setBusca('');
        carregarPasta(null);
    };

    const criarNovaPasta = async () => {
        const nome = prompt("Nome da nova pasta:");
        if (!nome) return;

        try {
            await api.post('/ged/pastas', {
                nome,
                pasta_pai_id: pastaAtual ? pastaAtual.id : null,
                cor_hex: '#4f46e5'
            });
            carregarPasta(pastaAtual?.id);
        } catch (err) {
            alert("Erro ao criar pasta.");
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const processarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('arquivo', file);
        if (pastaAtual) {
            formData.append('pasta_id', pastaAtual.id);
        }

        try {
            await api.post('/ged/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Arquivo salvo no Cofre Digital com segurança!");
            carregarPasta(pastaAtual?.id);
        } catch (err) {
            alert(err.response?.data?.error?.message || "Erro no upload do arquivo.");
        } finally {
            e.target.value = null; // Reseta o input
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const getFileIcon = (ext) => {
        if (['pdf'].includes(ext)) return <FileText className="text-rose-500" />;
        if (['jpg', 'jpeg', 'png'].includes(ext)) return <File className="text-emerald-500" />;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <File className="text-green-600" />;
        return <File className="text-indigo-400" />;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto text-slate-200 space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-emerald-400" />
                        Cofre Digital & GED
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Gestão Eletrônica de Documentos protegida por Tenant</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar arquivos..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <button onClick={criarNovaPasta} className="p-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 hover:text-white transition" title="Nova Pasta">
                        <FolderPlus className="h-5 w-5" />
                    </button>
                    <button onClick={handleUploadClick} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition">
                        <Upload className="h-4 w-4" /> Upload
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={processarUpload} />
                </div>
            </header>

            {/* Navegação / Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800">
                <button onClick={voltarParaRaiz} className={`font-semibold transition ${!pastaAtual ? 'text-white' : 'text-slate-400 hover:text-indigo-400 cursor-pointer'}`}>
                    Meu Cofre
                </button>
                {breadcrumbs.map((b, index) => (
                    <React.Fragment key={b.id}>
                        <span className="text-slate-600">/</span>
                        <button onClick={() => carregarPasta(b.id)} className={`font-semibold transition ${index === breadcrumbs.length - 1 ? 'text-white' : 'text-slate-400 hover:text-indigo-400 cursor-pointer'}`}>
                            {b.nome}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500 font-bold">Descriptografando diretório...</div>
            ) : (
                <div className="space-y-6">
                    {/* PASTAS */}
                    {pastas.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pastas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {pastas.map(pasta => (
                                    <div
                                        key={pasta.id}
                                        onDoubleClick={() => entrarNaPasta(pasta)}
                                        className="bg-slate-900 border border-slate-800 hover:border-indigo-500 p-4 rounded-2xl cursor-pointer group transition shadow-sm select-none"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <Folder className="h-8 w-8" style={{ color: pasta.cor_hex || '#4f46e5' }} fill={pasta.cor_hex || '#4f46e5'} fillOpacity={0.2} />
                                            {pasta.is_sistema && <Lock className="h-3 w-3 text-slate-600" title="Pasta nativa do sistema" />}
                                        </div>
                                        <p className="font-bold text-slate-200 text-sm truncate group-hover:text-indigo-400 transition">{pasta.nome}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTOS */}
                    {documentos.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-t border-slate-800 pt-4">Arquivos</h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
                                        <tr>
                                            <th className="p-4 font-semibold">Nome do Arquivo</th>
                                            <th className="p-4 font-semibold hidden sm:table-cell">Data Modificação</th>
                                            <th className="p-4 font-semibold text-right">Tamanho</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {documentos.map(doc => (
                                            <tr key={doc.id} className="hover:bg-slate-800/40 transition group cursor-pointer" onClick={() => window.open(`${api.defaults.baseURL.replace('/api', '')}/storage/${doc.caminho_s3}`, '_blank')}>
                                                <td className="p-4 flex items-center gap-3 text-white font-medium">
                                                    {getFileIcon(doc.extensao?.toLowerCase())}
                                                    <span className="truncate max-w-[200px] sm:max-w-md group-hover:text-indigo-400 transition">{doc.nome_original}</span>
                                                </td>
                                                <td className="p-4 text-slate-400 hidden sm:table-cell">
                                                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="p-4 text-right font-mono text-slate-400">
                                                    {formatBytes(doc.tamanho_bytes)}
                                                    <button className="ml-4 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition" title="Opções"><MoreVertical size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {pastas.length === 0 && documentos.length === 0 && (
                        <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                            Nenhum documento ou pasta neste diretório.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
