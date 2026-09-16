import React, { useState } from 'react';

export default function ModalAbastecimento({ veiculo, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        km_marcador: '',
        litros: '',
        valor_total: '',
        data_abastecimento: new Date().toISOString().split('T')[0],
        motorista_id: '', // Num cenário real, viria de um Select
        posto_id: '',     // Num cenário real, viria de um Select
    });
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            const token = localStorage.getItem('scalle_auth_token');
            const response = await fetch('/api/frota/abastecimentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    veiculo_id: veiculo.id,
                    ...formData,
                    // Mockando IDs para o teste visual. Substitua pelos selects reais depois.
                    motorista_id: formData.motorista_id || 'cole-um-uuid-de-pessoa-aqui',
                    posto_id: formData.posto_id || 'cole-um-uuid-de-pessoa-aqui'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro ao registrar abastecimento');
            }

            alert('Golaço! Abastecimento registrado com sucesso no Financeiro.');
            onSuccess();
            onClose();
        } catch (err) {
            setErro(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Abastecer {veiculo.placa}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                {erro && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        ❌ {erro}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                        <input type="date" required className="w-full border border-gray-300 rounded-md p-2"
                            value={formData.data_abastecimento}
                            onChange={(e) => setFormData({...formData, data_abastecimento: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Odômetro (KM)</label>
                            <input type="number" step="0.1" required className="w-full border border-gray-300 rounded-md p-2"
                                placeholder={`Atual: ${veiculo.km_atual}`}
                                value={formData.km_marcador}
                                onChange={(e) => setFormData({...formData, km_marcador: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Litros</label>
                            <input type="number" step="0.01" required className="w-full border border-gray-300 rounded-md p-2"
                                value={formData.litros}
                                onChange={(e) => setFormData({...formData, litros: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total Pago (R$)</label>
                        <input type="number" step="0.01" required className="w-full border border-gray-300 rounded-md p-2"
                            value={formData.valor_total}
                            onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition mt-4 disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : 'Confirmar Pagamento'}
                    </button>
                </form>
            </div>
        </div>
    );
}
