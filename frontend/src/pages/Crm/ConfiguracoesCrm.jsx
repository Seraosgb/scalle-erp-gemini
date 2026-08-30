import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function ConfiguracoesCrm() {
    const navigate = useNavigate();
    const [tabAtiva, setTabAtiva] = useState('pipelines');
    const [pipelines, setPipelines] = useState([]);
    const [pipelineSelecionado, setPipelineSelecionado] = useState(null);
    const [motivosPerda, setMotivosPerda] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editandoPipeline, setEditandoPipeline] = useState(false);
    const [formPipeline, setFormPipeline] = useState({ nome: '', descricao: '', cor_hex: '#4f46e5' });

    const [formEtapa, setFormEtapa] = useState({ nome: '', probabilidade_fechamento: 50, cor_hex: '#6366f1' });
    const [etapaEmEdicao, setEtapaEmEdicao] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            
            // Carrega Pipelines
            let pipes = [];
            try {
                const resPipes = await api.get('/crm/pipelines');
                pipes = resPipes.data?.data || resPipes.data || [];
                setPipelines(pipes);
            } catch (e) {
                console.warn("Aviso ao carregar /crm/pipelines:", e);
            }

            // Carrega Board / Pipeline Selecionado
            try {
                const resBoard = await api.get('/crm/board');
                const dataBoard = resBoard.data?.data || resBoard.data;
                const pipeAtivo = dataBoard?.pipeline || pipes[0] || null;
                setPipelineSelecionado(pipeAtivo);
                setMotivosPerda(dataBoard?.motivos_perda || []);
            } catch (e) {
                console.warn("Aviso ao carregar /crm/board:", e);
                if (pipes.length > 0) {
                    setPipelineSelecionado(pipes[0]);
                }
            }
        } catch (err) {
            console.error("Erro geral no carregamento de configurações do CRM:", err);
        } finally {
            setLoading(false);
        }
    };

    const salvarPipeline = async (e) => {
        e.preventDefault();
        try {
            if (pipelineSelecionado && editandoPipeline) {
                await api.put(`/crm/pipelines/${pipelineSelecionado.id}`, formPipeline);
            } else {
                await api.post('/crm/pipelines', formPipeline);
            }
            setEditandoPipeline(false);
            carregarDados();
        } catch (err) {
            alert("Erro ao salvar pipeline. Verifique as permissões de acesso.");
        }
    };

    const salvarEtapa = async (e) => {
        e.preventDefault();
        if (!pipelineSelecionado) return;
        try {
            if (etapaEmEdicao) {
                await api.put(`/crm/etapas/${etapaEmEdicao.id}`, formEtapa);
                setEtapaEmEdicao(null);
            } else {
                await api.post(`/crm/pipelines/${pipelineSelecionado.id}/etapas`, formEtapa);
            }
            setFormEtapa({ nome: '', probabilidade_fechamento: 50, cor_hex: '#6366f1' });
            
            const res = await api.get('/crm/board', { params: { pipeline_id: pipelineSelecionado.id } });
            setPipelineSelecionado(res.data?.data?.pipeline || res.data?.pipeline);
        } catch (err) {
            alert("Erro ao salvar etapa.");
        }
    };

    const excluirEtapa = async (id) => {
        if (!confirm("Excluir esta etapa do pipeline?")) return;
        try {
            await api.delete(`/crm/etapas/${id}`);
            const res = await api.get('/crm/board', { params: { pipeline_id: pipelineSelecionado.id } });
            setPipelineSelecionado(res.data?.data?.pipeline || res.data?.pipeline);
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao excluir etapa.");
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Carregando configurações do CRM...
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <span>⚙️</span> Parametrização e Taxonomia do CRM
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Gerencie pipelines, colunas customizadas, probabilidades de forecast e motivos de perda por tenant
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/app/crm')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                    <span>←</span> Voltar ao Board Kanban
                </button>
            </div>

            {/* Abas */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
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

            {/* Aba Pipelines */}
            {tabAtiva === 'pipelines' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Lista Lateral de Pipelines */}
                    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-200">Seus Pipelines</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditandoPipeline(false);
                                    setFormPipeline({ nome: '', descricao: '', cor_hex: '#4f46e5' });
                                }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded font-bold transition cursor-pointer"
                            >
                                + Novo
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
                                    <div>
                                        <p>{p.nome}</p>
                                        <p className="text-[10px] text-slate-500 font-normal">{p.descricao || 'Sem descrição'}</p>
                                    </div>
                                    {p.is_padrao && (
                                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">Padrão</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detalhes do Pipeline e Etapas */}
                    {pipelineSelecionado && (
                        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pipelineSelecionado.cor_hex || '#4f46e5' }}></span>
                                        {pipelineSelecionado.nome}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Token Inbound: <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-mono text-[11px]">{pipelineSelecionado.token_captacao || 'Sem token gerado'}</code>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditandoPipeline(true);
                                        setFormPipeline({
                                            nome: pipelineSelecionado.nome,
                                            descricao: pipelineSelecionado.descricao || '',
                                            cor_hex: pipelineSelecionado.cor_hex || '#4f46e5'
                                        });
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    ✏️ Editar Nome / Cor
                                </button>
                            </div>

                            {editandoPipeline && (
                                <form onSubmit={salvarPipeline} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-200">Editar Dados do Pipeline</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] text-slate-400 mb-1">Nome do Pipeline *</label>
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
                                            <input
                                                type="color"
                                                value={formPipeline.cor_hex}
                                                onChange={(e) => setFormPipeline({ ...formPipeline, cor_hex: e.target.value })}
                                                className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                                            />
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
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold cursor-pointer"
                                        >
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Gerenciamento de Etapas */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Etapas / Colunas Deste Pipeline</h4>
                                <div className="space-y-2">
                                    {(pipelineSelecionado.etapas || []).map((et, idx) => (
                                        <div key={et.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-slate-500 text-xs">#{idx + 1}</span>
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: et.cor_hex || '#6366f1' }}></span>
                                                <span className="font-bold text-slate-100 text-xs">{et.nome}</span>
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

                                {/* Form Etapa */}
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

            {/* Aba Motivos de Perda */}
            {tabAtiva === 'motivos_perda' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-200">Motivos de Descarte / Perda de Oportunidades</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Parametrize as justificativas padronizadas que a equipe comercial seleciona ao marcar um deal como perdido.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {motivosPerda.map(m => (
                            <div key={m.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor_hex || '#ef4444' }}></span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-200">{m.nome}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{m.codigo}</p>
                                    </div>
                                </div>
                                <span className="text-emerald-400 text-[10px] font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">Ativo</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}