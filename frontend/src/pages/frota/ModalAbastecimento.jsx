import React, { useState } from 'react';
import { api } from '../../services/api';
export default function ModalAbastecimento({ veiculo, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        km_marcador: '',
        litros: '',
        valor_total: '',
        data_abastecimento: new Date().toISOString().split('T')[0],
        motorista_id: '',
        posto_id: '',
    });
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            const payload = {
                veiculo_id: veiculo.id,
                ...formData,
                // Mockando IDs para não estourar erro de validação até você plugar os Selects reais
                motorista_id: formData.motorista_id || '9d6bf378-00b8-4c9f-b98a-784f1837f48a', // Substitua depois
                posto_id: formData.posto_id || '9d6bf378-00b8-4c9f-b98a-784f1837f48a'         // Substitua depois
            };

            await api.post('/frota/abastecimentos', payload);

            alert('Golaço! Abastecimento registrado com sucesso no Financeiro.');
            onSuccess();
            onClose();
        } catch (err) {
            // Pega o erro mastigado que criamos lá no Laravel Controller
            setErro(err.response?.data?.error?.message || err.message || 'Erro interno ao registrar abastecimento.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-100">Abastecer <span className="text-indigo-400">{veiculo.placa}</span></h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl cursor-pointer">&times;</button>
                </div>

                {erro && (
                    <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium">
                        ❌ {erro}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Data do Abastecimento</label>
                        <input type="date" required
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                            value={formData.data_abastecimento}
                            onChange={(e) => setFormData({...formData, data_abastecimento: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Odômetro (KM)</label>
                            <input type="number" step="0.1" required
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                                placeholder={`Atual: ${veiculo.km_atual}`}
                                value={formData.km_marcador}
                                onChange={(e) => setFormData({...formData, km_marcador: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Litros</label>
                            <input type="number" step="0.01" required
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                                placeholder="0.00"
                                value={formData.litros}
                                onChange={(e) => setFormData({...formData, litros: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Valor Total Pago (R$)</label>
                        <input type="number" step="0.01" required
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                            placeholder="0.00"
                            value={formData.valor_total}
                            onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition mt-6 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Processando transação...' : 'Confirmar Lançamento'}
                    </button>
                </form>
            </div>
        </div>
    );
}
