import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, FileText, ArrowRightLeft, Plus, X } from 'lucide-react';

export default function ConciliacaoBancaria() {
    const [contas, setContas] = useState([]);
    const [planosContas, setPlanosContas] = useState([]);
    const [centrosCustos, setCentrosCustos] = useState([]);

    const [contaSelecionada, setContaSelecionada] = useState('');
    const [arquivoOfx, setArquivoOfx] = useState(null);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [extrato, setExtrato] = useState([]);
    const [resumo, setResumo] = useState(null);
    const [conciliandoId, setConciliandoId] = useState(null);

    // Estado do Modal Avulso
    const [modalAvulso, setModalAvulso] = useState(false);
    const [transacaoAvulsa, setTransacaoAvulsa] = useState(null);
    const [formAvulso, setFormAvulso] = useState({ plano_conta_id: '', centro_custo_id: '' });

    useEffect(() => {
        carregarBase();
    }, []);

    const carregarBase = async () => {
        try {
            const [resContas, resPlanos, resCentros] = await Promise.all([
                api.get('/financeiro/contas'),
                api.get('/controladoria/planos-contas'),
                api.get('/controladoria/centros-custos')
            ]);

            setContas(resContas.data?.data || []);
            if (resContas.data?.data?.length > 0) setContaSelecionada(resContas.data.data[0].id);

            // Achatando a árvore para o select
            const flattenTree = (nodes, prefix = '') => {
                let result = [];
                nodes.forEach(node => {
                    result.push({ id: node.id, nome: `${prefix}${node.codigo} - ${node.nome}`, is_sintetico: node.is_sintetico });
                    if (node.children) result = result.concat(flattenTree(node.children, prefix + '\u00A0\u00A0\u00A0\u00A0'));
                });
                return result;
            };

            setPlanosContas(flattenTree(resPlanos.data?.data || []));
            setCentrosCustos(flattenTree(resCentros.data?.data || []));
        } catch (error) {
            console.error(error);
        }
    };

    const handleUploadOfx = async (e) => {
        e.preventDefault();
        if (!arquivoOfx || !contaSelecionada) return;
        setLoading(true); setFeedback(null);

        const formData = new FormData();
        formData.append('arquivo_ofx', arquivoOfx);
        formData.append('conta_financeira_id', contaSelecionada);

        try {
            const res = await api.post('/conciliacao/ofx', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setExtrato(res.data?.data?.extrato_processado || []);
            setResumo(res.data?.data);
            setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message });
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao processar OFX.' });
        } finally {
            setLoading(false);
        }
    };

    const handleConciliarAuto = async (transacao, tituloId) => {
        setConciliandoId(transacao.id_transacao_banco);
        try {
            await api.post(`/financeiro/titulos/${tituloId}/liquidar`, {
                conta_financeira_id: contaSelecionada,
                valor_pago: transacao.valor_original,
                forma_pagamento: 'TRANSFERENCIA',
            });
            marcarComoConciliado(transacao.id_transacao_banco);
        } catch (err) {
            setFeedback({ tipo: 'erro', msg: 'Erro ao conciliar título existente.' });
        } finally {
            setConciliandoId(null);
        }
    };

    const abrirModalAvulso = (transacao) => {
        setTransacaoAvulsa(transacao);
        setFormAvulso({ plano_conta_id: '', centro_custo_id: '' });
        setModalAvulso(true);
    };

    const handleConciliarAvulso = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/conciliacao/ofx/manual', {
                conta_financeira_id: contaSelecionada,
                plano_conta_id: formAvulso.plano_conta_id,
                centro_custo_id: formAvulso.centro_custo_id,
                descricao: transacaoAvulsa.descricao,
                valor: transacaoAvulsa.valor,
                natureza: transacaoAvulsa.natureza,
                data_transacao: transacaoAvulsa.data,
                id_transacao_banco: transacaoAvulsa.id_transacao_banco
            });
            marcarComoConciliado(transacaoAvulsa.id_transacao_banco);
            setModalAvulso(false);
            setFeedback({ tipo: 'sucesso', msg: 'Lançamento avulso criado e conciliado!' });
        } catch (err) {
            const erroMensagem = err.response?.data?.message || err.response?.data?.error?.message || 'Erro ao criar lançamento manual.';
            setFeedback({ tipo: 'erro', msg: erroMensagem });
        } finally {
            setLoading(false);
        }
    };

    const marcarComoConciliado = (idBanco) => {
        setExtrato(extrato.map(t => t.id_transacao_banco === idBanco ? { ...t, status_conciliacao: 'CONCILIADA' } : t));
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            <div className="border-b border-slate-800 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <RefreshCw className="h-6 w-6 text-indigo-500" /> Conciliação Bancária
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Sincronize o OFX do seu banco com o Contas a Pagar/Receber.</p>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">{feedback.msg}</span></div>
                    <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            <form onSubmit={handleUploadOfx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Conta Bancária *</label>
                    <select required value={contaSelecionada} onChange={e => setContaSelecionada(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500">
                        {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Extrato (.OFX) *</label>
                    <input type="file" accept=".ofx" required onChange={e => setArquivoOfx(e.target.files[0])} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer border border-slate-800 rounded-lg bg-slate-950" />
                </div>
                <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />} Processar
                </button>
            </form>

            {extrato.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/40 font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-400" /> Transações Lidas ({resumo?.total_transacoes_lidas})
                    </div>
                    <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                        {extrato.map((t, idx) => (
                            <div key={idx} className={`p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center ${t.status_conciliacao === 'CONCILIADA' ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'}`}>
                                <div className="lg:col-span-5 space-y-1">
                                    <div className="flex justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.natureza === 'RECEBER' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                                            {t.natureza === 'RECEBER' ? 'ENTRADA' : 'SAÍDA'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">{t.data.split('-').reverse().join('/')}</span>
                                    </div>
                                    <p className="font-bold text-white text-sm">{t.descricao}</p>
                                    <p className="text-lg font-mono font-bold text-slate-300">R$ {Number(t.valor).toFixed(2)}</p>
                                </div>

                                <div className="hidden lg:flex lg:col-span-2 justify-center">
                                    {t.status_conciliacao === 'CONCILIADA' ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <ArrowRightLeft className="h-6 w-6 text-slate-600" />}
                                </div>

                                <div className="lg:col-span-5 flex flex-col justify-center">
                                    {t.status_conciliacao === 'CONCILIADA' ? (
                                        <div className="p-4 border border-emerald-800/50 bg-emerald-950/30 rounded-xl text-emerald-400 text-sm font-bold text-center">
                                            Liquidado e Conciliado ✓
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {t.sugestoes && t.sugestoes.length > 0 ? (
                                                t.sugestoes.slice(0, 1).map(sug => (
                                                    <div key={sug.id} className="flex justify-between items-center bg-slate-950 border border-slate-700 p-2.5 rounded-xl">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-200">Encontrado: {sug.pessoa?.nome_razao_social || 'Sem Pessoa'}</p>
                                                            <p className="text-[10px] text-slate-500">Doc: {sug.documento_numero}</p>
                                                        </div>
                                                        <button onClick={() => handleConciliarAuto(t, sug.id)} disabled={conciliandoId === t.id_transacao_banco} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                                                            {conciliandoId === t.id_transacao_banco ? '...' : 'Auto-Conciliar'}
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-500 text-center italic border border-dashed border-slate-700 p-2 rounded-xl">Nenhum título exato no ERP.</div>
                                            )}

                                            <button onClick={() => abrirModalAvulso(t)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-xl transition border border-slate-700 cursor-pointer">
                                                <Plus className="h-3 w-3" /> Criar Lançamento Avulso (DRE)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Lançamento Avulso */}
            {modalAvulso && transacaoAvulsa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">Lançamento Avulso</h3>
                            <button onClick={() => setModalAvulso(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                            <p className="text-slate-400">Banco: <strong className="text-white">{transacaoAvulsa.descricao}</strong></p>
                            <p className="text-slate-400">Valor: <strong className={transacaoAvulsa.natureza === 'RECEBER' ? 'text-emerald-400' : 'text-rose-400'}>R$ {Number(transacaoAvulsa.valor).toFixed(2)}</strong></p>
                        </div>

                        <form onSubmit={handleConciliarAvulso} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-400 mb-1">Plano de Contas (DRE) *</label>
                                <select required value={formAvulso.plano_conta_id} onChange={e => setFormAvulso({...formAvulso, plano_conta_id: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white">
                                    <option value="">Selecione...</option>
                                    {planosContas.map(p => <option key={p.id} value={p.id} disabled={p.is_sintetico}>{p.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-400 mb-1">Centro de Custo *</label>
                                <select required value={formAvulso.centro_custo_id} onChange={e => setFormAvulso({...formAvulso, centro_custo_id: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white">
                                    <option value="">Selecione...</option>
                                    {centrosCustos.map(c => <option key={c.id} value={c.id} disabled={c.is_sintetico}>{c.nome}</option>)}
                                </select>
                            </div>
                            <div className="pt-3 border-t border-slate-800 flex justify-end">
                                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">
                                    {loading ? 'Salvando...' : 'Confirmar e Conciliar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
