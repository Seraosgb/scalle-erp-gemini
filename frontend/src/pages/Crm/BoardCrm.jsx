import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '@/services/api'; // Ajuste para o seu client axios

export default function BoardCrm() {
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarBoard();
    }, []);

    const carregarBoard = async () => {
        try {
            const { data } = await api.get('/api/crm/board');
            setBoard(data.data);
        } catch (error) {
            console.error("Erro ao carregar CRM", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        // Se soltou fora do board ou no mesmo lugar, ignora
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // 1. Atualização Otimista UI (Move o card localmente antes da API responder)
        const boardAtualizado = { ...board };
        const etapaOrigem = boardAtualizado.etapas.find(e => e.id === source.droppableId);
        const etapaDestino = boardAtualizado.etapas.find(e => e.id === destination.droppableId);
        
        const [cardMovido] = etapaOrigem.oportunidades.splice(source.index, 1);
        etapaDestino.oportunidades.splice(destination.index, 0, cardMovido);
        setBoard(boardAtualizado);

        // 2. Dispara pro Backend
        try {
            await api.put(`/api/crm/oportunidades/${draggableId}/mover`, {
                etapa_id_destino: destination.droppableId
            });
        } catch (error) {
            console.error("Erro ao mover card", error);
            carregarBoard(); // Reverte a tela em caso de falha
        }
    };

    const converterEmOrcamento = async (oportunidadeId) => {
        if(!confirm("Gerar orçamento para este Lead?")) return;
        try {
            const { data } = await api.post(`/api/crm/oportunidades/${oportunidadeId}/converter-orcamento`);
            alert(data.data.message);
            carregarBoard(); // Atualiza o board para sumir o card ou mudar status
        } catch(e) {
            alert("Erro ao converter.");
        }
    };

    if (loading) return <div className="p-10 text-center">Carregando Motor de Vendas...</div>;
    if (!board) return <div className="p-10 text-center">Nenhum funil configurado.</div>;

    return (
        <div className="p-6 h-screen flex flex-col bg-gray-50">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">{board.nome}</h1>
            
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
                    {board.etapas.map(etapa => (
                        <div key={etapa.id} className="bg-gray-200 rounded-lg w-80 flex-shrink-0 flex flex-col">
                            <div className="p-3 bg-gray-300 rounded-t-lg font-semibold flex justify-between">
                                <span>{etapa.nome}</span>
                                <span className="bg-white px-2 rounded-full text-sm">{etapa.oportunidades.length}</span>
                            </div>
                            
                            <Droppable droppableId={etapa.id}>
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className="flex-1 p-3 overflow-y-auto min-h-[150px]"
                                    >
                                        {etapa.oportunidades.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="bg-white p-4 mb-3 rounded shadow cursor-grab active:cursor-grabbing border-l-4"
                                                        style={{ ...provided.draggableProps.style, borderColor: etapa.cor_hex }}
                                                    >
                                                        <h3 className="font-bold text-gray-700 text-sm">{card.titulo}</h3>
                                                        <p className="text-xs text-gray-500 mt-1">{card.nome_contato}</p>
                                                        <div className="mt-3 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-green-600">R$ {card.valor_estimado}</span>
                                                            <button 
                                                                onClick={() => converterEmOrcamento(card.id)}
                                                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                            >
                                                                Orçamento
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}