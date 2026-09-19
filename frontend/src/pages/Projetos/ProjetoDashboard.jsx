import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <-- Hooks do router
import { api } from '../../services/api';
import { ArrowLeft, Kanban, DollarSign, Users, PackageCheck } from 'lucide-react';

export default function ProjetoDashboard() {
    const { id: projetoId } = useParams(); // <-- Pega o ID da URL
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
            // navigate('/app/projetos'); // Volta se o projeto não existir
        } finally {
            setLoading(false);
        }
    };

    // ... (Mecânica de Drag and Drop e Timesheet exatamente igual à anterior) ...
    const handleDragStart = (e, tarefa) => { setDraggedTarefa(tarefa); e.dataTransfer.effectAllowed = "move"; };
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

    const toggleTimer = async (tarefa) => {
        try {
            await api.post(`/projetos/tarefas/${tarefa.id}/play`);
            alert('Cronômetro iniciado!');
            carregarProjeto();
        } catch (error) {
            if (error.response?.status === 422) {
                await api.put(`/projetos/tarefas/${tarefa.id}/stop`, { descricao: 'Pausa/Fim via Board' });
                alert('Cronômetro parado e horas registradas!');
                carregarProjeto();
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Carregando painel do projeto...</div>;
    if (!projeto) return <div className="p-8 text-center text-rose-500">Projeto não encontrado.</div>;

    return (
        <div className="min-h-screen flex flex-col space-y-4">
            {/* Header */}
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
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                            Budget: R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR')}
                            &nbsp; • &nbsp; Custo: <span className="text-rose-400">R$ {Number(projeto.custo_total_real || 0).toLocaleString('pt-BR')}</span>
                        </p>
                    </div>
                </div>

                {/* Abas */}
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

            {/* Conteúdo Aba Kanban */}
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
                                            <button
                                                onClick={() => toggleTimer(tarefa)}
                                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 transition"
                                                title="Play/Stop Apontamento"
                                            >
                                                ⏱
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab !== 'board' && (
                <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
                    <span className="text-4xl mb-4 block">🚧</span>
                    <h2 className="text-lg font-bold text-slate-300">Aba de {activeTab} em construção</h2>
                    <p className="mt-2 text-sm">Os CRUDs e as visões de lista para {activeTab} serão renderizados aqui.</p>
                </div>
            )}
        </div>
    );
}
