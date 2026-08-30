import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function ConfiguracoesCrm() {
    const navigate = useNavigate();
    const [tabAtiva, setTabAtiva] = useState('metricas');
    const [pipelines, setPipelines] = useState([]);
    const [pipelineSelecionado, setPipelineSelecionado] = useState(null);
    const [motivosPerda, setMotivosPerda] = useState([]);
    const [metricas, setMetricas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    // Modal / Form Novo Funil
    const [modalNovoFunil, setModalNovoFunil] = useState(false);
    const [formNovoPipe, setFormNovoPipe] = useState({ nome: '', descricao: '', cor_hex: '#4f46e5' });

    // Edição do Funil Ativo
    const [editandoPipeline, setEditandoPipeline] = useState(false);
    const [formPipeline, setFormPipeline] = useState({ nome: '', descricao: '', cor_hex: '#4f46e5' });

    // Etapas
    const [formEtapa, setFormEtapa] = useState({ nome: '', probabilidade_fechamento: 50, cor_hex: '#6366f1' });
    const [etapaEmEdicao, setEtapaEmEdicao] = useState(null);

    // Form Motivo de Perda
    const [formMotivo, setFormMotivo] = useState({ nome: '', cor_hex: '#ef4444' });
    const [motivoEmEdicao, setMotivoEmEdicao] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const avisarAtualizacao = () => {
        window.dispatchEvent(new Event('crm_pipeline_atualizado'));
    };

    const carregarDados = async (selecionarId = null) => {
        try {
            setLoading(true);
            const [resPipes, resMetricas] = await Promise.allSettled([
                api.get('/crm/pipelines'),
                api.get('/crm/metricas')
            ]);

            const pipes = resPipes.status === 'fulfilled' ? (resPipes.value.data?.data || resPipes.value.data || []) : [];
            setPipelines(pipes);

            if (resMetricas.status === 'fulfilled') {
                setMetricas(resMetricas.value.data?.data || null);
            }

            let alvoId = selecionarId || pipelineSelecionado?.id || (pipes[0]?.id ?? null);
            if (alvoId) {
                try {
                    const resBoard = await api.get('/crm/board', { params: { pipeline_id: alvoId } });
                    const dataBoard = resBoard.data?.data || resBoard.data;
                    const pipeAtivo = dataBoard?.pipeline || pipes.find(p => p.id === alvoId) || pipes[0];
                    setPipelineSelecionado(pipeAtivo);
                    setMotivosPerda(dataBoard?.motivos_perda || []);
                } catch (e) {
                    const fallback = pipes.find(p => p.id === alvoId) || pipes[0];
                    setPipelineSelecionado(fallback);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar configurações do CRM:", err);
        } finally {
            setLoading(false);
        }
    };

    const criarNovoFunil = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const { data } = await api.post('/crm/pipelines', formNovoPipe);
            const novoId = data?.data?.id;
            setModalNovoFunil(false);
            setFormNovoPipe({ nome: '', descricao: '', cor_hex: '#4f46e5' });
            avisarAtualizacao();
            await carregarDados(novoId);
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao criar novo funil.");
        } finally {
            setSalvando(false);
        }
    };

    const salvarEdicaoPipeline = async (e) => {
        e.preventDefault();
        if (!pipelineSelecionado) return;
        setSalvando(true);
        try {
            await api.put(`/crm/pipelines/${pipelineSelecionado.id}`, formPipeline);
            setEditandoPipeline(false);
            avisarAtualizacao();
            await carregarDados(pipelineSelecionado.id);
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao salvar alterações do pipeline.");
        } finally {
            setSalvando(false);
        }
    };

    const salvarEtapa = async (e) => {
        e.preventDefault();
        if (!pipelineSelecionado) return;
        setSalvando(true);
        try {
            if (etapaEmEdicao) {
                await api.put(`/crm/etapas/${etapaEmEdicao.id}`, formEtapa);
                setEtapaEmEdicao(null);
            } else {
                await api.post(`/crm/pipelines/${pipelineSelecionado.id}/etapas`, formEtapa);
            }
            setFormEtapa({ nome: '', probabilidade_fechamento: 50, cor_hex: '#6366f1' });
            avisarAtualizacao();
            await carregarDados(pipelineSelecionado.id);
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao salvar etapa.");
        } finally {
            setSalvando(false);
        }
    };

    const excluirEtapa = async (id) => {
        if (!confirm("Excluir esta etapa do pipeline?")) return;
        try {
            await api.delete(`/crm/etapas/${id}`);
            avisarAtualizacao();
            await carregarDados(pipelineSelecionado.id);
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao excluir etapa.");
        }
    };

    const moverEtapaOrdem = async (index, direcao) => {
        if (!pipelineSelecionado?.etapas) return;
        const etapas = [...pipelineSelecionado.etapas];
        const novoIndex = index + direcao;

        if (novoIndex < 0 || novoIndex >= etapas.length) return;

        const [removido] = etapas.splice(index, 1);
        etapas.splice(novoIndex, 0, removido);

        const payload = etapas.map((e, idx) => ({
            id: e.id,
            ordem_exibicao: idx + 1
        }));

        try {
            await api.put(`/crm/pipelines/${pipelineSelecionado.id}/reordenar-etapas`, { etapas: payload });
            const res = await api.get('/crm/board', { params: { pipeline_id: pipelineSelecionado.id } });
            setPipelineSelecionado(res.data?.data?.pipeline || res.data?.pipeline);
            avisarAtualizacao();
        } catch (err) {
            alert("Erro ao reordenar etapas.");
        }
    };

    const salvarMotivoPerda = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            if (motivoEmEdicao) {
                await api.put(`/crm/motivos-perda/${motivoEmEdicao.id}`, formMotivo);
                setMotivoEmEdicao(null);
            } else {
                await api.post('/crm/motivos-perda', formMotivo);
            }
            setFormMotivo({ nome: '', cor_hex: '#ef4444' });
            avisarAtualizacao();
            await carregarDados(pipelineSelecionado?.id);
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao salvar motivo de perda.");
        } finally {
            setSalvando(false);
        }
    };

    const excluirMotivoPerda = async (id) => {
        if (!confirm("Excluir este motivo de perda?")) return;
        try {
            await api.delete(`/crm/motivos-perda/${id}`);
            avisarAtualizacao();
            await carregarDados(pipelineSelecionado?.id);
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao excluir motivo de perda.");
        }
    };

    if (loading && !pipelineSelecionado && !metricas) {
        return (
            <div className="p-8 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Carregando configurações do CRM...
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
            {/* Topbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <span>📊</span> Parametrização & Inteligência Comercial CRM
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Altere nomes de funis, configure probabilidades de forecast, métricas de conversão e motivos de perda.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/app/crm')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                    <span>←</span> Voltar ao Board Kanban
                </button>
            </div>

            {/* Abas de Navegação */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
                <button
                    type="button"
                    onClick={() => setTabAtiva('metricas')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        tabAtiva === 'metricas' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                >
                    📈 Métricas & Conversão
                </button>
                <button
                    type="button"
                    onClick={() => setTabAtiva('pipelines')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        tabAtiva === 'pipelines' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                >
                    🎯 Pipelines & Etapas Customizadas
                </button>
                <button
                    type="button"
                    onClick={() => setTabAtiva('motivos_perda')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        tabAtiva === 'motivos_perda' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                >
                    ❌ Motivos de Perda (Tabela de Domínio)
                </button>
            </div>

            {/* Aba 1: Métricas & Inteligência Comercial */}
            {tabAtiva === 'metricas' && (
                <div className="space-y-6">
                    {metricas ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-xs text-slate-400">Taxa de Conversão Geral</p>
                                    <p className="text-2xl font-bold text-emerald-400 mt-1">{metricas.taxa_conversao_percentual}%</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{metricas.total_ganhos} ganhos / {metricas.total_ganhos + metricas.total_perdidos} decididos</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-xs text-slate-400">Volume Convertido em Vendas</p>
                                    <p className="text-2xl font-bold text-indigo-400 mt-1">
                                        {Number(metricas.volume_total_ganhos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{metricas.total_ganhos} oportunidades ganhas</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-xs text-slate-400">Deals em Negociação</p>
                                    <p className="text-2xl font-bold text-amber-400 mt-1">{metricas.total_abertos}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Oportunidades ativas no funil</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-xs text-slate-400">Total Histórico de Leads</p>
                                    <p className="text-2xl font-bold text-purple-400 mt-1">{metricas.total_geral}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Entradas totais registradas</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Ranking de Motivos de Perda */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>❌</span> Principais Motivos de Perda
                                    </h3>
                                    <div className="space-y-2">
                                        {(metricas.ranking_perdas || []).map((rp, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: rp.cor_hex || '#ef4444' }}></span>
                                                    <span className="text-slate-200 font-semibold">{rp.nome}</span>
                                                </div>
                                                <span className="font-bold text-rose-400 bg-rose-950/40 border border-rose-900 px-2 py-0.5 rounded">
                                                    {rp.total} deals
                                                </span>
                                            </div>
                                        ))}
                                        {(!metricas.ranking_perdas || metricas.ranking_perdas.length === 0) && (
                                            <p className="text-xs text-slate-500">Nenhum registro de perda computado.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Desempenho por Vendedor */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>🏆</span> Desempenho da Equipe Comercial
                                    </h3>
                                    <div className="space-y-2">
                                        {(metricas.desempenho_vendedores || []).map((dv, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-200">{dv.vendedor}</p>
                                                    <p className="text-[10px] text-slate-500">{dv.ganhos} Ganhos • {dv.perdidos} Perdidos</p>
                                                </div>
                                                <span className="text-emerald-400 font-bold">
                                                    {Number(dv.valor_ganho || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                        ))}
                                        {(!metricas.desempenho_vendedores || metricas.desempenho_vendedores.length === 0) && (
                                            <p className="text-xs text-slate-500">Sem dados registrados para a equipe.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-6 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
                            Nenhum dado analítico computado para o período selecionado.
                        </div>
                    )}
                </div>
            )}

            {/* Aba 2: Conteúdo Pipelines & Etapas */}
            {tabAtiva === 'pipelines' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Lista de Funis */}
                    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-200">Seus Funis</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormNovoPipe({ nome: '', descricao: '', cor_hex: '#4f46e5' });
                                    setModalNovoFunil(true);
                                }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                                + Novo Funil
                            </button>
                        </div>

                        <div className="space-y-2">
                            {pipelines.map(p => (
                                <div
                                    key={p.id}
                                    onClick={async () => {
                                        try {
                                            const res = await api.get('/crm/board', { params: { pipeline_id: p.id } });
                                            setPipelineSelecionado(res.data?.data?.pipeline || res.data?.pipeline || p);
                                            setEditandoPipeline(false);
                                        } catch (e) {
                                            setPipelineSelecionado(p);
                                        }
                                    }}
                                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${
                                        pipelineSelecionado?.id === p.id
                                            ? 'bg-indigo-950/40 border-indigo-500 text-white font-bold'
                                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.cor_hex || '#4f46e5' }}></span>
                                        <div>
                                            <p className="line-clamp-1">{p.nome}</p>
                                            <p className="text-[10px] text-slate-500 font-normal">{p.descricao || 'Sem descrição'}</p>
                                        </div>
                                    </div>
                                    {p.is_padrao && (
                                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">Padrão</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detalhes do Funil Selecionado */}
                    {pipelineSelecionado && (
                        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pipelineSelecionado.cor_hex || '#4f46e5' }}></span>
                                        {pipelineSelecionado.nome}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Token Webhook Inbound: <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-mono text-[11px]">{pipelineSelecionado.token_captacao || 'Sem token gerado'}</code>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormPipeline({
                                            nome: pipelineSelecionado.nome,
                                            descricao: pipelineSelecionado.descricao || '',
                                            cor_hex: pipelineSelecionado.cor_hex || '#4f46e5'
                                        });
                                        setEditandoPipeline(!editandoPipeline);
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    ✏️ {editandoPipeline ? 'Fechar Edição' : 'Editar Nome / Cor'}
                                </button>
                            </div>

                            {/* Form Inline Edição do Funil */}
                            {editandoPipeline && (
                                <form onSubmit={salvarEdicaoPipeline} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-200">Editar Propriedades do Funil</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] text-slate-400 mb-1">Nome do Funil *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formPipeline.nome}
                                                onChange={(e) => setFormPipeline({ ...formPipeline, nome: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">Cor de Destaque</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={formPipeline.cor_hex}
                                                    onChange={(e) => setFormPipeline({ ...formPipeline, cor_hex: e.target.value })}
                                                    className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5"
                                                />
                                                <span className="text-xs font-mono text-slate-300 uppercase">{formPipeline.cor_hex}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditandoPipeline(false)}
                                            className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={salvando}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold cursor-pointer"
                                        >
                                            {salvando ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Gerenciamento de Etapas */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Colunas / Etapas do Funil</h4>
                                <div className="space-y-2">
                                    {(pipelineSelecionado.etapas || []).map((et, idx) => (
                                        <div key={et.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => moverEtapaOrdem(idx, -1)}
                                                        className="p-1 bg-slate-900 border border-slate-800 rounded hover:text-white disabled:opacity-30 cursor-pointer text-[10px]"
                                                        title="Mover para cima"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === pipelineSelecionado.etapas.length - 1}
                                                        onClick={() => moverEtapaOrdem(idx, 1)}
                                                        className="p-1 bg-slate-900 border border-slate-800 rounded hover:text-white disabled:opacity-30 cursor-pointer text-[10px]"
                                                        title="Mover para baixo"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: et.cor_hex || '#6366f1' }}></span>
                                                <span className="font-bold text-slate-100 text-xs">{idx + 1}. {et.nome}</span>
                                                <span className="bg-slate-900 text-purple-400 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                                                    Forecast: {et.probabilidade_fechamento ?? 50}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEtapaEmEdicao(et);
                                                        setFormEtapa({
                                                            nome: et.nome,
                                                            probabilidade_fechamento: et.probabilidade_fechamento ?? 50,
                                                            cor_hex: et.cor_hex || '#6366f1'
                                                        });
                                                    }}
                                                    className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-900 rounded border border-slate-800 cursor-pointer"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => excluirEtapa(et.id)}
                                                    className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 bg-rose-950/40 rounded border border-rose-900 cursor-pointer"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={salvarEtapa} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <h5 className="text-xs font-bold text-slate-300">
                                        {etapaEmEdicao ? `Editando Etapa: ${etapaEmEdicao.nome}` : '+ Adicionar Nova Etapa'}
                                    </h5>
                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-6">
                                            <label className="block text-[11px] text-slate-400 mb-1">Nome da Coluna *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ex: Demonstração Agendada"
                                                value={formEtapa.nome}
                                                onChange={(e) => setFormEtapa({ ...formEtapa, nome: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[11px] text-slate-400 mb-1">Probabilidade (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                required
                                                value={formEtapa.probabilidade_fechamento}
                                                onChange={(e) => setFormEtapa({ ...formEtapa, probabilidade_fechamento: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[11px] text-slate-400 mb-1">Cor</label>
                                            <input
                                                type="color"
                                                value={formEtapa.cor_hex}
                                                onChange={(e) => setFormEtapa({ ...formEtapa, cor_hex: e.target.value })}
                                                className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        {etapaEmEdicao && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEtapaEmEdicao(null);
                                                    setFormEtapa({ nome: '', probabilidade_fechamento: 50, cor_hex: '#6366f1' });
                                                }}
                                                className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={salvando}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
                                        >
                                            {etapaEmEdicao ? 'Atualizar Etapa' : 'Cadastrar Etapa'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Aba 3: Motivos de Perda (CRUD) */}
            {tabAtiva === 'motivos_perda' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
                    <div>
                        <h2 className="text-sm font-bold text-slate-200">Motivos de Descarte / Perda de Oportunidades</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Parametrize as justificativas padronizadas que a equipe comercial seleciona ao marcar um deal como perdido.</p>
                    </div>

                    <form onSubmit={salvarMotivoPerda} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-slate-300">{motivoEmEdicao ? `Editando Motivo: ${motivoEmEdicao.nome}` : '+ Novo Motivo de Perda'}</h4>
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-8">
                                <label className="block text-[11px] text-slate-400 mb-1">Descrição do Motivo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Não atende requisitos técnicos"
                                    value={formMotivo.nome}
                                    onChange={(e) => setFormMotivo({ ...formMotivo, nome: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[11px] text-slate-400 mb-1">Cor do Marcador</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formMotivo.cor_hex}
                                        onChange={(e) => setFormMotivo({ ...formMotivo, cor_hex: e.target.value })}
                                        className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5"
                                    />
                                    <span className="text-xs font-mono text-slate-300 uppercase">{formMotivo.cor_hex}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            {motivoEmEdicao && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMotivoEmEdicao(null);
                                        setFormMotivo({ nome: '', cor_hex: '#ef4444' });
                                    }}
                                    className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={salvando}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
                            >
                                {motivoEmEdicao ? 'Atualizar Motivo' : 'Cadastrar Motivo'}
                            </button>
                        </div>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {motivosPerda.map(m => (
                            <div key={m.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.cor_hex || '#ef4444' }}></span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-200">{m.nome}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{m.codigo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMotivoEmEdicao(m);
                                            setFormMotivo({ nome: m.nome, cor_hex: m.cor_hex || '#ef4444' });
                                        }}
                                        className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-900 rounded border border-slate-800 cursor-pointer"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => excluirMotivoPerda(m.id)}
                                        className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 bg-rose-950/40 rounded border border-rose-900 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Novo Funil */}
            {modalNovoFunil && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Criar Novo Funil de Vendas</h3>
                            <button
                                type="button"
                                onClick={() => setModalNovoFunil(false)}
                                className="text-slate-400 hover:text-white font-bold text-base cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={criarNovoFunil} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Funil *</label>
                                <input
                                    type="text"
                                    required
                                    value={formNovoPipe.nome}
                                    onChange={(e) => setFormNovoPipe({ ...formNovoPipe, nome: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Contratos Recorrentes PMOC"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={formNovoPipe.descricao}
                                    onChange={(e) => setFormNovoPipe({ ...formNovoPipe, descricao: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Venda consultiva corporativa"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Cor de Destaque</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formNovoPipe.cor_hex}
                                        onChange={(e) => setFormNovoPipe({ ...formNovoPipe, cor_hex: e.target.value })}
                                        className="w-10 h-8 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer p-0.5"
                                    />
                                    <span className="text-xs font-mono text-slate-300 uppercase">{formNovoPipe.cor_hex}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalNovoFunil(false)}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30"
                                >
                                    {salvando ? 'Criando...' : 'Criar Funil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}