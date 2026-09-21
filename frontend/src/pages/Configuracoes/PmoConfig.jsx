import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Settings, Plus, Edit2, Trash2, Tag, AlertCircle, Building2, DollarSign, Target, Activity } from 'lucide-react';

const TABS = [
    { id: 'status', label: 'Status dos Projetos', icon: Activity, hasColor: true, hasPeso: false },
    { id: 'prioridades', label: 'Prioridades das Tarefas', icon: Target, hasColor: true, hasPeso: true },
    { id: 'tipos', label: 'Tipos de Projetos', icon: Tag, hasColor: true, hasPeso: false },
    { id: 'departamentos', label: 'Departamentos', icon: Building2, hasColor: false, hasPeso: false },
    { id: 'categorias_custos', label: 'Categorias de Custo', icon: DollarSign, hasColor: false, hasPeso: false },
];

export default function PmoConfig() {
    const [activeTab, setActiveTab] = useState('status');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ open: false, isEdit: false, item: null });
    const [form, setForm] = useState({ nome: '', cor_hex: '#3b82f6', peso: 0 });

    const currentTabSpec = TABS.find(t => t.id === activeTab);

    useEffect(() => {
        carregarDados();
    }, [activeTab]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/pmo/configuracoes/${activeTab}`);
            setData(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (modal.isEdit) {
                await api.put(`/pmo/configuracoes/${activeTab}/${modal.item.id}`, form);
            } else {
                await api.post(`/pmo/configuracoes/${activeTab}`, form);
            }
            setModal({ open: false, isEdit: false, item: null });
            carregarDados();
        } catch (error) {
            alert("Erro ao salvar configuração.");
        }
    };

    const handleDeletar = async (id) => {
        if (!window.confirm("Deseja realmente apagar este registro? Certifique-se de que nenhum projeto dependa dele.")) return;
        try {
            await api.delete(`/pmo/configuracoes/${activeTab}/${id}`);
            carregarDados();
        } catch (error) {
            alert("Erro ao deletar.");
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setForm({ nome: item.nome, cor_hex: item.cor_hex || '#3b82f6', peso: item.peso || 0 });
            setModal({ open: true, isEdit: true, item });
        } else {
            setForm({ nome: '', cor_hex: '#3b82f6', peso: 0 });
            setModal({ open: true, isEdit: false, item: null });
        }
    };

    return (
        <div className="min-h-screen flex flex-col space-y-6 text-slate-200">
            <header className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl"><Settings className="text-indigo-400 h-6 w-6" /></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Taxonomia e Parâmetros (PMO)</h1>
                    <p className="text-xs text-slate-400 mt-1">Gerencie globalmente os domínios do módulo de projetos da sua empresa.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Menu Lateral de Abas */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition cursor-pointer text-left ${
                                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="w-4 h-4" /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Conteúdo Dinâmico Principal */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <currentTabSpec.icon className="text-indigo-400 w-5 h-5" />
                            Gerenciar {currentTabSpec.label}
                        </h2>
                        <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md flex items-center gap-2 cursor-pointer">
                            <Plus size={16} /> Adicionar Novo
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Carregando dados...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">Nome do Parâmetro</th>
                                        {currentTabSpec.hasPeso && <th className="p-4 text-center">Peso (Ord.)</th>}
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {data.length === 0 ? (
                                        <tr><td colSpan="3" className="p-8 text-center text-slate-500">Nenhum registro encontrado para esta categoria.</td></tr>
                                    ) : data.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                                            <td className="p-4 flex items-center gap-3">
                                                {currentTabSpec.hasColor && (
                                                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.cor_hex || '#3b82f6' }}></span>
                                                )}
                                                <span className="font-bold text-white">{item.nome}</span>
                                            </td>
                                            {currentTabSpec.hasPeso && <td className="p-4 text-center font-mono">{item.peso}</td>}
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => openModal(item)} className="p-2 bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 rounded transition cursor-pointer" title="Editar"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeletar(item.id)} className="p-2 bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 rounded transition cursor-pointer" title="Excluir"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL UNIVERSAL DO CRUD */}
            {modal.open && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSalvar} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">
                            {modal.isEdit ? 'Editar Registro' : 'Novo Registro'}
                        </h3>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Nome *</label>
                            <input type="text" required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                        </div>

                        {currentTabSpec.hasColor && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Cor de Identificação</label>
                                <div className="flex gap-3 items-center">
                                    <input type="color" value={form.cor_hex} onChange={e => setForm({...form, cor_hex: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-slate-950 border border-slate-800" />
                                    <span className="text-sm font-mono text-slate-300">{form.cor_hex}</span>
                                </div>
                            </div>
                        )}

                        {currentTabSpec.hasPeso && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Peso/Ordem de Grandeza (Numérico)</label>
                                <input type="number" required value={form.peso} onChange={e => setForm({...form, peso: e.target.value})} placeholder="Ex: 100" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
                                <p className="text-[10px] text-slate-500 mt-1">Números maiores aparecem no topo das listas de prioridade.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button type="button" onClick={() => setModal({ open: false, isEdit: false, item: null })} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold cursor-pointer transition shadow-md">Salvar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
