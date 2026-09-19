import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ArrowLeft, Kanban, DollarSign, Users, PackageCheck } from 'lucide-react';

export default function ProjetoDashboard() {
    const { id: projetoId } = useParams();
    const navigate = useNavigate();

    const [projeto, setProjeto] = useState(null);
    const [activeTab, setActiveTab] = useState('board');
    const [loading, setLoading] = useState(true);
    const [draggedTarefa, setDraggedTarefa] = useState(null);

    useEffect(() => {
        if (projetoId) carregarProjeto();
    }, [projetoId]);

    const carregarProjeto = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projetos/${projetoId}/board`);
            setProjeto(response.data.data || response.data);
        } catch (error) {
            console.error("Erro ao buscar o projeto:", error);
        } finally {
            setLoading(false);
        }
    };

    const atualizarBudget = async () => {
        const novoValor = window.prompt("Digite o novo valor do Orçamento (Budget):", projeto?.orcamento_previsto);
        if (!novoValor || isNaN(novoValor)) return;
        try {
            await api.put(`/projetos/${projetoId}/orcamento`, { orcamento_previsto: parseFloat(novoValor) });
            carregarProjeto();
        } catch (error) { alert("Erro ao atualizar budget."); }
    };

    const adicionarTarefa = async (etapaId) => {
        const titulo = window.prompt("Qual o título da nova tarefa?");
        if (!titulo) return;
        try {
            await api.post(`/projetos/etapas/${etapaId}/tarefas`, { titulo, prioridade: 'MEDIA' });
            carregarProjeto();
        } catch (error) { alert("Erro ao criar tarefa."); }
    };

    const handleDragStart = (e, tarefa) => {
        setDraggedTarefa(tarefa);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = async (e, novaEtapaId) => {
        e.preventDefault();
        if (!draggedTarefa || draggedTarefa.etapa_id === novaEtapaId) return;

        const projetoAntigo = { ...projeto };
        const novasEtapas = projeto.etapas.map(etapa => {
            if (etapa.id === draggedTarefa.etapa_id) {
                return { ...etapa, tarefas: etapa.tarefas.filter(t => t.id !== draggedTarefa.id) };
            }
            if (etapa.id === novaEtapaId) {
                return { ...etapa, tarefas: [{ ...draggedTarefa, etapa_id: novaEtapaId }, ...etapa.tarefas] };
            }
            return etapa;
        });

        setProjeto({ ...projeto, etapas: novasEtapas });

        try {
            await api.patch(`/projetos/tarefas/${draggedTarefa.id}/mover`, { nova_etapa_id: novaEtapaId });
        } catch (error) {
            setProjeto(projetoAntigo);
            alert("Erro ao mover a tarefa.");
        }
        setDraggedTarefa(null);
    };

    const toggleTimer = async (tarefa, isRunning) => {
        try {
            if (isRunning) {
                await api.put(`/projetos/tarefas/${tarefa.id}/stop`, { descricao: 'Pausa/Fim via Board' });
                alert('Cronômetro parado e horas apropriadas ao custo do projeto!');
            } else {
                await api.post(`/projetos/tarefas/${tarefa.id}/play`);
                alert('Cronômetro iniciado!');
            }
            carregarProjeto();
        } catch (error) {
            alert('Falha ao processar o apontamento de horas.');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Carregando painel do projeto...</div>;
    if (!projeto) return <div className="p-8 text-center text-rose-500">Projeto não encontrado.</div>;

    return (
        <div className="min-h-screen flex flex-col space-y-4">
            <header className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl p-5">
                <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                    <button
                        onClick={() => navigate('/app/projetos')}
                        className="p-2 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{projeto.nome}</h1>
                        <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                            Budget: R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR')}
                            <button onClick={atualizarBudget} className="text-indigo-400 hover:text-indigo-300 cursor-pointer" title="Editar Orçamento">✏️</button>
                            &nbsp; • &nbsp; Custo: <span className="text-rose-400">R$ {Number(projeto.custo_total_real || 0).toLocaleString('pt-BR')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 pt-4">
                    {[
                        { id: 'board', label: 'Kanban', icon: Kanban },
                        { id: 'entregaveis', label: 'Entregáveis', icon: PackageCheck },
                        { id: 'custos', label: 'Custos & Despesas', icon: DollarSign },
                        { id: 'equipe', label: 'Alocação Equipe', icon: Users }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                                    activeTab === tab.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="h-4 w-4" /> {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {activeTab === 'board' && (
                <div className="flex space-x-4 overflow-x-auto h-full pb-4 items-start">
                    {projeto.etapas?.map(etapa => (
                        <div
                            key={etapa.id}
                            className="bg-slate-900 border border-slate-800 rounded-xl min-w-[320px] max-w-[320px] flex flex-col max-h-[75vh]"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, etapa.id)}
                        >
                            <div className="p-3 font-bold text-slate-100 rounded-t-xl flex justify-between items-center border-b border-slate-800 bg-slate-950/40">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor_hex || '#3b82f6' }}></span>
                                    {etapa.nome}
                                </div>
                                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] py-0.5 px-2 rounded-full font-mono">
                                    {etapa.tarefas?.length || 0}
                                </span>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                                {etapa.tarefas?.map(tarefa => (
                                    <div
                                        key={tarefa.id} draggable onDragStart={(e) => handleDragStart(e, tarefa)}
                                        className="bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-grab hover:border-indigo-500/50 transition-colors relative group"
                                        style={{ borderLeftWidth: '4px', borderLeftColor: etapa.cor_hex || '#3b82f6' }}
                                    >
                                        <h3 className="font-semibold text-slate-200 text-sm">{tarefa.titulo}</h3>
                                        <div className="mt-4 flex justify-between items-center">
                                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded font-mono">
                                                Prio: {tarefa.prioridade}
                                            </span>
                                            {(() => {
                                                const isRunning = tarefa.apontamentos && tarefa.apontamentos.length > 0;
                                                return (
                                                    <button
                                                        onClick={() => toggleTimer(tarefa, isRunning)}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition shadow-md cursor-pointer ${
                                                            isRunning
                                                            ? 'bg-rose-950/60 border-rose-600 text-rose-400 animate-pulse'
                                                            : 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900'
                                                        }`}
                                                        title={isRunning ? "Parar Cronômetro" : "Iniciar Cronômetro"}
                                                    >
                                                        {isRunning ? '⏹' : '▶'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => adicionarTarefa(etapa.id)}
                                    className="w-full py-2 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
                                >
                                    + Nova Tarefa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'equipe' && projeto && <TabEquipe projetoId={projetoId} api={api} />}
            {activeTab === 'custos' && projeto && <TabCustos projetoId={projetoId} api={api} />}
            {activeTab === 'entregaveis' && projeto && <TabEntregaveis projetoId={projetoId} api={api} />}
        </div>
    );
}

