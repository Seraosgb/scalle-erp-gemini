import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProjetoDashboard({ projetoId }) {
    const [projeto, setProjeto] = useState(null);
    const [activeTab, setActiveTab] = useState('board');
    const [loading, setLoading] = useState(true);
    const [draggedTarefa, setDraggedTarefa] = useState(null);

    // Ajuste o caminho do seu Axios conforme a arquitetura do front
    const api = axios.create({
        baseURL: '/api',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });

    useEffect(() => {
        carregarProjeto();
    }, [projetoId]);

    const carregarProjeto = async () => {
        try {
            setLoading(true);
            // Busca o board. Se precisar das outras abas, garanta que o backend carregue os relacionamentos
            const response = await api.get(`/projetos/${projetoId}/board`);
            setProjeto(response.data.data);
        } catch (error) {
            console.error("Erro ao buscar o projeto:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Mecânica do Kanban (Drag & Drop) ---
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
            setProjeto(projetoAntigo); // VAR anulou
            alert("Erro ao mover a tarefa.");
        }
        setDraggedTarefa(null);
    };

    // --- Mecânica do Timesheet ---
    const toggleTimer = async (tarefa) => {
        try {
            // Lógica simplificada: na prática, valide se o apontamento está rodando via DTO
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

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Carregando painel do projeto...</div>;
    if (!projeto) return <div className="p-8 text-center text-red-500">Projeto não encontrado.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header do Projeto */}
            <header className="bg-white shadow-sm border-b px-6 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{projeto.nome}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Orçamento Previsto: R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR')}
                            &nbsp; | &nbsp; Custo Atual: R$ {Number(projeto.custo_total_real || 0).toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>

                {/* Abas Dinâmicas */}
                <div className="flex space-x-6 mt-6 border-b">
                    {['board', 'entregaveis', 'custos', 'equipe'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 font-medium text-sm transition-colors capitalize ${
                                activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab === 'board' ? 'Quadro Kanban' : tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* Conteúdo das Abas */}
            <main className="flex-1 p-6 overflow-hidden">
                {activeTab === 'board' && (
                    <div className="flex space-x-4 overflow-x-auto h-full pb-4 items-start">
                        {projeto.etapas?.map(etapa => (
                            <div
                                key={etapa.id}
                                className="bg-gray-100 rounded-lg shadow-sm min-w-[320px] max-w-[320px] flex flex-col max-h-full"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, etapa.id)}
                            >
                                <div className="p-3 font-bold text-white rounded-t-lg flex justify-between items-center shadow-sm" style={{ backgroundColor: etapa.cor_hex || '#3b82f6' }}>
                                    <span>{etapa.nome}</span>
                                    <span className="bg-white text-gray-800 text-xs py-1 px-2 rounded-full">{etapa.tarefas?.length || 0}</span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                                    {etapa.tarefas?.map(tarefa => (
                                        <div
                                            key={tarefa.id} draggable onDragStart={(e) => handleDragStart(e, tarefa)}
                                            className="bg-white p-4 rounded shadow-sm border-l-4 cursor-grab hover:shadow-md transition-shadow relative"
                                            style={{ borderLeftColor: etapa.cor_hex || '#3b82f6' }}
                                        >
                                            <h3 className="font-semibold text-gray-800 text-sm">{tarefa.titulo}</h3>
                                            <div className="mt-4 flex justify-between items-center">
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">Prio: {tarefa.prioridade}</span>
                                                <button onClick={() => toggleTimer(tarefa)} className="w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-bold" title="Play/Stop Apontamento">
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
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center text-gray-500">
                        <span className="text-4xl mb-4 block">🚧</span>
                        <h2 className="text-lg font-bold text-gray-700 capitalize">Aba de {activeTab}</h2>
                        <p className="mt-2">A lista e os CRUDS de {activeTab} serão renderizados aqui utilizando o mesmo padrão visual.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
