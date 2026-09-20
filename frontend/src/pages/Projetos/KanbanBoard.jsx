import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Instância extraída do componente para evitar recriação a cada renderização (Gasto de Memória)
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Descomente conforme a auth
    }
});

export default function KanbanBoard({ projetoId }) {
    const [projeto, setProjeto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [draggedTarefa, setDraggedTarefa] = useState(null);

    useEffect(() => {
        carregarBoard();
    }, [projetoId]);

    const carregarBoard = async () => {
        try {
            const idBuscar = projetoId || (projeto ? projeto.id : null);
            if (!idBuscar) return;

            const response = await api.get(`/projetos/${idBuscar}/board`);
            setProjeto(response.data.data);
        } catch (error) {
            console.error("Falta na zaga ao carregar o quadro:", error);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // MECÂNICA DE DRAG AND DROP (Arrastar)
    // ==========================================
    const handleDragStart = (e, tarefa) => {
        setDraggedTarefa(tarefa);
        e.dataTransfer.effectAllowed = "move";
        // Efeito visual aprimorado ao segurar o card (diminui levemente e fica opaco)
        setTimeout(() => e.target.classList.add('opacity-50', 'scale-95'), 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('opacity-50', 'scale-95');
        setDraggedTarefa(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

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
            await api.patch(`/projetos/tarefas/${draggedTarefa.id}/mover`, {
                nova_etapa_id: novaEtapaId
            });
        } catch (error) {
            console.error("Erro ao mover a tarefa", error);
            setProjeto(projetoAntigo);
            alert("Erro ao mover a tarefa. O VAR anulou a jogada.");
        }
    };

    // ==========================================
    // MECÂNICA DO TIMESHEET (Play / Stop)
    // ==========================================
    const toggleTimer = async (tarefa, isRodando) => {
        try {
            if (isRodando) {
                await api.put(`/projetos/tarefas/${tarefa.id}/stop`, { descricao: 'Pausa/Fim do trabalho' });
                alert('Cronômetro parado!');
            } else {
                await api.post(`/projetos/tarefas/${tarefa.id}/play`);
                alert('Cronômetro rolando!');
            }
            carregarBoard();
        } catch (error) {
            alert(error.response?.data?.error?.message || "Erro ao acionar o cronômetro.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Aquecendo os motores...</div>;
    if (!projeto) return <div className="p-8 text-center text-red-500">Projeto não encontrado no vestiário.</div>;

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <header className="mb-6">
                <h1 className="text-3xl font-extrabold text-gray-800">{projeto.nome}</h1>
                <p className="text-gray-500 mt-1">Orçamento Previsto: R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </header>

            <div className="flex space-x-4 overflow-x-auto pb-4">
                {projeto.etapas.map((etapa) => (
                    <div
                        key={etapa.id}
                        className="bg-gray-100 rounded-lg shadow-sm min-w-[320px] max-w-[320px] flex flex-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, etapa.id)}
                    >
                        <div
                            className="p-3 font-bold text-white rounded-t-lg flex justify-between items-center shadow-sm"
                            style={{ backgroundColor: etapa.cor_hex || '#3b82f6' }}
                        >
                            <span>{etapa.nome}</span>
                            <span className="bg-white text-gray-800 text-xs py-1 px-2 rounded-full">
                                {etapa.tarefas?.length || 0}
                            </span>
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                            {etapa.tarefas?.map((tarefa) => {
                                // Validação dinâmica do apontamento
                                const isRodando = tarefa.apontamentos?.some(ap => ap.fim === null) || false;

                                return (
                                    <div
                                        key={tarefa.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, tarefa)}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-white p-4 rounded shadow-sm border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative ${
                                            isRodando ? 'ring-2 ring-red-400' : ''
                                        }`}
                                        style={{ borderLeftColor: etapa.cor_hex || '#3b82f6' }}
                                    >
                                        <h3 className="font-semibold text-gray-800 text-sm">{tarefa.titulo}</h3>

                                        <div className="mt-4 flex justify-between items-center">
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                Prioridade {tarefa.prioridade}
                                            </span>

                                            <button
                                                onClick={() => toggleTimer(tarefa, isRodando)}
                                                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                                    isRodando
                                                    ? 'bg-red-100 hover:bg-red-200 text-red-700 animate-pulse'
                                                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                                                }`}
                                                title={isRodando ? "Parar Apontamento" : "Iniciar Apontamento"}
                                            >
                                                {isRodando ? '⏹' : '▶'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