// ==========================================
// SUB-COMPONENTES DAS ABAS
// ==========================================

function TabEquipe({ projetoId, api }) {
    const [equipe, setEquipe] = React.useState([]);
    const [usuarios, setUsuarios] = React.useState([]);
    const [modal, setModal] = React.useState(false);
    const [form, setForm] = React.useState({ usuario_id: '', custo_hora: '' });

    const carregar = () => api.get(`/projetos/${projetoId}/equipe`).then(res => setEquipe(res.data.data));

    React.useEffect(() => {
        carregar();
        api.get('/usuarios').then(res => setUsuarios(res.data?.data?.usuarios || []));
    }, [projetoId]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projetoId}/equipe`, form);
            setModal(false);
            carregar();
        } catch (err) { alert("Erro ao alocar membro."); }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">Alocação de Profissionais</h3>
                <button onClick={() => setModal(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition cursor-pointer">+ Adicionar Membro</button>
            </div>
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
                    <tr><th className="p-3">Membro da Equipe</th><th className="p-3 text-right">Custo Hora (R$)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {equipe.length === 0 ? (
                        <tr><td colSpan="2" className="p-4 text-center text-slate-500">Nenhum membro alocado.</td></tr>
                    ) : equipe.map(m => (
                        <tr key={m.id}>
                            <td className="p-3 text-white font-medium">{m.nome_usuario || 'Usuário do Sistema'}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">R$ {Number(m.custo_hora).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4">
                        <h3 className="text-white font-bold">Alocar Novo Membro</h3>
                        <div>
                            <label className="text-xs text-slate-400">Usuário do Sistema</label>
                            <select required value={form.usuario_id} onChange={e => setForm({...form, usuario_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm">
                                <option value="">Selecione...</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Custo Hora (R$)</label>
                            <input type="number" step="0.01" required value={form.custo_hora} onChange={e => setForm({...form, custo_hora: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Salvar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function TabCustos({ projetoId, api }) {
    const [custos, setCustos] = React.useState([]);
    const [modal, setModal] = React.useState(false);
    const [form, setForm] = React.useState({ descricao: '', valor: '', data_custo: new Date().toISOString().split('T')[0] });

    const carregar = () => api.get(`/projetos/${projetoId}/custos`).then(res => setCustos(res.data.data));
    React.useEffect(() => { carregar(); }, [projetoId]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projetoId}/custos`, form);
            setModal(false);
            setForm({ descricao: '', valor: '', data_custo: new Date().toISOString().split('T')[0] });
            carregar();
        } catch (err) { alert("Erro ao lançar despesa."); }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">Despesas e Apontamentos</h3>
                <button onClick={() => setModal(true)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition cursor-pointer">+ Lançar Custo</button>
            </div>
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
                    <tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3 text-right">Valor (R$)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {custos.length === 0 ? (
                        <tr><td colSpan="3" className="p-4 text-center text-slate-500">Sem despesas registradas.</td></tr>
                    ) : custos.map(c => (
                        <tr key={c.id}>
                            <td className="p-3 text-slate-400 font-mono">{new Date(c.data_custo).toLocaleDateString('pt-BR')}</td>
                            <td className="p-3 text-white">{c.descricao}</td>
                            <td className="p-3 text-right font-mono text-rose-400 font-bold">R$ {Number(c.valor).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4">
                        <h3 className="text-white font-bold">Lançar Nova Despesa</h3>
                        <div>
                            <label className="text-xs text-slate-400">Descrição do Custo</label>
                            <input type="text" required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Ex: Licença de software" className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-slate-400">Valor (R$)</label>
                                <input type="number" step="0.01" required value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Data</label>
                                <input type="date" required value={form.data_custo} onChange={e => setForm({...form, data_custo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold">Salvar Custo</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function TabEntregaveis({ projetoId, api }) {
    const [entregaveis, setEntregaveis] = React.useState([]);
    const [modal, setModal] = React.useState(false);
    const [form, setForm] = React.useState({ titulo: '', data_prevista: '', valor_faturamento: '' });

    const carregar = () => api.get(`/projetos/${projetoId}/entregaveis`).then(res => setEntregaveis(res.data.data));
    React.useEffect(() => { carregar(); }, [projetoId]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projetoId}/entregaveis`, form);
            setModal(false);
            setForm({ titulo: '', data_prevista: '', valor_faturamento: '' });
            carregar();
        } catch (err) { alert("Erro ao criar entregável."); }
    };

    const faturar = (entregavel) => {
        alert(`O entregável "${entregavel.titulo}" de R$ ${entregavel.valor_faturamento} foi enviado para a fila de faturamento!\n\nA emissão real do Pedido de Venda e NFS-e ocorrerá após a homologação do Motor Fiscal (Sprint 3).`);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">Marcos de Faturamento (Milestones)</h3>
                <button onClick={() => setModal(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer">+ Novo Entregável</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {entregaveis.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">Sem entregáveis mapeados.</div>
                ) : entregaveis.map(e => (
                    <div key={e.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-white text-sm">{e.titulo}</h4>
                            <p className="text-xs text-slate-500 mt-1">Previsão: {e.data_prevista ? new Date(e.data_prevista).toLocaleDateString('pt-BR') : 'A definir'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-emerald-400">R$ {Number(e.valor_faturamento).toLocaleString('pt-BR')}</span>
                            <button onClick={() => faturar(e)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 text-xs font-bold rounded-lg cursor-pointer">Gerar Fatura</button>
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4">
                        <h3 className="text-white font-bold">Mapear Novo Entregável</h3>
                        <div>
                            <label className="text-xs text-slate-400">Nome da Etapa/Milestone</label>
                            <input type="text" required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Fase 1 - Levantamento" className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-slate-400">Valor de Faturamento</label>
                                <input type="number" step="0.01" required value={form.valor_faturamento} onChange={e => setForm({...form, valor_faturamento: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Previsão Entrega</label>
                                <input type="date" value={form.data_prevista} onChange={e => setForm({...form, data_prevista: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm cursor-pointer">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer">Salvar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
