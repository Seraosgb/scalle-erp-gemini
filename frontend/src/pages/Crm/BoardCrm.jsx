import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../../services/api';

export default function BoardCrm() {
    const [funil, setFunil] = useState(null);
    const [motivosPerda, setMotivosPerda] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [statusFiltro, setStatusFiltro] = useState('ABERTO');
    const [vendedorFiltro, setVendedorFiltro] = useState('');
    const [busca, setBusca] = useState('');

    // Modais & Drawer
    const [modalNovoAberto, setModalNovoAberto] = useState(false);
    const [modalPerdaAberto, setModalPerdaAberto] = useState(false);
    const [cardSelecionado, setCardSelecionado] = useState(null);
    const [drawerAberto, setDrawerAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);

    // Formulários
    const [formNovo, setFormNovo] = useState({
        titulo: '',
        nome_contato: '',
        email_contato: '',
        telefone_contato: '',
        valor_estimado: '',
        vendedor_id: ''
    });

    const [formPerda, setFormPerda] = useState({
        motivo_perda_id: '',
        justificativa_perda: ''
    });

    const [novaAtividade, setNovaAtividade] = useState({
        tipo: 'NOTA',
        descricao: '',
        data_agendamento: ''
    });

    useEffect(() => {
        carregarBoard();
    }, [statusFiltro, vendedorFiltro, busca]);

    const carregarBoard = async () => {
        try {
            const params = {
                status: statusFiltro,
                vendedor_id: vendedorFiltro || undefined,
                search: busca || undefined
            };
            const { data } = await api.get('/crm/board', { params });
            setFunil(data.data.funil);
            setMotivosPerda(data.data.motivos_perda || []);
            setVendedores(data.data.vendedores || []);

            // Se o drawer estiver aberto com um card selecionado, atualiza o card aberto
            if (cardSelecionado && data.data.funil?.etapas) {
                for (const et of data.data.funil.etapas) {
                    const c = et.oportunidades?.find(o => o.id === cardSelecionado.id);
                    if (c) {
                        setCardSelecionado(c);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar CRM", error);
        } finally {
            setLoading(false);
        }
    };

    // KPIs Calculados Reativamente
    const kpis = useMemo(() => {
        if (!funil?.etapas) return { totalPipeline: 0, totalCards: 0, ticketMedio: 0 };
        let totalPipeline = 0;
        let totalCards = 0;

        funil.etapas.forEach(et => {
            (et.oportunidades || []).forEach(op => {
                totalPipeline += Number(op.valor_estimado || 0);
                totalCards += 1;
            });
        });

        const ticketMedio = totalCards > 0 ? totalPipeline / totalCards : 0;
        return { totalPipeline, totalCards, ticketMedio };
    }, [funil]);

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const funilAtualizado = { ...funil };
        const etapaOrigem = funilAtualizado.etapas.find(e => e.id === source.droppableId);
        const etapaDestino = funilAtualizado.etapas.find(e => e.id === destination.droppableId);

        if (!etapaOrigem || !etapaDestino) return;

        const [cardMovido] = etapaOrigem.oportunidades.splice(source.index, 1);
        etapaDestino.oportunidades.splice(destination.index, 0, cardMovido);
        setFunil(funilAtualizado);

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
        if (!funil?.etapas?.length) return;

        setSalvando(true);
        try {
            await api.post('/crm/oportunidades', {
                ...formNovo,
                etapa_id: funil.etapas[0].id,
                valor_estimado: parseFloat(formNovo.valor_estimado) || 0
            });
            setModalNovoAberto(false);
            setFormNovo({
                titulo: '',
                nome_contato: '',
                email_contato: '',
                telefone_contato: '',
                valor_estimado: '',
                vendedor_id: ''
            });
            carregarBoard();
        } catch (error) {
            alert("Erro ao cadastrar oportunidade.");
        } finally {
            setSalvando(false);
        }
    };

    const converterEmOrcamento = async (oportunidadeId, e) => {
        if (e) e.stopPropagation();
        if (!confirm("Confirmar conversão da oportunidade em Orçamento Comercial?")) return;
        try {
            const { data } = await api.post(`/crm/oportunidades/${oportunidadeId}/converter-orcamento`);
            alert(data.data.message);
            if (drawerAberto) setDrawerAberto(false);
            carregarBoard();
        } catch (err) {
            alert("Erro ao converter lead em orçamento.");
        }
    };

    const abrirModalPerda = (card, e) => {
        if (e) e.stopPropagation();
        setCardSelecionado(card);
        setFormPerda({
            motivo_perda_id: motivosPerda[0]?.id || '',
            justificativa_perda: ''
        });
        setModalPerdaAberto(true);
    };

    const confirmarPerda = async (e) => {
        e.preventDefault();
        if (!cardSelecionado) return;
        setSalvando(true);
        try {
            await api.post(`/crm/oportunidades/${cardSelecionado.id}/marcar-perdido`, formPerda);
            setModalPerdaAberto(false);
            if (drawerAberto) setDrawerAberto(false);
            carregarBoard();
        } catch (err) {
            alert("Erro ao registrar perda.");
        } finally {
            setSalvando(false);
        }
    };

    const abrirDrawer = (card) => {
        setCardSelecionado(card);
        setNovaAtividade({ tipo: 'NOTA', descricao: '', data_agendamento: '' });
        setDrawerAberto(true);
    };

    const salvarAtividade = async (e) => {
        e.preventDefault();
        if (!novaAtividade.descricao.trim()) return;
        try {
            await api.post(`/crm/oportunidades/${cardSelecionado.id}/atividades`, novaAtividade);
            setNovaAtividade({ tipo: 'NOTA', descricao: '', data_agendamento: '' });
            carregarBoard();
        } catch (err) {
            alert("Erro ao registrar atividade.");
        }
    };

    const toggleAtividade = async (atividadeId) => {
        try {
            await api.patch(`/crm/oportunidades/${cardSelecionado.id}/atividades/${atividadeId}/toggle`);
            carregarBoard();
        } catch (err) {
            console.error("Erro ao alterar status da tarefa", err);
        }
    };

    const abrirWhatsApp = (telefone, nomeContato, e) => {
        if (e) e.stopPropagation();
        if (!telefone) return;
        const apenasNumeros = telefone.replace(/\D/g, '');
        const foneFormatado = apenasNumeros.length <= 11 ? `55${apenasNumeros}` : apenasNumeros;
        const msg = encodeURIComponent(`Olá ${nomeContato}, tudo bem? Sou da equipe comercial do Scalle ERP.`);
        window.open(`https://wa.me/${foneFormatado}?text=${msg}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Carregando CRM Enterprise...</div>;
    if (!funil) return <div className="p-8 text-center text-slate-400">Nenhum funil ativo.</div>;

    const etapas = Array.isArray(funil.etapas) ? funil.etapas : [];

    return (
        <div className="p-4 sm:p-6 min-h-full flex flex-col space-y-4">
            {/* Header & Ações */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <span>📊</span> {funil.nome}
                    </h1>
                    <p className="text-xs text-slate-400">Pipeline de oportunidades com follow-up e conversão contínua</p>
                </div>
                <button
                    onClick={() => setModalNovoAberto(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                    <span>+</span> Nova Oportunidade
                </button>
            </div>

            {/* Pipeline Summary (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Pipeline Total Ativo</p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">
                            {kpis.totalPipeline.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <span className="text-2xl">💰</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Total de Oportunidades</p>
                        <p className="text-lg font-bold text-indigo-400 mt-0.5">{kpis.totalCards} Leads</p>
                    </div>
                    <span className="text-2xl">🎯</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Ticket Médio Estimado</p>
                        <p className="text-lg font-bold text-sky-400 mt-0.5">
                            {kpis.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <span className="text-2xl">📈</span>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        placeholder="Buscar lead, contato ou telefone..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 sm:w-64"
                    />
                    <select
                        value={vendedorFiltro}
                        onChange={(e) => setVendedorFiltro(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">Todos os Vendedores</option>
                        {vendedores.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {['ABERTO', 'GANHO', 'PERDIDO', 'TODOS'].map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFiltro(st)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                statusFiltro === st
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {st === 'ABERTO' ? 'Em Aberto' : st === 'GANHO' ? 'Ganhos' : st === 'PERDIDO' ? 'Perdidos' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quadro Kanban */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex flex-1 gap-4 overflow-x-auto pb-4 items-start">
                    {etapas.map(etapa => {
                        const oportunidades = Array.isArray(etapa.oportunidades) ? etapa.oportunidades : [];
                        const totalEtapa = oportunidades.reduce((acc, curr) => acc + Number(curr.valor_estimado || 0), 0);

                        return (
                            <div key={etapa.id} className="bg-slate-900 border border-slate-800 rounded-xl w-80 shrink-0 flex flex-col max-h-[calc(100vh-16rem)]">
                                <div className="p-3.5 border-b border-slate-800 flex justify-between items-center text-slate-200">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider">{etapa.nome}</span>
                                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                            {totalEtapa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                    </div>
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
                                                            onClick={() => abrirDrawer(card)}
                                                            className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-100 shadow-sm cursor-pointer hover:border-slate-600 transition space-y-2.5 group"
                                                        >
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h3 className="font-semibold text-xs text-slate-100 line-clamp-2">{card.titulo}</h3>
                                                                {card.status === 'GANHO' && (
                                                                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">GANHO</span>
                                                                )}
                                                                {card.status === 'PERDIDO' && (
                                                                    <span className="bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">PERDIDO</span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                                <span className="truncate">{card.nome_contato}</span>
                                                                {card.telefone_contato && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => abrirWhatsApp(card.telefone_contato, card.nome_contato, e)}
                                                                        className="text-emerald-400 hover:text-emerald-300 font-bold text-xs"
                                                                        title="Falar no WhatsApp"
                                                                    >
                                                                        💬 WA
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                                                                <span className="text-xs font-bold text-emerald-400">
                                                                    {Number(card.valor_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                                
                                                                {card.status === 'ABERTO' && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => abrirModalPerda(card, e)}
                                                                            className="text-[11px] bg-rose-950 text-rose-400 border border-rose-900 hover:bg-rose-900 hover:text-white px-2 py-0.5 rounded transition"
                                                                        >
                                                                            Perdido
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => converterEmOrcamento(card.id, e)}
                                                                            className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded font-medium transition"
                                                                        >
                                                                            Orçar
                                                                        </button>
                                                                    </div>
                                                                )}
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

            {/* Drawer Lateral de Detalhes & Follow-up */}
            {drawerAberto && cardSelecionado && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
                    <div className="bg-slate-900 w-full max-w-lg h-full border-l border-slate-800 flex flex-col p-6 shadow-2xl overflow-y-auto">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">{cardSelecionado.titulo}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{cardSelecionado.nome_contato}</p>
                            </div>
                            <button
                                onClick={() => setDrawerAberto(false)}
                                className="text-slate-400 hover:text-white text-lg font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Dados Principais do Card */}
                        <div className="py-4 space-y-3 text-xs border-b border-slate-800">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-slate-500">Valor Estimado</span>
                                    <p className="font-bold text-emerald-400 text-sm mt-0.5">
                                        {Number(cardSelecionado.valor_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Vendedor / Responsável</span>
                                    <p className="text-slate-200 font-medium mt-0.5">{cardSelecionado.vendedor?.name || 'Não atribuído'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Telefone / WhatsApp</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-slate-200">{cardSelecionado.telefone_contato || '—'}</p>
                                        {cardSelecionado.telefone_contato && (
                                            <button
                                                type="button"
                                                onClick={() => abrirWhatsApp(cardSelecionado.telefone_contato, cardSelecionado.nome_contato)}
                                                className="text-emerald-400 font-bold hover:underline"
                                            >
                                                Abrir WA
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-500">E-mail</span>
                                    <p className="text-slate-200 mt-0.5">{cardSelecionado.email_contato || '—'}</p>
                                </div>
                            </div>

                            {cardSelecionado.status === 'ABERTO' && (
                                <div className="pt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => converterEmOrcamento(cardSelecionado.id)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-semibold transition"
                                    >
                                        Converter em Orçamento
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => abrirModalPerda(cardSelecionado)}
                                        className="bg-rose-950 text-rose-400 border border-rose-900 hover:bg-rose-900 hover:text-white px-3 py-2 rounded-lg font-medium transition"
                                    >
                                        Marcar Perdido
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Linha do Tempo de Atividades e Notas */}
                        <div className="flex-1 py-4 flex flex-col space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Atividades & Follow-ups</h3>

                            {/* Novo Follow-up */}
                            <form onSubmit={salvarAtividade} className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div className="flex gap-2">
                                    <select
                                        value={novaAtividade.tipo}
                                        onChange={(e) => setNovaAtividade({ ...novaAtividade, tipo: e.target.value })}
                                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1"
                                    >
                                        <option value="NOTA">📝 Nota</option>
                                        <option value="LIGACAO">📞 Ligação</option>
                                        <option value="REUNIAO">🤝 Reunião</option>
                                        <option value="WHATSAPP">💬 WhatsApp</option>
                                        <option value="TAREFA">📌 Tarefa / Retorno</option>
                                    </select>
                                    <input
                                        type="datetime-local"
                                        value={novaAtividade.data_agendamento}
                                        onChange={(e) => setNovaAtividade({ ...novaAtividade, data_agendamento: e.target.value })}
                                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 flex-1"
                                    />
                                </div>
                                <textarea
                                    required
                                    rows="2"
                                    value={novaAtividade.descricao}
                                    onChange={(e) => setNovaAtividade({ ...novaAtividade, descricao: e.target.value })}
                                    placeholder="Descreva o que foi falado ou o próximo passo..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                ></textarea>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-semibold"
                                    >
                                        Adicionar Registro
                                    </button>
                                </div>
                            </form>

                            {/* Lista de Atividades */}
                            <div className="space-y-2.5 flex-1 overflow-y-auto">
                                {(cardSelecionado.atividades || []).map((atv) => (
                                    <div key={atv.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="font-bold text-indigo-400">
                                                {atv.tipo === 'LIGACAO' ? '📞 Ligação' : atv.tipo === 'REUNIAO' ? '🤝 Reunião' : atv.tipo === 'WHATSAPP' ? '💬 WhatsApp' : atv.tipo === 'TAREFA' ? '📌 Tarefa' : '📝 Nota'}
                                            </span>
                                            <span className="text-slate-500">{new Date(atv.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{atv.descricao}</p>
                                        {atv.data_agendamento && (
                                            <div className="flex justify-between items-center pt-1 text-[11px] border-t border-slate-900">
                                                <span className="text-amber-400">Agendado: {new Date(atv.data_agendamento).toLocaleString('pt-BR')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAtividade(atv.id)}
                                                    className={`px-2 py-0.5 rounded font-bold ${atv.is_concluida ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
                                                >
                                                    {atv.is_concluida ? '✓ Concluída' : 'Pendente'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nova Oportunidade */}
            {modalNovoAberto && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl text-slate-100">
                        <h2 className="text-base font-bold mb-4">Nova Oportunidade Comercial</h2>
                        <form onSubmit={criarOportunidade} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Título / Assunto *</label>
                                <input
                                    type="text"
                                    required
                                    value={formNovo.titulo}
                                    onChange={(e) => setFormNovo({ ...formNovo, titulo: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Contrato Anual Climatização"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Contato / Empresa *</label>
                                <input
                                    type="text"
                                    required
                                    value={formNovo.nome_contato}
                                    onChange={(e) => setFormNovo({ ...formNovo, nome_contato: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Ex: Clínica Alpha"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={formNovo.email_contato}
                                        onChange={(e) => setFormNovo({ ...formNovo, email_contato: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={formNovo.telefone_contato}
                                        onChange={(e) => setFormNovo({ ...formNovo, telefone_contato: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                        placeholder="(21) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Valor Estimado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formNovo.valor_estimado}
                                        onChange={(e) => setFormNovo({ ...formNovo, valor_estimado: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Vendedor</label>
                                    <select
                                        value={formNovo.vendedor_id}
                                        onChange={(e) => setFormNovo({ ...formNovo, vendedor_id: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Atribuir a mim</option>
                                        {vendedores.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalNovoAberto(false)}
                                    className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                >
                                    {salvando ? 'Salvando...' : 'Salvar Oportunidade'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Marcar como Perdido */}
            {modalPerdaAberto && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl text-slate-100">
                        <h2 className="text-base font-bold mb-4 text-rose-400">Marcar Oportunidade como Perdida</h2>
                        <form onSubmit={confirmarPerda} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Motivo da Perda *</label>
                                <select
                                    required
                                    value={formPerda.motivo_perda_id}
                                    onChange={(e) => setFormPerda({ ...formPerda, motivo_perda_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                                >
                                    {motivosPerda.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Justificativa / Observação</label>
                                <textarea
                                    rows="3"
                                    value={formPerda.justificativa_perda}
                                    onChange={(e) => setFormPerda({ ...formPerda, justificativa_perda: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                                    placeholder="Ex: Concorrente ofertou desconto de 15%."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalPerdaAberto(false)}
                                    className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                >
                                    {salvando ? 'Salvando...' : 'Confirmar Perda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}