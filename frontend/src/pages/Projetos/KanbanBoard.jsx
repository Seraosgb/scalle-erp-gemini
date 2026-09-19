import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function KanbanBoard({ projetoId }) {
    const [projeto, setProjeto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [draggedTarefa, setDraggedTarefa] = useState(null);

    // Configuração base do Axios (ajuste conforme o seu requests.js)
    const api = axios.create({
        baseURL: '/api',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Descomente se não usar cookies/sanctum
        }
    });

    useEffect(() => {
        carregarBoard();
    }, [projetoId]);

    const carregarBoard = async () => {
        try {
            // Se não passar o ID por prop, chumba o ID do projeto injetado no Tinker para testar
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
        // Efeito visual leve ao segurar o card
        setTimeout(() => e.target.classList.add('opacity-50'), 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('opacity-50');
        setDraggedTarefa(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessário para permitir o drop
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e, novaEtapaId) => {
        e.preventDefault();
        if (!draggedTarefa || draggedTarefa.etapa_id === novaEtapaId) return;

        // Atualização Otimista: Move no Front-end antes da API responder
        const projetoAntigo = { ...projeto };

        const novasEtapas = projeto.etapas.map(etapa => {
            // Remove da etapa antiga
            if (etapa.id === draggedTarefa.etapa_id) {
                return { ...etapa, tarefas: etapa.tarefas.filter(t => t.id !== draggedTarefa.id) };
            }
            // Adiciona na etapa nova
            if (etapa.id === novaEtapaId) {
                return { ...etapa, tarefas: [{ ...draggedTarefa, etapa_id: novaEtapaId }, ...etapa.tarefas] };
            }
            return etapa;
        });

        setProjeto({ ...projeto, etapas: novasEtapas });

        // Confirma na API
        try {
            await api.patch(`/projetos/tarefas/${draggedTarefa.id}/mover`, {
                nova_etapa_id: novaEtapaId
            });
        } catch (error) {
            console.error("Erro ao mover a tarefa", error);
            setProjeto(projetoAntigo); // Reverte se der erro (VAR anulou)
            alert("Erro ao mover a tarefa. O VAR anulou a jogada.");
        }
    };

    // ==========================================
    // MECÂNICA DO TIMESHEET (Play / Stop)
    // ==========================================
    const toggleTimer = async (tarefa) => {
        const isRodando = false; // Aqui você pode checar no DTO se há um apontamento aberto

        try {
            if (isRodando) {
                await api.put(`/projetos/tarefas/${tarefa.id}/stop`, { descricao: 'Pausa/Fim do trabalho' });
                alert('Cronômetro parado!');
            } else {
                await api.post(`/projetos/tarefas/${tarefa.id}/play`);
                alert('Cronômetro rolando!');
            }
            carregarBoard(); // Recarrega para atualizar os status e tempos
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
                        {/* Header da Coluna */}
                        <div
                            className="p-3 font-bold text-white rounded-t-lg flex justify-between items-center shadow-sm"
                            style={{ backgroundColor: etapa.cor_hex || '#3b82f6' }}
                        >
                            <span>{etapa.nome}</span>
                            <span className="bg-white text-gray-800 text-xs py-1 px-2 rounded-full">
                                {etapa.tarefas?.length || 0}
                            </span>
                        </div>

                        {/* Corpo da Coluna */}
                        <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                            {etapa.tarefas?.map((tarefa) => (
                                <div
                                    key={tarefa.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, tarefa)}
                                    onDragEnd={handleDragEnd}
                                    className="bg-white p-4 rounded shadow-sm border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
                                    style={{ borderLeftColor: etapa.cor_hex || '#3b82f6' }}
                                >
                                    <h3 className="font-semibold text-gray-800 text-sm">{tarefa.titulo}</h3>

                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                            Prioridade {tarefa.prioridade}
                                        </span>

                                        <button
                                            onClick={() => toggleTimer(tarefa)}
                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                                            title="Iniciar / Parar Apontamento"
                                        >
                                            ▶
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
