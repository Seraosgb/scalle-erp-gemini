import React, { useState } from 'react';
import { api } from '../../services/api';

export default function AuditoriaE2EView() {
    const [executando, setExecutando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);

    const dispararAuditoria = async () => {
        setExecutando(true);
        setErro(null);
        try {
            const res = await api.post('/master/executar-auditoria');
            setResultado(res.data.data);
        } catch (err) {
            setErro(err.response?.data?.error?.message || err.message || 'Falha ao executar auditoria.');
        } finally {
            setExecutando(false);
        }
    };

    const laudo = resultado?.laudo;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Auditoria Cirúrgica E2E</h1>
                    <p className="text-sm text-slate-400">
                        Executa testes transacionais de ponta a ponta com rollback automático no servidor.
                    </p>
                </div>
                <button
                    onClick={dispararAuditoria}
                    disabled={executando}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                >
                    {executando ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Auditando Sistema...
                        </>
                    ) : (
                        'Executar Auditoria Geral'
                    )}
                </button>
            </div>

            {erro && (
                <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl">
                    <p className="font-semibold">Erro na execução:</p>
                    <p className="text-sm mt-1">{erro}</p>
                </div>
            )}

            {laudo && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs uppercase text-slate-400">Total de Verificações</span>
                            <p className="text-2xl font-bold text-white mt-1">{laudo.total_testes}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs uppercase text-emerald-400">Sucessos</span>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{laudo.sucessos}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs uppercase text-red-400">Falhas</span>
                            <p className="text-2xl font-bold text-red-400 mt-1">{laudo.falhas}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs uppercase text-slate-400">Duração</span>
                            <p className="text-2xl font-bold text-slate-200 mt-1">{laudo.duracao_segundos}s</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="font-bold text-white">Resultados Detalhados</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th className="p-3">Módulo</th>
                                        <th className="p-3">Cenário</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3">Diagnóstico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {laudo.itens?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                                            <td className="p-3 font-semibold text-slate-300">{item.modulo}</td>
                                            <td className="p-3 text-slate-200">{item.teste}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    item.status === 'PASS'
                                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                        : 'bg-red-950 text-red-400 border border-red-800'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-slate-400">{item.detalhes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
