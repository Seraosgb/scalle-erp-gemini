import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../../services/api';

export default function BoardCrm() {
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarBoard();
    }, []);

    const carregarBoard = async () => {
        try {
            const { data } = await api.get('/crm/board');
            setBoard(data.data);
        } catch (error) {
            console.error("Erro ao carregar CRM", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const boardAtualizado = { ...board };
        const etapaOrigem = boardAtualizado.etapas.find(e => e.id === source.droppableId);
        const etapaDestino = boardAtualizado.etapas.find(e => e.id === destination.droppableId);
        
        if (!etapaOrigem || !etapaDestino) return;

        const [cardMovido] = etapaOrigem.oportunidades.splice(source.index, 1);
        etapaDestino.oportunidades.splice(destination.index, 0, cardMovido);
        setBoard(boardAtualizado);

        try {
            await api.put(`/crm/oportunidades/${draggableId}/mover`, {
                etapa_id_destino: destination.droppableId
            });
        } catch (error) {
            console.error("Erro ao mover card", error);
            carregarBoard();
        }
    };

    const converterEmOrcamento = async (oportunidadeId, e) => {
        e.stopPropagation();
        if (!confirm("Gerar orçamento para este Lead?")) return;
        try {
            const { data } = await api.post(`/crm/oportunidades/${oportunidadeId}/converter-orcamento`);
            alert(data.data.message);
            carregarBoard(); 
        } catch(e) {
            alert("Erro ao converter.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Carregando CRM...</div>;
    if (!board) return <div className="p-8 text-center text-slate-400">Nenhum funil configurado.</div>;

    const etapas = Array.isArray(board.etapas) ? board.etapas : [];

    return (
        <div className="p-4 sm:p-6 min-h-full flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold mb-6 text-slate-100">{board.nome}</h1>
            
            {etapas.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
                    Nenhuma etapa cadastrada no momento.
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex flex-1 gap-4 overflow-x-auto pb-4 items-start">
                        {etapas.map(etapa => {
                            const oportunidades = Array.isArray(etapa.oportunidades) ? etapa.oportunidades : [];
                            return (
                                <div key={etapa.id} className="bg-slate-900 border border-slate-800 rounded-xl w-80 shrink-0 flex flex-col max-h-[calc(100vh-12rem)]">
                                    <div className="p-3.5 border-b border-slate-800 font-semibold flex justify-between items-center text-slate-200">
                                        <span className="text-sm tracking-wide">{etapa.nome}</span>
                                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold border border-slate-700">
                                            {oportunidades.length}
                                        </span>
                                    </div>
                                    
                                    <Droppable droppableId={String(etapa.id)}>
                                        {(provided) => (
                                            <div 
                                                {...provided.droppableProps} 
                                                ref={provided.innerRef}
                                                className="flex-1 p-3 overflow-y-auto min-h-[160px] space-y-3"
                                            >
                                                {oportunidades.map((card, index) => (
                                                    <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-slate-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-700 transition"
                                                            >
                                                                <h3 className="font-bold text-sm text-slate-100">{card.titulo}</h3>
                                                                <p className="text-xs text-slate-400 mt-1 truncate">{card.nome_contato}</p>
                                                                <div className="mt-3 flex justify-between items-center">
                                                                    <span className="text-xs font-bold text-emerald-400">
                                                                        {Number(card.valor_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => converterEmOrcamento(card.id, e)}
                                                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
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
                            );
                        })}
                    </div>
                </DragDropContext>
            )}
        </div>
    );
}