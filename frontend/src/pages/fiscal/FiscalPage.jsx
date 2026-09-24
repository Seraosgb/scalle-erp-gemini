import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, CheckCircle2, AlertTriangle, X, Ban, Edit3, RefreshCw, FileSearch } from 'lucide-react';

export default function FiscalPage() {
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState(null);

    // Estados para Modais
    const [modalCancelar, setModalCancelar] = useState(false);
    const [modalCCe, setModalCCe] = useState(false);
    const [docSelecionado, setDocSelecionado] = useState(null);
    const [textoEvento, setTextoEvento] = useState('');
    const [processando, setProcessando] = useState(false);

    useEffect(() => {
        carregarDocumentos();
    }, []);

    const carregarDocumentos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/fiscal/documentos');
            setDocumentos(res.data?.data || []);
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: 'Erro ao carregar documentos fiscais.' });
        } finally {
            setLoading(false);
        }
    };

    const abrirModalCancelar = (doc) => {
        setDocSelecionado(doc);
        setTextoEvento('');
        setModalCancelar(true);
    };

    const abrirModalCCe = (doc) => {
        setDocSelecionado(doc);
        setTextoEvento('');
        setModalCCe(true);
    };

    const handleCancelarNfe = async (e) => {
        e.preventDefault();
        setProcessando(true);
        try {
            const res = await api.post(`/fiscal/${docSelecionado.id}/cancelar`, {
                justificativa: textoEvento
            });
            setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message });
            setModalCancelar(false);
            carregarDocumentos();
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cancelar NF-e.' });
        } finally {
            setProcessando(false);
        }
    };

    const handleCCe = async (e) => {
        e.preventDefault();
        setProcessando(true);
        try {
            const res = await api.post(`/fiscal/${docSelecionado.id}/carta-correcao`, {
                correcao: textoEvento
            });
            setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message });
            setModalCCe(false);
            carregarDocumentos();
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao enviar CC-e.' });
        } finally {
            setProcessando(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="h-6 w-6 text-indigo-500" /> Monitor Fiscal (SEFAZ)
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">Gestão centralizada de NF-e, NFC-e e Eventos Fiscais.</p>
                </div>
                <button
                    onClick={carregarDocumentos}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Painel
                </button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2">
                        {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="font-medium">{feedback.msg}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Tabela Principal */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
                            <tr>
                                <th className="py-3.5 px-4">Documento</th>
                                <th className="py-3.5 px-4">Destinatário</th>
                                <th className="py-3.5 px-4">Data Emissão</th>
                                <th className="py-3.5 px-4 text-right">Valor Total</th>
                                <th className="py-3.5 px-4 text-center">Status SEFAZ</th>
                                <th className="py-3.5 px-4 text-right">Eventos (Ações)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-500"><RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />Carregando base fiscal...</td></tr>
                            ) : documentos.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-500 flex flex-col items-center"><FileSearch className="h-8 w-8 mb-2 opacity-50" />Nenhum documento emitido.</td></tr>
                            ) : (
                                documentos.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-indigo-400">NF-e {doc.numero_documento || 'S/N'}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5" title={doc.chave_acesso}>
                                                {doc.chave_acesso ? `${doc.chave_acesso.substring(0, 16)}...` : 'Sem chave'}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-white font-medium">
                                            {doc.destinatario?.nome_razao_social || 'Consumidor'}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                                            {doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                                            R$ {Number(doc.valor_total || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                doc.status === 'AUTORIZADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                                doc.status === 'CANCELADO' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                                doc.status === 'PROCESSANDO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' :
                                                'bg-slate-800 text-slate-400'
                                            }`}>
                                                {doc.status}
                                            </span>
                                            {doc.mensagem_sefaz && (
                                                <div className="text-[9px] text-slate-500 mt-1 max-w-[150px] truncate mx-auto" title={doc.mensagem_sefaz}>
                                                    {doc.mensagem_sefaz}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => abrirModalCCe(doc)}
                                                    disabled={doc.status !== 'AUTORIZADO'}
                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-400 rounded-lg transition"
                                                    title="Emitir Carta de Correção (CC-e)"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => abrirModalCancelar(doc)}
                                                    disabled={doc.status !== 'AUTORIZADO'}
                                                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-30 disabled:cursor-not-allowed text-rose-400 border border-rose-900 rounded-lg transition"
                                                    title="Cancelar NF-e"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Cancelamento */}
            {modalCancelar && docSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                                <Ban className="h-5 w-5" /> Cancelar NF-e
                            </h3>
                            <button onClick={() => setModalCancelar(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="bg-rose-950/20 border border-rose-900/50 p-3 rounded-xl text-xs text-rose-300">
                            Atenção: O cancelamento só é permitido se a mercadoria ainda não circulou e se estiver dentro do prazo legal (geralmente 24h).
                        </div>
                        <form onSubmit={handleCancelarNfe} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Justificativa Legal (mín. 15 caracteres) *</label>
                                <textarea
                                    required
                                    minLength={15}
                                    maxLength={255}
                                    rows="4"
                                    value={textoEvento}
                                    onChange={(e) => setTextoEvento(e.target.value)}
                                    placeholder="Ex: Erro na digitação do valor unitário do produto."
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-rose-500 focus:outline-none"
                                />
                                <div className="text-right text-[10px] text-slate-500 mt-1">{textoEvento.length}/255</div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button type="button" onClick={() => setModalCancelar(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Cancelar Operação</button>
                                <button type="submit" disabled={processando || textoEvento.length < 15} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition">
                                    {processando ? 'Transmitindo...' : 'Confirmar Cancelamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal CC-e */}
            {modalCCe && docSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2">
                                <Edit3 className="h-5 w-5" /> Carta de Correção (CC-e)
                            </h3>
                            <button onClick={() => setModalCCe(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="bg-indigo-950/20 border border-indigo-900/50 p-3 rounded-xl text-xs text-indigo-300">
                            A Carta de Correção é permitida apenas para erros que não afetem as variáveis que determinam o valor do imposto (base de cálculo, alíquota, valor) ou dados cadastrais essenciais.
                        </div>
                        <form onSubmit={handleCCe} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Texto da Correção (mín. 15 caracteres) *</label>
                                <textarea
                                    required
                                    minLength={15}
                                    maxLength={1000}
                                    rows="4"
                                    value={textoEvento}
                                    onChange={(e) => setTextoEvento(e.target.value)}
                                    placeholder="Ex: Onde se lê Rua A, leia-se Rua B no endereço de entrega."
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none"
                                />
                                <div className="text-right text-[10px] text-slate-500 mt-1">{textoEvento.length}/1000</div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button type="button" onClick={() => setModalCCe(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Cancelar Operação</button>
                                <button type="submit" disabled={processando || textoEvento.length < 15} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition">
                                    {processando ? 'Transmitindo...' : 'Averbar Correção'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
