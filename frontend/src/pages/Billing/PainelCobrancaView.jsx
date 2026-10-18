import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';

export default function PainelCobrancaView() {
    const [loading, setLoading] = useState(true);
    const [dadosAssinatura, setDadosAssinatura] = useState(null);
    const [faturas, setFaturas] = useState([]);
    const [erro, setErro] = useState(null);

    // Estados do Modal de Upgrade
    const [modalPlanos, setModalPlanos] = useState(false);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [alterandoPlano, setAlterandoPlano] = useState(false);

    const carregarDados = async () => {
        setLoading(true);
        setErro(null);
        try {
            const [resAssinatura, resFaturas] = await Promise.all([
                api.get('/billing/minha-assinatura'),
                api.get('/billing/historico-faturas')
            ]);

            setDadosAssinatura(resAssinatura.data.data);
            setFaturas(resFaturas.data.data || resFaturas.data || []);
        } catch (err) {
            const mensagem = err.response?.data?.error || err.response?.data?.message || err.message || 'Falha ao carregar faturamento.';
            setErro(mensagem);
        } finally {
            setLoading(false);
        }
    };

    const abrirModalPlanos = async () => {
        setModalPlanos(true);
        try {
            const res = await api.get('/public/planos');
            setPlanosDisponiveis(res.data?.data || []);
        } catch (e) {
            console.error('Falha ao carregar planos', e);
        }
    };

    const handleAlterarPlano = async (slug) => {
        setAlterandoPlano(true);
        try {
            await api.post('/billing/alterar-plano', { plano_slug: slug });
            setModalPlanos(false);
            carregarDados();
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Erro ao alterar plano.');
        } finally {
            setAlterandoPlano(false);
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
                <p className="font-semibold">Erro ao carregar painel</p>
                <p className="text-sm">{erro}</p>
                <button onClick={carregarDados} className="mt-2 text-xs font-semibold underline hover:text-red-900 cursor-pointer">
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
                    <h1 className="text-2xl font-bold text-slate-100">Assinatura & Faturamento</h1>
                    <p className="text-sm text-slate-400">Gerencie seu plano corporativo, faturas e cotas de uso.</p>
                </div>
                <button
                    onClick={carregarDados}
                    className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition cursor-pointer"
                >
                    Atualizar Dados
                </button>
            </div>

            {isSoftLocked && (
                <div className="p-4 bg-amber-950/40 border-l-4 border-amber-500 rounded-r-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-amber-400 font-bold">Conta em Modo Somente Leitura (Soft-Lock)</h3>
                            <p className="text-amber-300/80 text-sm mt-0.5">
                                Identificamos pendência financeira. As mutações estão pausadas até a quitação da fatura.
                            </p>
                        </div>
                        {fatura_aberta?.link_pagamento && (
                            <a
                                href={fatura_aberta.link_pagamento}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl shadow transition text-center whitespace-nowrap"
                            >
                                Pagar Fatura Agora
                            </a>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Plano Contratado</span>
                        <h2 className="text-xl font-bold text-white mt-1">{assinatura?.plano?.nome || 'Enterprise Custom'}</h2>
                        <p className="text-2xl font-extrabold text-indigo-400 mt-2">
                            R$ {Number(assinatura?.plano?.valor_mensal || 0).toFixed(2)}
                            <span className="text-xs text-slate-400 font-normal"> /mês</span>
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            assinatura?.status === 'ATIVO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            assinatura?.status === 'TRIAL' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                            {assinatura?.status}
                        </span>
                        <button onClick={abrirModalPlanos} className="text-indigo-400 hover:text-indigo-300 font-bold text-xs underline cursor-pointer">
                            Fazer Upgrade
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Fatura Atual</span>
                        {fatura_aberta ? (
                            <>
                                <h2 className="text-xl font-bold text-white mt-1">R$ {Number(fatura_aberta.valor).toFixed(2)}</h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Vencimento: {fatura_aberta.vencimento ? new Date(fatura_aberta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                </p>
                                <div className="mt-4">
                                    <a
                                        href={fatura_aberta.link_pagamento}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block w-full text-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow transition"
                                    >
                                        Pagar via PIX, Boleto ou Cartão
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="mt-2 text-slate-300">
                                <p className="font-semibold text-emerald-400">Sem pendências financeiras</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Próxima renovação: {assinatura?.data_proximo_vencimento ? new Date(assinatura.data_proximo_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-400">Armazenamento (Storage)</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-white">{metricas_uso?.storage_utilizado_gb || 0} GB</span>
                            <span className="text-xs text-slate-400">de {metricas_uso?.storage_limite_gb || 0} GB</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    percentualStorage > 90 ? 'bg-red-500' :
                                    percentualStorage > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${percentualStorage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">{percentualStorage}% utilizado</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-800">
                    <h3 className="font-bold text-white">Histórico de Cobranças</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                                <th className="p-4 font-semibold">Identificador</th>
                                <th className="p-4 font-semibold">Valor</th>
                                <th className="p-4 font-semibold">Vencimento</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {faturas.length === 0 ? (
                                <tr><td colSpan="5" className="p-6 text-center text-slate-500">Nenhuma fatura registrada.</td></tr>
                            ) : (
                                faturas.map((fat) => (
                                    <tr key={fat.id} className="hover:bg-slate-800/50 transition">
                                        <td className="p-4 font-mono text-xs text-slate-400">{fat.gateway_payment_id || fat.id.substring(0, 8)}</td>
                                        <td className="p-4 font-bold text-white">R$ {Number(fat.valor).toFixed(2)}</td>
                                        <td className="p-4 text-slate-300">{fat.data_vencimento ? new Date(fat.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                fat.status === 'RECEIVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                                fat.status === 'PENDING' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                                                fat.status === 'OVERDUE' ? 'bg-red-950 text-red-400 border border-red-800' :
                                                'bg-slate-800 text-slate-300'
                                            }`}>
                                                {fat.status === 'RECEIVED' ? 'Pago' : fat.status === 'PENDING' ? 'Aguardando' : fat.status === 'OVERDUE' ? 'Vencido' : fat.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {fat.url_fatura_gateway ? (
                                                <a href={fat.url_fatura_gateway} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-medium text-xs underline">Visualizar Fatura</a>
                                            ) : <span className="text-slate-600 text-xs">-</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Escolha de Planos (Upgrade) */}
            {modalPlanos && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl p-6 md:p-10 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                            <h2 className="text-2xl font-bold text-white">Alterar Plano (Upgrade / Downgrade)</h2>
                            <button onClick={() => setModalPlanos(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-6 w-6" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {planosDisponiveis.map(plano => {
                                const isAtual = assinatura?.plano?.id === plano.id;
                                return (
                                    <div key={plano.id} className={`p-6 rounded-2xl border ${isAtual ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-900 border-slate-800'} flex flex-col justify-between`}>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{plano.nome}</h3>
                                            <div className="mt-2 text-3xl font-extrabold text-white">
                                                R$ {Number(plano.valor_mensal).toFixed(2).replace('.', ',')}
                                                <span className="text-xs text-slate-400 font-normal">/mês</span>
                                            </div>
                                            <ul className="mt-4 space-y-2 text-xs text-slate-300">
                                                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Até {plano.limite_usuarios} Usuários</li>
                                                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Até {plano.limite_empresas} Filiais</li>
                                                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> {Math.round(plano.cota_storage_bytes / 1073741824)} GB de Arquivos</li>
                                            </ul>
                                        </div>
                                        <button
                                            onClick={() => handleAlterarPlano(plano.slug)}
                                            disabled={isAtual || alterandoPlano}
                                            className={`mt-6 w-full py-3 rounded-xl font-bold text-xs transition ${
                                                isAtual ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer'
                                            }`}
                                        >
                                            {isAtual ? 'Plano Atual' : (alterandoPlano ? 'Processando...' : 'Mudar para este plano')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
