import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function ModalNovoVeiculo({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        placa: '',
        chassi: '',
        marca: '',
        modelo: '',
        ano_fabricacao: new Date().getFullYear(),
        ano_modelo: new Date().getFullYear(),
        km_atual: 0,
        tipo_combustivel_id: '',
        status_id: ''
    });

    const [dominios, setDominios] = useState({ status_veiculo: [], tipos_combustivel: [] });
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    // Busca as listas suspensas dinâmicas ao abrir o modal
    useEffect(() => {
        const carregarDominios = async () => {
            try {
                const response = await api.get('/frota/dominios');
                setDominios(response.data?.data || { status_veiculo: [], tipos_combustivel: [] });
            } catch (err) {
                console.error("Erro ao carregar domínios:", err);
            }
        };
        carregarDominios();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            await api.post('/frota/veiculos', formData);
            onSuccess();
            onClose();
        } catch (err) {
            setErro(err.response?.data?.error?.message || err.message || 'Erro ao cadastrar veículo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-100">Cadastrar Novo Veículo</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl cursor-pointer">&times;</button>
                </div>

                {erro && (
                    <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium">
                        ❌ {erro}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Placa *</label>
                            <input type="text" required maxLength="10"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none uppercase"
                                placeholder="ABC-1234 ou ABC1D23"
                                value={formData.placa}
                                onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Chassi</label>
                            <input type="text" maxLength="50"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none uppercase"
                                placeholder="Opcional"
                                value={formData.chassi}
                                onChange={(e) => setFormData({...formData, chassi: e.target.value.toUpperCase()})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Marca *</label>
                            <input type="text" required maxLength="50"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                placeholder="Ex: Fiat, Chevrolet, Scania"
                                value={formData.marca}
                                onChange={(e) => setFormData({...formData, marca: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Modelo *</label>
                            <input type="text" required maxLength="100"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                placeholder="Ex: Uno Mille 1.0"
                                value={formData.modelo}
                                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Ano Fabricação *</label>
                            <input type="number" required min="1900"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                value={formData.ano_fabricacao}
                                onChange={(e) => setFormData({...formData, ano_fabricacao: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Ano Modelo *</label>
                            <input type="number" required min="1900"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                value={formData.ano_modelo}
                                onChange={(e) => setFormData({...formData, ano_modelo: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Hodômetro Inicial (KM)</label>
                            <input type="number" step="0.1" min="0"
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                value={formData.km_atual}
                                onChange={(e) => setFormData({...formData, km_atual: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Combustível</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none cursor-pointer"
                                value={formData.tipo_combustivel_id}
                                onChange={(e) => setFormData({...formData, tipo_combustivel_id: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {dominios.tipos_combustivel.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Status Inicial</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none cursor-pointer"
                                value={formData.status_id}
                                onChange={(e) => setFormData({...formData, status_id: e.target.value})}
                            >
                                <option value="">Padrão do Sistema</option>
                                {dominios.status_veiculo.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-slate-800 text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'Salvando...' : 'Salvar Veículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
