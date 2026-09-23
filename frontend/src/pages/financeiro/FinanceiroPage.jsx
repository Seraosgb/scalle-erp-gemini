import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DollarSign, Plus, Building2, CreditCard, Wallet, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function FinanceiroPage() {
    const [tabAtiva, setTabAtiva] = useState('TITULOS'); // TITULOS ou CONTAS
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Estados - Títulos
    const [titulos, setTitulos] = useState([]);

    // Estados - Contas
    const [contas, setContas] = useState([]);
    const [modalConta, setModalConta] = useState(false);
    const [formConta, setFormConta] = useState({
        nome: '', tipo_conta: 'BANCO', codigo_banco: '', agencia: '', numero_conta: '', saldo_inicial: 0
    });

    useEffect(() => {
        if (tabAtiva === 'TITULOS') carregarTitulos();
        if (tabAtiva === 'CONTAS') carregarContas();
    }, [tabAtiva]);

    const carregarTitulos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financeiro/titulos');
            setTitulos(res.data?.data || res.data?.data?.data || []); // Paginate ou array direto
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const carregarContas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financeiro/contas');
            setContas(res.data?.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarConta = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/financeiro/contas', formConta);
            setModalConta(false);
            setFeedback({ tipo: 'sucesso', msg: 'Conta bancária adicionada com sucesso!' });
            setFormConta({ nome: '', tipo_conta: 'BANCO', codigo_banco: '', agencia: '', numero_conta: '', saldo_inicial: 0 });
            carregarContas();
        } catch (error) {
            setFeedback({ tipo: 'erro', msg: error.response?.data?.error?.message || 'Erro ao criar conta.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-emerald-500" /> Gestão Financeira
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Controle de contas a pagar, a receber e saldos bancários.
                    </p>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">{feedback.msg}</span></div>
                    <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Abas de Navegação */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTabAtiva('TITULOS')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer ${tabAtiva === 'TITULOS' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Títulos Financeiros
                </button>
                <button
                    onClick={() => setTabAtiva('CONTAS')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer ${tabAtiva === 'CONTAS' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Contas Bancárias & Caixas
                </button>
            </div>

            {/* Aba Títulos */}
            {tabAtiva === 'TITULOS' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                        <h2 className="font-bold text-white">Contas a Pagar e Receber</h2>
                        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md cursor-pointer flex items-center gap-1">
                            <Plus size={14} /> Novo Título
                        </button>
                    </div>
                    <div className="overflow-x-auto p-4">
                        {titulos.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Nenhum título financeiro encontrado no momento.</div>
                        ) : (
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500 border-b border-slate-800">
                                    <tr>
                                        <th className="py-3 px-4">Documento</th>
                                        <th className="py-3 px-4">Pessoa</th>
                                        <th className="py-3 px-4">Vencimento</th>
                                        <th className="py-3 px-4 text-right">Valor</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {titulos.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-800/40">
                                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">{t.documento_numero}</td>
                                            <td className="py-3 px-4 text-white">{t.pessoa?.nome_razao_social || 'Avulso'}</td>
                                            <td className="py-3 px-4 font-mono">{t.data_vencimento?.split('-').reverse().join('/')}</td>
                                            <td className={`py-3 px-4 text-right font-bold ${t.natureza === 'RECEBER' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {t.natureza === 'RECEBER' ? '+' : '-'} R$ {Number(t.valor_original).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'LIQUIDADO' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Aba Contas Bancárias */}
            {tabAtiva === 'CONTAS' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setModalConta(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md cursor-pointer flex items-center gap-1">
                            <Plus size={16} /> Adicionar Banco / Caixa
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contas.length === 0 ? (
                            <div className="col-span-full bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-500">
                                Nenhuma conta bancária cadastrada. Adicione uma conta para iniciar a conciliação OFX.
                            </div>
                        ) : (
                            contas.map(c => (
                                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400">
                                                {c.tipo_conta === 'BANCO' ? <Building2 size={20} /> : c.tipo_conta === 'CAIXA' ? <Wallet size={20} /> : <CreditCard size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base">{c.nome}</h3>
                                                <p className="text-[10px] text-slate-400">{c.tipo_conta} {c.codigo_banco ? `- Banco ${c.codigo_banco}` : ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                        <p>Agência: <span className="font-mono text-slate-200">{c.agencia || '---'}</span></p>
                                        <p>Conta: <span className="font-mono text-slate-200">{c.numero_conta || '---'}</span></p>
                                    </div>
                                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                                        <span className="text-xs font-semibold text-slate-400">Saldo Atual</span>
                                        <span className={`text-lg font-bold font-mono ${Number(c.saldo_atual) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            R$ {Number(c.saldo_atual).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Nova Conta */}
            {modalConta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleSalvarConta} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">Nova Conta / Caixa</h3>
                            <button type="button" onClick={() => setModalConta(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-400 mb-1">Nome de Identificação (Ex: Itaú Empresa) *</label>
                                <input type="text" required value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-400 mb-1">Tipo *</label>
                                    <select required value={formConta.tipo_conta} onChange={e => setFormConta({...formConta, tipo_conta: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                                        <option value="BANCO">Banco Corrente</option>
                                        <option value="CAIXA">Caixa Físico</option>
                                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-400 mb-1">Código do Banco</label>
                                    <input type="text" value={formConta.codigo_banco} onChange={e => setFormConta({...formConta, codigo_banco: e.target.value})} placeholder="Ex: 341" className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-400 mb-1">Agência</label>
                                    <input type="text" value={formConta.agencia} onChange={e => setFormConta({...formConta, agencia: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-400 mb-1">Número da Conta</label>
                                    <input type="text" value={formConta.numero_conta} onChange={e => setFormConta({...formConta, numero_conta: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-400 mb-1">Saldo Inicial (R$)</label>
                                <input type="number" step="0.01" required value={formConta.saldo_inicial} onChange={e => setFormConta({...formConta, saldo_inicial: parseFloat(e.target.value) || 0})} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                            <button type="button" onClick={() => setModalConta(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer">Cancelar</button>
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer">
                                {loading ? 'Salvando...' : 'Salvar Conta'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
