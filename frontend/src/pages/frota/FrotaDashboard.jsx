import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import ModalAbastecimento from './ModalAbastecimento';

export default function FrotaDashboard() {
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);

    const carregarVeiculos = async () => {
        try {
            setLoading(true);
            // O Axios já injeta o token automaticamente via interceptor
            const response = await api.get('/frota/veiculos');

            // O Laravel retorna paginação (data.data) ou array direto (data)
            const lista = response.data?.data?.data || response.data?.data || [];

            // Blindagem: Garante que a lista seja sempre um Array
            setVeiculos(Array.isArray(lista) ? lista : []);
        } catch (error) {
            console.error('Erro ao buscar frota:', error);
            setVeiculos([]); // Previne o erro ".map is not a function"
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarVeiculos();
    }, []);

    const abrirModalAbastecimento = (veiculo) => {
        setVeiculoSelecionado(veiculo);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Carregando frota da base...</div>;

    return (
        <div className="p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-slate-100">Gestão de Frotas</h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition font-medium">
                    + Novo Veículo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {veiculos.map(v => (
                    <div key={v.id} className="bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-100">{v.marca} {v.modelo}</h3>
                                <p className="text-sm text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 inline-block mt-2">
                                    {v.placa}
                                </p>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                                {v.status?.nome || 'Ativo'}
                            </span>
                        </div>

                        <div className="text-sm text-slate-400 mb-6 flex-grow space-y-1">
                            <p><strong className="text-slate-300">KM Atual:</strong> {v.km_atual}</p>
                            <p><strong className="text-slate-300">Ano:</strong> {v.ano_fabricacao}/{v.ano_modelo}</p>
                        </div>

                        <button
                            onClick={() => abrirModalAbastecimento(v)}
                            className="w-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold py-2.5 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-300 transition cursor-pointer"
                        >
                            ⛽ Registrar Abastecimento
                        </button>
                    </div>
                ))}

                {veiculos.length === 0 && (
                    <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                        Nenhum veículo cadastrado na frota.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <ModalAbastecimento
                    veiculo={veiculoSelecionado}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={carregarVeiculos}
                />
            )}
        </div>
    );
}
