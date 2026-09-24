import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
    FileText, XCircle, Edit3, RefreshCw, AlertTriangle, CheckCircle, Clock, ShieldAlert, X
} from 'lucide-react';

export default function FiscalPage() {
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalEvento, setModalEvento] = useState({ aberto: false, tipo: '', documento: null });
    const [justificativa, setJustificativa] = useState('');
    const [enviandoEvento, setEnviandoEvento] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const carregarDocumentos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/fiscal/documentos');
            setDocumentos(response.data?.data || []);
        } catch (error) {
            setFeedback({ tipo: 'erro', msg: 'Erro ao buscar documentos fiscais' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDocumentos();
    }, []);

    const abrirModal = (doc, tipo) => {
        setModalEvento({ aberto: true, tipo, documento: doc });
        setJustificativa('');
        setFeedback(null);
    };

    const enviarEvento = async (e) => {
        e.preventDefault();
        setEnviandoEvento(true);
        setFeedback(null);

        try {
            let endpoint = '';
            let payload = {};

            if (modalEvento.tipo === 'CANCELAMENTO') {
                endpoint = `/fiscal/${modalEvento.documento.id}/cancelar`;
                payload = { justificativa: justificativa };
            } else if (modalEvento.tipo === 'CCE') {
                endpoint = `/fiscal/${modalEvento.documento.id}/carta-correcao`;
                payload = { correcao: justificativa };
            }

            const response = await api.post(endpoint, payload);

            setFeedback({ tipo: 'sucesso', msg: response.data?.data?.message || `Solicitação de ${modalEvento.tipo} processada!` });
            setModalEvento({ aberto: false, tipo: '', documento: null });
            carregarDocumentos();
        } catch (error) {
            setFeedback({ tipo: 'erro', msg: error.response?.data?.error?.message || 'Erro ao enviar evento para a SEFAZ.' });
        } finally {
            setEnviandoEvento(false);
        }
    };

    const BadgeStatus = ({ status }) => {
        const cores = {
            'AUTORIZADO': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'PROCESSANDO': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            'CANCELAMENTO_PENDENTE': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'CCE_PENDENTE': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'CANCELADO': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            'FALHA_COMUNICACAO': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border ${cores[status] || 'bg-slate-800 text-slate-400'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-indigo-500" />
                        Motor Fiscal SEFAZ
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Gerenciamento de NF-e, NFC-e e NFS-e</p>
                </div>
                <button onClick={carregarDocumentos} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer shadow-sm">
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {feedback && !modalEvento.aberto && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2">
                        {feedback.tipo === 'sucesso' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="font-medium">{feedback.msg}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                        <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-medium">
                            <tr>
                                <th className="p-4">Documento</th>
                                <th className="p-4">Cliente / Destinatário</th>
                                <th className="p-4">Emissão</th>
                                <th className="p-4">Valor (R$)</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações SEFAZ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading && documentos.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-slate-400 font-medium text-center">Carregando painel fiscal...</td></tr>
                            ) : documentos.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhum documento emitido neste tenant.</td></tr>
                            ) : (
                                documentos.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-800/20 transition">
                                        <td className="p-4 font-mono font-medium text-indigo-400">
                                            Mod {doc.modelo_documento} - {doc.numero_documento || 'S/N'}
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 hidden sm:block" title={doc.chave_acesso}>
                                                {doc.chave_acesso ? `${doc.chave_acesso.substring(0, 16)}...` : 'Sem chave'}
                                            </div>
                                        </td>
                                        <td className="p-4 truncate max-w-[200px] text-white">
                                            {doc.destinatario?.nome_razao_social || 'Consumidor Final'}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="p-4 font-bold text-emerald-400 font-mono">
                                            {Number(doc.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="p-4 text-center">
                                            <BadgeStatus status={doc.status} />
                                            {doc.mensagem_sefaz && (
                                                <div className="text-[9px] text-slate-500 mt-1 max-w-[150px] truncate mx-auto" title={doc.mensagem_sefaz}>
                                                    {doc.mensagem_sefaz}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => abrirModal(doc, 'CCE')}
                                                title="Carta de Correção"
                                                disabled={doc.status !== 'AUTORIZADO'}
                                                className="p-2 bg-slate-800 hover:bg-indigo-900/50 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-400 rounded-lg transition cursor-pointer inline-flex"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => abrirModal(doc, 'CANCELAMENTO')}
                                                title="Cancelar NF-e"
                                                disabled={doc.status !== 'AUTORIZADO'}
                                                className="p-2 bg-slate-800 hover:bg-rose-900/50 disabled:opacity-30 disabled:cursor-not-allowed text-rose-400 rounded-lg transition cursor-pointer inline-flex"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Eventos Fiscais */}
            {modalEvento.aberto && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                {modalEvento.tipo === 'CANCELAMENTO' ? <XCircle className="text-rose-500" /> : <Edit3 className="text-indigo-500" />}
                                {modalEvento.tipo === 'CANCELAMENTO' ? 'Cancelar Documento' : 'Carta de Correção (CC-e)'}
                            </h2>
                            <button onClick={() => setModalEvento({aberto: false, tipo: '', documento: null})} className="text-slate-500 hover:text-white cursor-pointer">&times;</button>
                        </div>

                        {feedback && (
                            <div className="p-3 mb-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{feedback.msg}</span>
                            </div>
                        )}

                        <p className="text-sm text-slate-400 mb-4">
                            NF-e: <strong className="text-slate-200">{modalEvento.documento.numero_documento}</strong> <br/>
                            Atenção: Esta operação envia um evento irreversível para a SEFAZ.
                        </p>

                        <form onSubmit={enviarEvento} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5">Justificativa Legal (Mín. 15 caracteres)</label>
                                <textarea required minLength="15" rows="4"
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl p-3 focus:border-indigo-500 outline-none resize-none"
                                    placeholder={modalEvento.tipo === 'CANCELAMENTO' ? 'Motivo do cancelamento...' : 'O que está sendo corrigido...'}
                                    value={justificativa}
                                    onChange={(e) => setJustificativa(e.target.value)}
                                />
                                <div className="text-right text-[10px] text-slate-500 mt-1">{justificativa.length} caracteres</div>
                            </div>
                            <div className="flex gap-3 pt-2 border-t border-slate-800">
                                <button type="button" onClick={() => setModalEvento({aberto: false, tipo: '', documento: null})} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-700 cursor-pointer">
                                    Cancelar Operação
                                </button>
                                <button type="submit" disabled={enviandoEvento || justificativa.length < 15} className={`flex-1 py-2.5 font-bold text-sm rounded-xl text-white shadow-lg transition cursor-pointer disabled:opacity-50 ${modalEvento.tipo === 'CANCELAMENTO' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
                                    {enviandoEvento ? 'Processando...' : 'Assinar e Enviar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
