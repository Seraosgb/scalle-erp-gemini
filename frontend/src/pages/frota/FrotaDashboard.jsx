import React, { useState, useEffect } from 'react';
import ModalAbastecimento from './ModalAbastecimento';

export default function FrotaDashboard() {
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);

    const carregarVeiculos = async () => {
        try {
            // Em produção, o token vem do seu AuthContext
            const token = localStorage.getItem('scalle_auth_token');
            const response = await fetch('/api/frota/veiculos', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            setVeiculos(data.data || data); // Ajuste conforme a paginação
        } catch (error) {
            console.error('Erro ao buscar frota:', error);
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

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando frota da base...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gestão de Frotas</h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
                    + Novo Veículo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {veiculos.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{v.marca} {v.modelo}</h3>
                                <p className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                                    {v.placa}
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full text-green-700 bg-green-100">
                                {v.status?.nome || 'Ativo'}
                            </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-4 flex-grow">
                            <p><strong>KM Atual:</strong> {v.km_atual}</p>
                            <p><strong>Ano:</strong> {v.ano_fabricacao}/{v.ano_modelo}</p>
                        </div>

                        <button
                            onClick={() => abrirModalAbastecimento(v)}
                            className="w-full bg-blue-50 text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-100 transition"
                        >
                            ⛽ Registrar Abastecimento
                        </button>
                    </div>
                ))}
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
