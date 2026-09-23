import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, FileText, ArrowRightLeft, DollarSign, X } from 'lucide-react';

export default function ConciliacaoBancaria() {
    const [contas, setContas] = useState([]);
    const [contaSelecionada, setContaSelecionada] = useState('');
    const [arquivoOfx, setArquivoOfx] = useState(null);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [extrato, setExtrato] = useState([]);
    const [resumoProcessamento, setResumoProcessamento] = useState(null);

    // Estado para processar a liquidação
    const [conciliandoId, setConciliandoId] = useState(null);

    useEffect(() => {
        carregarContas();
    }, []);

    const carregarContas = async () => {
        try {
            const res = await api.get('/financeiro/contas');
            setContas(res.data?.data || []);
            if (res.data?.data?.length > 0) {
                setContaSelecionada(res.data.data[0].id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUploadOfx = async (e) => {
        e.preventDefault();
        if (!arquivoOfx || !contaSelecionada) return;

        setLoading(true);
        setFeedback(null);

        const formData = new FormData();
        formData.append('arquivo_ofx', arquivoOfx);
        formData.append('conta_financeira_id', contaSelecionada);

        try {
            const res = await api.post('/conciliacao/ofx', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setExtrato(res.data?.data?.extrato_processado || []);
            setResumoProcessamento(res.data?.data);
            setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message });
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao processar arquivo OFX.' });
        } finally {
            setLoading(false);
        }
    };

    const handleConciliarTitulo = async (transacaoBancaria, tituloSugeridoId) => {
        setConciliandoId(transacaoBancaria.id_transacao_banco);

        try {
            // Chama a rota de liquidação já existente no ERP
            await api.post(`/financeiro/titulos/${tituloSugeridoId}/liquidar`, {
                conta_financeira_id: contaSelecionada,
                valor_pago: transacaoBancaria.valor_original,
                forma_pagamento: 'TRANSFERENCIA',
            });

            // Atualiza a interface marcando a linha como CONCILIADA
            setExtrato(extrato.map(t => {
                if (t.id_transacao_banco === transacaoBancaria.id_transacao_banco) {
                    return { ...t, status_conciliacao: 'CONCILIADA' };
                }
                return t;
            }));

            setFeedback({ tipo: 'sucesso', msg: 'Transação conciliada e título liquidado com sucesso!' });
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao conciliar título.' });
        } finally {
            setConciliandoId(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-indigo-500" /> Conciliação Bancária
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Faça o upload do extrato OFX para cruzar os dados do banco com o ERP.
                    </p>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2">
                        {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="font-medium">{feedback.msg}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Painel de Upload */}
            <form onSubmit={handleUploadOfx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Conta Bancária de Destino *</label>
                    <select
                        required
                        value={contaSelecionada}
                        onChange={e => setContaSelecionada(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                        {contas.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {c.saldo_atual})</option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Arquivo Extrato (.OFX) *</label>
                    <input
                        type="file"
                        accept=".ofx"
                        required
                        onChange={e => setArquivoOfx(e.target.files[0])}
                        className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer border border-slate-800 rounded-lg bg-slate-950"
                    />
                </div>
                <div className="w-full md:w-auto">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                        {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                        Processar Arquivo OFX
                    </button>
                </div>
            </form>

            {/* Quadro de Conciliação */}
            {extrato.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-400" /> Linhas do Extrato
                        </h3>
                        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-bold">
                            Lidas: {resumoProcessamento?.total_transacoes_lidas} transações
                        </span>
                    </div>

                    <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                        {extrato.map((transacao, idx) => (
                            <div key={idx} className={`p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center transition ${transacao.status_conciliacao === 'CONCILIADA' ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'}`}>

                                {/* Lado Esquerdo: O que veio do Banco */}
                                <div className="lg:col-span-5 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${transacao.natureza === 'RECEBER' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                                            {transacao.natureza === 'RECEBER' ? 'ENTRADA' : 'SAÍDA'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">{transacao.data.split('-').reverse().join('/')}</span>
                                    </div>
                                    <p className="font-bold text-white text-sm line-clamp-2">{transacao.descricao}</p>
                                    <p className="text-lg font-mono font-bold text-slate-300">
                                        R$ {Number(transacao.valor).toFixed(2)}
                                    </p>
                                </div>

                                {/* Divisor Central */}
                                <div className="hidden lg:flex lg:col-span-2 justify-center">
                                    {transacao.status_conciliacao === 'CONCILIADA' ? (
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                    ) : (
                                        <ArrowRightLeft className="h-6 w-6 text-slate-600" />
                                    )}
                                </div>

                                {/* Lado Direito: Sugestões do ERP */}
                                <div className="lg:col-span-5">
                                    {transacao.status_conciliacao === 'CONCILIADA' ? (
                                        <div className="h-full flex items-center justify-center p-4 border border-emerald-800/50 bg-emerald-950/30 rounded-xl text-emerald-400 text-sm font-bold">
                                            Liquidado e Conciliado no ERP
                                        </div>
                                    ) : transacao.sugestoes && transacao.sugestoes.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Títulos Compatíveis (ERP):</p>
                                            {transacao.sugestoes.slice(0, 3).map(sugestao => (
                                                <div key={sugestao.id} className="flex justify-between items-center bg-slate-950 border border-slate-700 p-2.5 rounded-xl">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-200">{sugestao.pessoa?.nome_razao_social || 'Sem Pessoa'}</p>
                                                        <p className="text-[10px] text-slate-500">Doc: {sugestao.documento_numero} | Venc: {sugestao.data_vencimento.split('-').reverse().join('/')}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleConciliarTitulo(transacao, sugestao.id)}
                                                        disabled={conciliandoId === transacao.id_transacao_banco}
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition shadow-md cursor-pointer"
                                                    >
                                                        {conciliandoId === transacao.id_transacao_banco ? 'Ligando...' : 'Conciliar'}
                                                    </button>
                                                </div>
                                            ))}
                                            {transacao.sugestoes.length > 3 && (
                                                <p className="text-[10px] text-slate-500 text-center italic">+{transacao.sugestoes.length - 3} opções compatíveis ignoradas.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center p-4 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                                            Nenhum título no ERP com este valor em aberto.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
