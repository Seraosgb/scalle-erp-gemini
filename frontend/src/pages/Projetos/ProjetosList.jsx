import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
    FolderKanban, Plus, Search, Building2,
    MoreVertical, CheckCircle2, XCircle, PlayCircle
} from 'lucide-react';

export default function ProjetosList() {
    const [projetos, setProjetos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFiltro, setStatusFiltro] = useState('ATIVO');
    const [menuAbertoId, setMenuAbertoId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const delay = setTimeout(() => { carregarProjetos(); }, 300);
        return () => clearTimeout(delay);
    }, [search, statusFiltro]);

    const carregarProjetos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projetos', {
                params: { search, status: statusFiltro }
            });
            setProjetos(response.data.data?.data || response.data?.data || []);
        } catch (error) {
            console.error("Erro ao carregar a lista de projetos:", error);
        } finally {
            setLoading(false);
        }
    };

    const criarProjeto = async () => {
        const nome = window.prompt("Qual o nome do novo Projeto corporativo?");
        if (!nome) return;

        try {
            await api.post('/projetos', { nome, orcamento_previsto: 0 });
            carregarProjetos();
        } catch (error) {
            alert("Erro ao criar projeto.");
        }
    };

    const alterarStatus = async (projetoId, novoStatus, e) => {
        e.stopPropagation();
        setMenuAbertoId(null);
        if (!window.confirm(`Deseja marcar este projeto como ${novoStatus}?`)) return;

        try {
            await api.patch(`/projetos/${projetoId}/status`, { status: novoStatus });
            carregarProjetos();
        } catch (error) {
            alert("Erro ao alterar status do projeto.");
        }
    };

    const toggleMenu = (id, e) => {
        e.stopPropagation();
        setMenuAbertoId(menuAbertoId === id ? null : id);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'CONCLUIDO': return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Concluído</span>;
            case 'CANCELADO': return <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Cancelado</span>;
            default: return <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Em Andamento</span>;
        }
    };

    return (
        <div className="min-h-screen space-y-6 p-2 sm:p-6 max-w-7xl mx-auto text-slate-200" onClick={() => setMenuAbertoId(null)}>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FolderKanban className="h-6 w-6 text-indigo-500" /> Portfólio de Projetos (PMO)
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Gestão de entregáveis, custos e pipeline de execução B2B</p>
                </div>
                <button
                    onClick={criarProjeto}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                    <Plus className="h-4 w-4" /> Novo Projeto
                </button>
            </header>

            {/* Painel de Filtros */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
                    {['ATIVO', 'CONCLUIDO', 'CANCELADO', 'TODOS'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFiltro(st)}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                statusFiltro === st ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {st === 'ATIVO' ? 'Ativos' : st === 'CONCLUIDO' ? 'Concluídos' : st === 'CANCELADO' ? 'Cancelados' : 'Todos'}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, cliente ou descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                </div>
            </div>

            {loading && projetos.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-bold">Carregando portfólio de projetos...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projetos.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-500 border border-dashed border-slate-700 bg-slate-900/50 rounded-2xl">
                            Nenhum projeto encontrado para os filtros atuais.
                        </div>
                    )}

                    {projetos.map(projeto => {
                        const progressoOrcamento = projeto.orcamento_previsto > 0
                            ? Math.min(100, (Number(projeto.custo_total_real || 0) / Number(projeto.orcamento_previsto)) * 100)
                            : 0;
                        const isEstourado = progressoOrcamento >= 100;

                        return (
                            <div
                                key={projeto.id}
                                onClick={() => navigate(`/app/projetos/${projeto.id}`)}
                                className="bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800 hover:border-indigo-500 hover:shadow-indigo-500/10 transition cursor-pointer flex flex-col group relative"
                            >
                                {/* Header do Card */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="space-y-1.5 pr-6">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(projeto.status)}
                                            <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                                                {projeto.tarefas_count || 0} Tarefas
                                            </span>
                                        </div>
                                        <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition leading-tight">
                                            {projeto.nome}
                                        </h2>
                                    </div>

                                    {/* Menu de Ações Rápido */}
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={(e) => toggleMenu(projeto.id, e)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                        >
                                            <MoreVertical className="h-5 w-5" />
                                        </button>

                                        {menuAbertoId === projeto.id && (
                                            <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                                {projeto.status !== 'CONCLUIDO' && (
                                                    <button onClick={(e) => alterarStatus(projeto.id, 'CONCLUIDO', e)} className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-400 hover:bg-slate-700 flex items-center gap-2 cursor-pointer">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Concluído
                                                    </button>
                                                )}
                                                {projeto.status !== 'ATIVO' && (
                                                    <button onClick={(e) => alterarStatus(projeto.id, 'ATIVO', e)} className="w-full px-4 py-2 text-left text-xs font-semibold text-indigo-400 hover:bg-slate-700 flex items-center gap-2 cursor-pointer">
                                                        <PlayCircle className="h-3.5 w-3.5" /> Reativar Projeto
                                                    </button>
                                                )}
                                                {projeto.status !== 'CANCELADO' && (
                                                    <button onClick={(e) => alterarStatus(projeto.id, 'CANCELADO', e)} className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-slate-700 flex items-center gap-2 cursor-pointer">
                                                        <XCircle className="h-3.5 w-3.5" /> Cancelar Projeto
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body do Card */}
                                <div className="space-y-3 mb-5 flex-1">
                                    {projeto.cliente && (
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                                            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                            <span className="truncate">{projeto.cliente.nome_razao_social}</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400 line-clamp-3">
                                        {projeto.descricao || <span className="italic opacity-50">Sem escopo ou descrição definida.</span>}
                                    </p>
                                </div>

                                {/* Footer (Saúde Financeira) */}
                                <div className="mt-auto border-t border-slate-800 pt-3 space-y-2">
                                    <div className="flex justify-between items-end text-xs">
                                        <div>
                                            <p className="text-slate-500 font-medium">Orçamento (Budget)</p>
                                            <p className="text-white font-mono font-bold">R$ {Number(projeto.orcamento_previsto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 font-medium">Custo Apropriado</p>
                                            <p className={`font-mono font-bold ${isEstourado ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                R$ {Number(projeto.custo_total_real || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${isEstourado ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.max(2, progressoOrcamento)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
