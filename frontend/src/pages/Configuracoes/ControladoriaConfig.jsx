import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { GitMerge, Plus, Folder, FileText, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function ControladoriaConfig() {
    const [activeTab, setActiveTab] = useState('planos_contas');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Estado do Modal
    const [modalAberto, setModalAberto] = useState(false);
    const [form, setForm] = useState({
        parent_id: '',
        codigo: '',
        nome: '',
        tipo: 'DESPESA',
        is_sintetico: false
    });
    const [parentName, setParentName] = useState('');

    useEffect(() => {
        carregarDados();
    }, [activeTab]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'planos_contas' ? '/controladoria/planos-contas' : '/controladoria/centros-custos';
            const res = await api.get(endpoint);
            setData(res.data?.data || []);
        } catch (error) {
            console.error(error);
            setFeedback({ tipo: 'erro', msg: 'Erro ao carregar a árvore estrutural.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            const endpoint = activeTab === 'planos_contas' ? '/controladoria/planos-contas' : '/controladoria/centros-custos';
            await api.post(endpoint, form);
            setModalAberto(false);
            setFeedback({ tipo: 'sucesso', msg: 'Nova conta/centro adicionado com sucesso!' });
            carregarDados();
        } catch (error) {
            setFeedback({ tipo: 'erro', msg: error.response?.data?.error?.message || error.response?.data?.message || 'Erro ao salvar registro.' });
        }
    };

    const abrirModalNovo = (parentId = '', parentTitle = '') => {
        setParentName(parentTitle);
        setForm({
            parent_id: parentId,
            codigo: '',
            nome: '',
            tipo: 'DESPESA',
            is_sintetico: false
        });
        setModalAberto(true);
    };

    // Componente Recursivo para renderizar a Árvore
    const TreeNode = ({ node, level = 0 }) => {
        const [isExpanded, setIsExpanded] = useState(true);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div className="flex flex-col">
                <div className={`flex items-center justify-between p-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition group ${level === 0 ? 'bg-slate-900/40' : ''}`} style={{ paddingLeft: `${(level * 24) + 12}px` }}>
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white transition cursor-pointer p-0.5">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        ) : (
                            <span className="w-4"></span> // Spacer
                        )}

                        <div className={`p-1.5 rounded-lg border ${node.is_sintetico ? 'bg-indigo-950 border-indigo-800 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            {node.is_sintetico ? <Folder size={14} /> : <FileText size={14} />}
                        </div>

                        <span className="font-mono text-sm font-bold text-slate-300 w-24 shrink-0">{node.codigo}</span>
                        <span className={`text-sm ${node.is_sintetico ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>{node.nome}</span>

                        {activeTab === 'planos_contas' && level === 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-3 ${
                                node.tipo === 'RECEITA' ? 'bg-emerald-950 text-emerald-400' :
                                node.tipo === 'DESPESA' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                                {node.tipo}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.is_sintetico && (
                            <button
                                onClick={() => abrirModalNovo(node.id, `${node.codigo} - ${node.nome}`)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded cursor-pointer transition"
                            >
                                <Plus size={12} /> Subconta
                            </button>
                        )}
                    </div>
                </div>

                {/* Renderiza os Filhos Recursivamente se estiver expandido */}
                {isExpanded && hasChildren && (
                    <div className="flex flex-col border-l border-slate-800 ml-[22px]">
                        {node.children.map(child => (
                            <TreeNode key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 text-slate-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <GitMerge className="h-6 w-6 text-indigo-500" /> Controladoria Gerencial
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Estruturação da Árvore de Plano de Contas e Centros de Custo para DRE.
                    </p>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2">
                        {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="font-medium">{feedback.msg}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Abas */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('planos_contas')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer ${
                        activeTab === 'planos_contas' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    Plano de Contas
                </button>
                <button
                    onClick={() => setActiveTab('centros_custos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer ${
                        activeTab === 'centros_custos' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    Centros de Custo
                </button>
            </div>

            {/* Content Tree */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            Estrutura Base: {activeTab === 'planos_contas' ? 'Plano de Contas' : 'Centros de Custo'}
                        </h2>
                        <p className="text-[10px] text-slate-400 mt-0.5">As contas Sintéticas (Pastas) apenas agrupam valores. Contas Analíticas recebem lançamentos.</p>
                    </div>
                    <button
                        onClick={() => abrirModalNovo('', 'Raiz (Nível Principal)')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                    >
                        <Plus size={16} /> Adicionar Raiz
                    </button>
                </div>

                <div className="flex-1 p-2 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 animate-pulse font-bold">Carregando estrutura hierárquica...</div>
                    ) : data.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 m-4 rounded-xl">
                            Nenhuma estrutura cadastrada. Clique em "Adicionar Raiz" para começar a montar sua árvore.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {data.map(rootNode => (
                                <TreeNode key={rootNode.id} node={rootNode} level={0} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE CRIAÇÃO */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleSalvar} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <GitMerge className="h-5 w-5 text-indigo-400" /> Adicionar na Estrutura
                            </h3>
                            <button type="button" onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-400">
                                <strong>Criando dentro de:</strong> <span className="text-indigo-300 font-mono ml-1">{parentName}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block font-bold text-slate-400 mb-1">Código (Ex: 1.01) *</label>
                                    <input type="text" required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:border-indigo-500" placeholder="1.01.001" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block font-bold text-slate-400 mb-1">Comportamento</label>
                                    <select value={form.is_sintetico} onChange={e => setForm({...form, is_sintetico: e.target.value === 'true'})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500 cursor-pointer">
                                        <option value="false">Analítico (Recebe Valor)</option>
                                        <option value="true">Sintético (Pasta Agrupadora)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-400 mb-1">Nome da Conta / Centro *</label>
                                <input type="text" required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500" placeholder="Despesas Operacionais" />
                            </div>

                            {activeTab === 'planos_contas' && !form.parent_id && (
                                <div>
                                    <label className="block font-bold text-slate-400 mb-1">Tipo de Natureza (Apenas para Raiz) *</label>
                                    <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500 cursor-pointer">
                                        <option value="RECEITA">Receita</option>
                                        <option value="DESPESA">Despesa</option>
                                        <option value="ATIVO">Ativo</option>
                                        <option value="PASSIVO">Passivo</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-950/30">
                            <button type="button" onClick={() => setModalAberto(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition cursor-pointer">Cancelar</button>
                            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer">Salvar na Árvore</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
