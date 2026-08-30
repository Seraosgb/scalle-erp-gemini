import React, { useState } from 'react';
import axios from 'axios';

export default function LandingCrm() {
    const [form, setForm] = useState({
        nome: '',
        telefone: '',
        email: '',
        mensagem: '',
        valor_estimado: ''
    });
    const [enviando, setEnviando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEnviando(true);
        setErro('');
        try {
            // Utiliza o endpoint de Inbound com fallback de host
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            await axios.post(`${apiUrl}/crm/webhook/token-padrao`, form);
            setSucesso(true);
            setForm({ nome: '', telefone: '', email: '', mensagem: '', valor_estimado: '' });
        } catch (err) {
            // Em caso de envio direto, tenta o endpoint relativo
            try {
                await axios.post('/api/crm/webhook/token-padrao', form);
                setSucesso(true);
            } catch (e) {
                setErro('Não foi possível registrar seu contato no momento. Tente via WhatsApp direto.');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
            {/* Header */}
            <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/80 sticky top-0 z-40 px-6 py-4 flex justify-between items-center max-w-6xl mx-auto w-full">
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-600/30">S</span>
                    <span className="font-bold text-lg tracking-tight text-white">Scalle <span className="text-indigo-400">CRM</span></span>
                </div>
                <a
                    href="https://wa.me/5521999999999"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950"
                >
                    <span>💬</span> Falar com Consultor
                </a>
            </header>

            {/* Hero & Form Section */}
            <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1 w-full">
                {/* Copywriting */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        Gestão Comercial de Alta Precisão
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-100">
                        Acelere seus negócios com o <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">Pipeline Inteligente</span>
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                        Centralize oportunidades, automatize follow-ups e converta leads diretamente em orçamentos operacionais no ERP em poucos cliques.
                    </p>

                    {/* Provas Sociais / Benefícios */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900">
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-emerald-400">100% Integrado</p>
                            <p className="text-xs text-slate-500">Conversão atômica de Lead para Orçamento no ERP</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-sky-400">Multi-Pipeline</p>
                            <p className="text-xs text-slate-500">Esteiras personalizadas para serviços, contratos e balcão</p>
                        </div>
                    </div>
                </div>

                {/* Formulário de Inbound */}
                <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
                    {sucesso ? (
                        <div className="text-center py-8 space-y-3">
                            <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl border border-emerald-800">✓</div>
                            <h3 className="text-lg font-bold text-white">Solicitação Recebida!</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Nossos especialistas comerciais entrarão em contato via WhatsApp nas próximas horas.
                            </p>
                            <button
                                onClick={() => setSucesso(false)}
                                className="text-xs text-indigo-400 hover:underline pt-2 font-semibold"
                            >
                                Enviar outra solicitação
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-white">Solicite uma Demonstração</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Preencha os dados e receba uma proposta consultiva.</p>
                            </div>

                            {erro && (
                                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs">
                                    {erro}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome / Empresa *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                                    placeholder="Ex: João da Silva / Clínica Alpha"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.telefone}
                                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                                        placeholder="(21) 99999-9999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                                        placeholder="joao@empresa.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Qual serviço ou demanda você precisa?</label>
                                <textarea
                                    rows="3"
                                    value={form.mensagem}
                                    onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                                    placeholder="Ex: Preciso de manutenção preventiva PMOC em 10 máquinas..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={enviando}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                            >
                                {enviando ? 'Enviando...' : 'Quero uma Proposta Personalizada'}
                            </button>
                        </form>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} Scalle ERP • Plataforma de Gestão e CRM Multi-Tenant.
            </footer>
        </div>
    );
}