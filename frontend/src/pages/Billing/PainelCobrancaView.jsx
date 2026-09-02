import React, { useState, useEffect } from 'react';

export default function PainelCobrancaView() {
    const [loading, setLoading] = useState(true);
    const [dadosAssinatura, setDadosAssinatura] = useState(null);
    const [faturas, setFaturas] = useState([]);
    const [erro, setErro] = useState(null);

    const carregarDados = async () => {
        setLoading(true);
        setErro(null);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            const [resAssinatura, resFaturas] = await Promise.all([
                fetch('/api/billing/minha-assinatura', { headers }),
                fetch('/api/billing/historico-faturas', { headers })
            ]);

            if (resAssinatura.status === 401) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            if (!resAssinatura.ok) {
                const erroData = await resAssinatura.json().catch(() => ({}));
                throw new Error(erroData.error || erroData.message || 'Falha ao carregar assinatura.');
            }

            const dataAssinatura = await resAssinatura.json();
            const dataFaturas = await resFaturas.json();

            setDadosAssinatura(dataAssinatura.data);
            setFaturas(dataFaturas.data || []);
        } catch (err) {
            setErro(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="font-semibold">Erro ao carregar faturamento</p>
                <p className="text-sm">{erro}</p>
                <button
                    onClick={carregarDados}
                    className="mt-2 text-xs font-semibold underline hover:text-red-900"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const { assinatura, fatura_aberta, metricas_uso } = dadosAssinatura || {};
    const percentualStorage = metricas_uso?.storage_limite_gb > 0
        ? Math.min(100, Math.round((metricas_uso.storage_utilizado_gb / metricas_uso.storage_limite_gb) * 100))
        : 0;

    const isSoftLocked = assinatura?.status === 'SOFT_LOCK' || assinatura?.status === 'SUSPENSO' || assinatura?.status === 'INADIMPLENTE';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assinatura & Faturamento</h1>
                    <p className="text-sm text-slate-500">Gestão de plano corporativo, cotas de storage e faturas.</p>
                </div>
                <button
                    onClick={carregarDados}
                    className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
                >
                    Atualizar Dados
                </button>
            </div>

            {isSoftLocked && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-amber-800 font-bold">Conta em Modo Leitura (Soft-Lock)</h3>
                            <p className="text-amber-700 text-sm mt-0.5">
                                Pendência financeira detectada. Novos lançamentos estão bloqueados até a quitação da fatura em aberto.
                            </p>
                        </div>
                        {fatura_aberta?.link_pagamento && (
                            <a
                                href={fatura_aberta.link_pagamento}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg shadow transition text-center whitespace-nowrap"
                            >
                                Pagar Agora
                            </a>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Plano Contratado</span>
                        <h2 className="text-xl font-bold text-slate-800 mt-1">{assinatura?.plano?.nome || 'Enterprise Custom'}</h2>
                        <p className="text-2xl font-extrabold text-indigo-600 mt-2">
                            R$ {Number(assinatura?.plano?.valor_mensal || 0).toFixed(2)}
                            <span className="text-xs text-slate-500 font-normal"> /mês</span>
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Status:</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            assinatura?.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
                            assinatura?.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {assinatura?.status}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Fatura Atual</span>
                        {fatura_aberta ? (
                            <>
                                <h2 className="text-xl font-bold text-slate-800 mt-1">R$ {Number(fatura_aberta.valor).toFixed(2)}</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Vencimento: {fatura_aberta.vencimento ? new Date(fatura_aberta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                </p>
                                <div className="mt-4">
                                    <a
                                        href={fatura_aberta.link_pagamento}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block w-full text-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow transition"
                                    >
                                        Pagar Fatura (PIX, Boleto, Cartão)
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="mt-2 text-slate-600">
                                <p className="font-semibold text-emerald-600">Sem pendências financeiras</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Próxima renovação: {assinatura?.data_proximo_vencimento ? new Date(assinatura.data_proximo_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Armazenamento em Nuvem</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-slate-800">{metricas_uso?.storage_utilizado_gb || 0} GB</span>
                            <span className="text-xs text-slate-500">de {metricas_uso?.storage_limite_gb || 0} GB</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    percentualStorage > 90 ? 'bg-red-500' :
                                    percentualStorage > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${percentualStorage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">{percentualStorage}% alocado</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Histórico de Cobranças</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <th className="p-4 font-semibold">Identificador</th>
                                <th className="p-4 font-semibold">Valor</th>
                                <th className="p-4 font-semibold">Vencimento</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Documento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {faturas.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-6 text-center text-slate-400">
                                        Nenhuma fatura encontrada.
                                    </td>
                                </tr>
                            ) : (
                                faturas.map((fat) => (
                                    <tr key={fat.id} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono text-xs text-slate-600">
                                            {fat.gateway_payment_id || fat.id.substring(0, 8)}
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            R$ {Number(fat.valor).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {fat.data_vencimento ? new Date(fat.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                fat.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                                                fat.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                                fat.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {fat.status === 'RECEIVED' ? 'Pago' :
                                                 fat.status === 'PENDING' ? 'Aguardando' :
                                                 fat.status === 'OVERDUE' ? 'Vencido' : fat.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {fat.url_fatura_gateway ? (
                                                <a
                                                    href={fat.url_fatura_gateway}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs underline"
                                                >
                                                    Visualizar Fatura
                                                </a>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
