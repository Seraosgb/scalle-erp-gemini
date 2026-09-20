import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ArrowLeft, Kanban, DollarSign, Users, PackageCheck, Paperclip, Link as LinkIcon, Trash2, CheckSquare, Play, Square, Settings, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ProjetoDashboard() {
    const { id: projetoId } = useParams();
    const navigate = useNavigate();

    const [projeto, setProjeto] = useState(null);
    const [activeTab, setActiveTab] = useState('board');
    const [loading, setLoading] = useState(true);

    // Clientes para o Modal de Configurações
    const [clientes, setClientes] = useState([]);
    const [modalConfig, setModalConfig] = useState(false);
    const [formConfig, setFormConfig] = useState({ nome: '', descricao: '', cliente_id: '' });

    const [modalBlocker, setModalBlocker] = useState(null);
    const [dependenciaIdSelecionada, setDependenciaIdSelecionada] = useState('');

    useEffect(() => {
        if (projetoId) {
            carregarProjeto();
            api.get('/pessoas?tipo=CLIENTE').then(res => setClientes(res.data?.data?.data || res.data?.data || []));
        }
    }, [projetoId]);

    const carregarProjeto = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projetos/${projetoId}/board`);
            const projData = response.data.data || response.data;
            setProjeto(projData);
            setFormConfig({
                nome: projData.nome,
                descricao: projData.descricao || '',
                cliente_id: projData.cliente_id || ''
            });
        } catch (error) {
            console.error("Erro ao buscar o projeto:", error);
        } finally {
            setLoading(false);
        }
    };

    const salvarConfiguracoes = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projetos/${projetoId}`, formConfig);
            setModalConfig(false);
            carregarProjeto();
            alert("Projeto atualizado com sucesso!");
        } catch (error) {
            alert("Erro ao atualizar projeto.");
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

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const projetoAntigo = { ...projeto };
        const novasEtapas = [...projeto.etapas];

        const etapaOrigemIndex = novasEtapas.findIndex(e => String(e.id) === source.droppableId);
        const etapaDestinoIndex = novasEtapas.findIndex(e => String(e.id) === destination.droppableId);

        const etapaOrigem = { ...novasEtapas[etapaOrigemIndex] };
        const etapaDestino = source.droppableId === destination.droppableId ? etapaOrigem : { ...novasEtapas[etapaDestinoIndex] };

        const tarefasOrigem = [...(etapaOrigem.tarefas || [])];
        const [tarefaMovida] = tarefasOrigem.splice(source.index, 1);

        if (tarefaMovida.dependencias?.length > 0 && source.droppableId !== destination.droppableId) {
            alert(`⚠️ TAREFA BLOQUEADA\n\nEsta tarefa depende de ${tarefaMovida.dependencias.length} pré-requisito(s). Conclua as dependências primeiro.`);
            return;
        }

        if (source.droppableId === destination.droppableId) {
            tarefasOrigem.splice(destination.index, 0, tarefaMovida);
            etapaOrigem.tarefas = tarefasOrigem;
            novasEtapas[etapaOrigemIndex] = etapaOrigem;
            setProjeto({ ...projeto, etapas: novasEtapas });
        } else {
            const tarefasDestino = [...(etapaDestino.tarefas || [])];
            tarefasDestino.splice(destination.index, 0, { ...tarefaMovida, etapa_id: destination.droppableId });

            etapaOrigem.tarefas = tarefasOrigem;
            etapaDestino.tarefas = tarefasDestino;

            novasEtapas[etapaOrigemIndex] = etapaOrigem;
            novasEtapas[etapaDestinoIndex] = etapaDestino;

            setProjeto({ ...projeto, etapas: novasEtapas });

            try {
                await api.patch(`/projetos/tarefas/${draggableId}/mover`, { nova_etapa_id: destination.droppableId });
            } catch (error) {
                setProjeto(projetoAntigo);
                alert("Erro ao mover a tarefa.");
            }
        }
    };

    const toggleTimer = async (tarefa, isRunning) => {
        try {
            if (isRunning) {
                const res = await api.put(`/projetos/tarefas/${tarefa.id}/stop`, { descricao: 'Pausa/Fim via Board' });
                alert(res.data?.data?.message || 'Cronômetro parado e horas apropriadas!');
            } else {
                await api.post(`/projetos/tarefas/${tarefa.id}/play`);
            }
            carregarProjeto();
        } catch (error) { alert('Falha ao processar apontamento.'); }
    };

    const adicionarChecklist = async (tarefaId) => {
        const descricao = window.prompt("Qual o item de verificação para esta tarefa?");
        if (!descricao) return;
        try {
            await api.post(`/projetos/tarefas/${tarefaId}/checklists`, { descricao });
            carregarProjeto();
        } catch (error) { alert("Erro ao adicionar checklist."); }
    };

    const toggleChecklist = async (checklistId) => {
        try {
            const novasEtapas = projeto.etapas.map(e => ({
                ...e,
                tarefas: e.tarefas.map(t => ({
                    ...t,
                    checklists: t.checklists?.map(c => c.id === checklistId ? { ...c, concluido: !c.concluido } : c)
                }))
            }));
            setProjeto({ ...projeto, etapas: novasEtapas });
            await api.patch(`/projetos/tarefas/checklists/${checklistId}/toggle`);
        } catch (error) {
            carregarProjeto();
        }
    };

    const handleFileUpload = async (tarefaId, event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('entidade_type', 'App\\Models\\Tarefa');
        formData.append('entidade_id', tarefaId);

        try {
            await api.post('/ged/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            alert('Arquivo anexado com sucesso ao Cofre Digital!');
            carregarProjeto();
        } catch (error) {
            alert('Erro ao anexar arquivo ao GED.');
        }
    };

    const adicionarDependencia = async (e) => {
        e.preventDefault();
        if (!dependenciaIdSelecionada) return;
        try {
            await api.post(`/projetos/tarefas/${modalBlocker.id}/dependencias`, { depende_de_id: dependenciaIdSelecionada });
            setModalBlocker(null);
            setDependenciaIdSelecionada('');
            carregarProjeto();
        } catch (error) { alert("Erro ao criar dependência."); }
    };

    const removerDependencia = async (tarefaId, dependeDeId) => {
        if (!window.confirm("Remover esta dependência?")) return;
        try {
            await api.delete(`/projetos/tarefas/${tarefaId}/dependencias/${dependeDeId}`);
            carregarProjeto();
        } catch (error) { alert("Erro ao remover dependência."); }
    };

    const todasAsTarefas = projeto?.etapas?.flatMap(e => e.tarefas) || [];

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Carregando painel do projeto...</div>;
    if (!projeto) return <div className="p-8 text-center text-rose-500">Projeto não encontrado.</div>;

    return (
        <div className="min-h-screen flex flex-col space-y-4 relative text-slate-200">
            <header className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl p-5">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/app/projetos')} className="p-2 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-400 hover:text-white transition cursor-pointer" title="Voltar aos Projetos">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                {projeto.nome}
                                {!projeto.cliente_id && (
                                    <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">Sem Cliente</span>
                                )}
                            </h1>
                            <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                                Budget: R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR')}
                                <button onClick={atualizarBudget} className="text-indigo-400 hover:text-indigo-300 cursor-pointer" title="Editar Orçamento">✏️</button>
                                &nbsp; • &nbsp; Custo Real: <span className="text-rose-400">R$ {Number(projeto.custo_total_real || 0).toLocaleString('pt-BR')}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setModalConfig(true)} className="p-2 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-400 hover:text-white transition cursor-pointer" title="Configurações do Projeto">
                        <Settings className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
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
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="h-4 w-4" /> {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {activeTab === 'board' && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex space-x-4 overflow-x-auto h-full pb-4 items-start">
                        {projeto.etapas?.map(etapa => (
                            <div key={etapa.id} className="bg-slate-900 border border-slate-800 rounded-xl min-w-[320px] max-w-[320px] flex flex-col max-h-[75vh]">
                                <div className="p-3 font-bold text-slate-100 rounded-t-xl flex justify-between items-center border-b border-slate-800 bg-slate-950/40">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor_hex || '#3b82f6' }}></span>
                                        <span className="text-sm uppercase tracking-wider">{etapa.nome}</span>
                                    </div>
                                    <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] py-0.5 px-2 rounded-full font-mono">
                                        {etapa.tarefas?.length || 0}
                                    </span>
                                </div>

                                <Droppable droppableId={String(etapa.id)}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800/30' : ''}`}
                                        >
                                            {etapa.tarefas?.map((tarefa, index) => {
                                                const isRodando = tarefa.apontamentos && tarefa.apontamentos.length > 0;
                                                return (
                                                    <Draggable key={tarefa.id} draggableId={String(tarefa.id)} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`group bg-slate-950 p-4 rounded-xl border relative transition-shadow ${
                                                                    snapshot.isDragging ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 z-50' : 'border-slate-800 hover:border-slate-600'
                                                                } ${isRodando ? 'ring-1 ring-rose-500' : ''}`}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    borderLeftWidth: '4px',
                                                                    borderLeftColor: etapa.cor_hex || '#3b82f6'
                                                                }}
                                                            >
                                                                <div className="absolute top-2 right-2 flex gap-1 transition-opacity duration-200">                                                                    <button onClick={() => setModalBlocker(tarefa)} className="p-1.5 bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 rounded-md cursor-pointer" title="Adicionar Dependência (Blocker)">
                                                                        <LinkIcon size={14}/>
                                                                    </button>
                                                                    <label className="p-1.5 bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 rounded-md cursor-pointer" title="Anexar Arquivo (GED)">
                                                                        <Paperclip size={14}/>
                                                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(tarefa.id, e)} />
                                                                    </label>
                                                                    <button onClick={() => adicionarChecklist(tarefa.id)} className="p-1.5 bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 rounded-md cursor-pointer" title="Adicionar Item Checklist">
                                                                        <CheckSquare size={14}/>
                                                                    </button>
                                                                </div>

                                                                <h3 className="font-semibold text-slate-200 text-sm leading-tight pr-20">{tarefa.titulo}</h3>

                                                                {tarefa.dependencias && tarefa.dependencias.length > 0 && (
                                                                    <div className="mt-2 text-[10px] bg-rose-950/40 text-rose-400 border border-rose-900/50 p-1.5 rounded font-bold flex flex-col gap-1">
                                                                        <div className="flex items-center gap-1">⚠️ Depende de:</div>
                                                                        {tarefa.dependencias.map(dep => (
                                                                            <div key={dep.id} className="flex justify-between items-center text-rose-300/80 bg-rose-950/40 px-1 rounded">
                                                                                <span className="truncate max-w-[200px]">- {dep.titulo}</span>
                                                                                <button onClick={() => removerDependencia(tarefa.id, dep.id)} className="hover:text-white cursor-pointer p-1"><Trash2 size={10}/></button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {tarefa.checklists && tarefa.checklists.length > 0 && (
                                                                    <div className="mt-3 space-y-1.5 bg-slate-900/50 p-2 border border-slate-800/80 rounded-lg">
                                                                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Checklist</div>
                                                                        {tarefa.checklists.map(item => (
                                                                            <label key={item.id} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer group/chk">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={item.concluido}
                                                                                    onChange={() => toggleChecklist(item.id)}
                                                                                    className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-950 cursor-pointer"
                                                                                />
                                                                                <span className={`transition-all ${item.concluido ? "line-through text-slate-600" : "group-hover/chk:text-white"}`}>
                                                                                    {item.descricao}
                                                                                </span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {tarefa.anexos && tarefa.anexos.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                                        {tarefa.anexos.map(anexo => (
                                                                            <a key={anexo.id} href={`${api.defaults.baseURL.replace('/api', '')}/storage/${anexo.caminho_s3}`} target="_blank" rel="noreferrer" className="text-[9px] bg-slate-800 text-indigo-300 border border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-slate-700">
                                                                                <Paperclip size={10}/> {anexo.nome_original.substring(0, 15)}...
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <div className="mt-3 flex justify-between items-center pt-3 border-t border-slate-800/50">
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                                                        tarefa.prioridade === 1 ? 'bg-rose-950 text-rose-400' :
                                                                        tarefa.prioridade === 2 ? 'bg-orange-950 text-orange-400' :
                                                                        tarefa.prioridade === 3 ? 'bg-blue-950 text-blue-400' :
                                                                        'bg-slate-800 text-slate-400'
                                                                    }`}>
                                                                        Prio: {tarefa.prioridade}
                                                                    </span>

                                                                    <button
                                                                        onClick={() => toggleTimer(tarefa, isRodando)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] transition cursor-pointer shadow-sm ${
                                                                            isRodando
                                                                                ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                                                                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                                                                        }`}
                                                                        title={isRodando ? "Parar Cronômetro" : "Iniciar Cronômetro"}
                                                                    >
                                                                        {isRodando ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                                                        {isRodando ? 'STOP' : 'PLAY'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}

                                            <button
                                                onClick={() => adicionarTarefa(etapa.id)}
                                                className="w-full py-2 mt-2 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
                                            >
                                                + Nova Tarefa
                                            </button>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* Modal de Dependências (Blockers) */}
            {modalBlocker && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={adicionarDependencia} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-rose-400 mb-2">
                            <LinkIcon size={20} />
                            <h3 className="font-bold text-lg">Criar Dependência</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            A tarefa <strong className="text-white">{modalBlocker.titulo}</strong> só poderá ser iniciada após a conclusão de:
                        </p>

                        <select
                            required
                            value={dependenciaIdSelecionada}
                            onChange={e => setDependenciaIdSelecionada(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                            <option value="">Selecione a tarefa pré-requisito...</option>
                            {todasAsTarefas.filter(t => t.id !== modalBlocker.id).map(t => (
                                <option key={t.id} value={t.id}>{t.titulo}</option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setModalBlocker(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition cursor-pointer">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer">Bloquear Tarefa</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Configurações (Vincular Cliente) */}
            {modalConfig && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={salvarConfiguracoes} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-400" /> Configurações do Projeto
                            </h3>
                            <button type="button" onClick={() => setModalConfig(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Nome do Projeto *</label>
                            <input type="text" required value={formConfig.nome} onChange={e => setFormConfig({...formConfig, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:border-indigo-500" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Descrição</label>
                            <textarea rows="2" value={formConfig.descricao} onChange={e => setFormConfig({...formConfig, descricao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:border-indigo-500"></textarea>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Cliente Vinculado (Obrigatório para Faturamento)</label>
                            <select value={formConfig.cliente_id} onChange={e => setFormConfig({...formConfig, cliente_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:border-indigo-500 cursor-pointer">
                                <option value="">Sem cliente vinculado</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome_razao_social} ({c.cpf_cnpj})</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-amber-500 mt-1 font-semibold">Sem este vínculo o Motor Fiscal não consegue emitir a Nota (NF-e/NFS-e).</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button type="button" onClick={() => setModalConfig(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition cursor-pointer">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition shadow-md cursor-pointer">Salvar Configurações</button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'equipe' && projeto && <TabEquipe projeto={projeto} api={api} onReload={carregarProjeto} />}
            {activeTab === 'custos' && projeto && <TabCustos projeto={projeto} api={api} onReload={carregarProjeto} />}
            {activeTab === 'entregaveis' && projeto && <TabEntregaveis projeto={projeto} api={api} onReload={carregarProjeto} />}
        </div>
    );
}

// ==========================================
// SUB-COMPONENTES DAS ABAS
// ==========================================

function TabEquipe({ projeto, api, onReload }) {
    const [equipe, setEquipe] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ usuario_id: '', custo_hora: '' });

    const carregar = () => api.get(`/projetos/${projeto.id}/equipe`).then(res => setEquipe(res.data.data));

    useEffect(() => {
        carregar();
        api.get('/usuarios').then(res => setUsuarios(res.data?.data?.usuarios || []));
    }, [projeto.id]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projeto.id}/equipe`, form);
            setModal(false);
            carregar();
        } catch (err) { alert("Erro ao alocar membro."); }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Users className="h-5 w-5 text-indigo-400"/> Alocação de Equipe e Custo-Hora</h3>
                <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md">+ Adicionar Membro</button>
            </div>
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <tr><th className="p-4">Membro da Equipe</th><th className="p-4 text-right">Custo Hora (R$)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {equipe.length === 0 ? (
                        <tr><td colSpan="2" className="p-8 text-center text-slate-500">Nenhum membro alocado ao projeto.</td></tr>
                    ) : equipe.map(m => (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-4 text-white font-medium">{m.nome_usuario || 'Usuário do Sistema'}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400">R$ {Number(m.custo_hora).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">Alocar Novo Membro</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Usuário do Sistema</label>
                            <select required value={form.usuario_id} onChange={e => setForm({...form, usuario_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                                <option value="">Selecione...</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Custo Hora (R$)</label>
                            <input type="number" step="0.01" required value={form.custo_hora} onChange={e => setForm({...form, custo_hora: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold cursor-pointer transition shadow-md">Salvar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function TabCustos({ projeto, api, onReload }) {
    const [custos, setCustos] = useState([]);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ descricao: '', valor: '', data_custo: new Date().toISOString().split('T')[0] });

    const carregar = () => api.get(`/projetos/${projeto.id}/custos`).then(res => setCustos(res.data.data));
    useEffect(() => { carregar(); }, [projeto.id]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projeto.id}/custos`, form);
            setModal(false);
            setForm({ descricao: '', valor: '', data_custo: new Date().toISOString().split('T')[0] });
            carregar();
            onReload(); // Atualiza o header do projeto
        } catch (err) { alert("Erro ao lançar despesa."); }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-rose-400"/> Despesas Externas e Terceirizações</h3>
                <button onClick={() => setModal(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md">+ Lançar Custo</button>
            </div>
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <tr><th className="p-4">Data</th><th className="p-4">Descrição do Gasto</th><th className="p-4 text-right">Valor (R$)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {custos.length === 0 ? (
                        <tr><td colSpan="3" className="p-8 text-center text-slate-500">Nenhuma despesa externa lançada neste projeto.</td></tr>
                    ) : custos.map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-4 text-slate-400 font-mono">{new Date(c.data_custo).toLocaleDateString('pt-BR')}</td>
                            <td className="p-4 text-white">{c.descricao}</td>
                            <td className="p-4 text-right font-mono text-rose-400 font-bold">R$ {Number(c.valor).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">Lançar Nova Despesa</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Descrição do Custo</label>
                            <input type="text" required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Ex: Aluguel de andaime" className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-rose-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Valor (R$)</label>
                                <input type="number" step="0.01" required value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-rose-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Data</label>
                                <input type="date" required value={form.data_custo} onChange={e => setForm({...form, data_custo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-rose-500" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold cursor-pointer transition shadow-md">Salvar Custo</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function TabEntregaveis({ projeto, api, onReload }) {
    const [entregaveis, setEntregaveis] = useState([]);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ titulo: '', data_prevista: '', valor_faturamento: '' });

    const carregar = () => api.get(`/projetos/${projeto.id}/entregaveis`).then(res => setEntregaveis(res.data.data));
    useEffect(() => { carregar(); }, [projeto.id]);

    const salvar = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projetos/${projeto.id}/entregaveis`, form);
            setModal(false);
            setForm({ titulo: '', data_prevista: '', valor_faturamento: '' });
            carregar();
        } catch (err) { alert("Erro ao criar entregável."); }
    };

    const faturar = async (entregavel) => {
        if (!projeto.cliente_id) {
            alert("Atenção: Este projeto não possui um Cliente vinculado na sua raiz. Clique no ícone de engrenagem no cabeçalho do projeto para vincular um cliente antes de faturar.");
            return;
        }

        if (!window.confirm(`Deseja aprovar e faturar o marco "${entregavel.titulo}" no valor de R$ ${Number(entregavel.valor_faturamento).toFixed(2)}? Isso irá gerar um Pedido de Venda.`)) return;

        try {
            await api.post(`/projetos/entregaveis/${entregavel.id}/faturar`);
            alert("Fatura gerada com sucesso e enviada ao contas a receber!");
            carregar();
        } catch (err) {
            alert("O motor financeiro e fiscal receberá este comando na Sprint 3. A estrutura visual já está amarrada.");
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-400"/> Marcos de Faturamento (Milestones)</h3>
                    <p className="text-xs text-slate-400 mt-1">Vincule as entregas do projeto a parcelas de faturamento</p>
                </div>
                <button onClick={() => setModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md">+ Novo Entregável</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {entregaveis.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-3 p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">Sem entregáveis mapeados neste projeto.</div>
                ) : entregaveis.map(e => (
                    <div key={e.id} className="p-5 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-xl flex flex-col justify-between transition-colors shadow-sm">
                        <div className="mb-4">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-white text-sm leading-tight pr-2">{e.titulo}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${e.status === 'FATURADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                                    {e.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5 font-mono">Previsão: {e.data_prevista ? new Date(e.data_prevista).toLocaleDateString('pt-BR') : 'A definir'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                            <span className="font-mono font-bold text-lg text-emerald-400">R$ {Number(e.valor_faturamento).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            {e.status !== 'FATURADO' && (
                                <button onClick={() => faturar(e)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-md">
                                    Gerar Fatura
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={salvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">Mapear Novo Entregável</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Nome da Etapa / Milestone</label>
                            <input type="text" required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Fase 1 - Infraestrutura" className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Valor Faturado (R$)</label>
                                <input type="number" step="0.01" required value={form.valor_faturamento} onChange={e => setForm({...form, valor_faturamento: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Previsão Entrega</label>
                                <input type="date" value={form.data_prevista} onChange={e => setForm({...form, data_prevista: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer transition shadow-md">Salvar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
