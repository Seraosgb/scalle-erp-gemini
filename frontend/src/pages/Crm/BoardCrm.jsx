import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../../services/api';

export default function BoardCrm() {
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);
    
    // Form state
    const [form, setForm] = useState({
        titulo: '',
        nome_contato: '',
        email_contato: '',
        telefone_contato: '',
        valor_estimado: ''
    });

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

    const criarOportunidade = async (e) => {
        e.preventDefault();
        if (!board?.etapas?.length) return;

        setSalvando(true);
        try {
            const primeiraEtapaId = board.etapas[0].id;
            await api.post('/crm/oportunidades', {
                ...form,
                etapa_id: primeiraEtapaId,
                valor_estimado: parseFloat(form.valor_estimado) || 0
            });
            setModalAberto(false);
            setForm({
                titulo: '',
                nome_contato: '',
                email_contato: '',
                telefone_contato: '',
                valor_estimado: ''
            });
            carregarBoard();
        } catch (error) {
            alert("Erro ao cadastrar oportunidade.");
        } finally {
            setSalvando(false);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{board.nome}</h1>
                <button
                    onClick={() => setModalAberto(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                    <span>+</span> Nova Oportunidade
                </button>
            </div>
            
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

            {/* Modal Nova Oportunidade */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl text-slate-100">
                        <h2 className="text-lg font-bold mb-4">Nova Oportunidade</h2>
                        <form onSubmit={criarOportunidade} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Título / Assunto *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.titulo}
                                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Manutenção Chiller Hospitalar"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Contato / Empresa *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.nome_contato}
                                    onChange={(e) => setForm({ ...form, nome_contato: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Clínica Alpha"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={form.email_contato}
                                        onChange={(e) => setForm({ ...form, email_contato: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={form.telefone_contato}
                                        onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                        placeholder="(21) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Valor Estimado (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.valor_estimado}
                                    onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="0,00"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalAberto(false)}
                                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                                >
                                    {salvando ? 'Salvando...' : 'Salvar Oportunidade'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}