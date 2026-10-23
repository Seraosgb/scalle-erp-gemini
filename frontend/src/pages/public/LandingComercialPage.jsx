import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Building2,
  Zap, Lock, Layers, Cpu, Wrench, BarChart3, X
} from 'lucide-react';

export default function LandingComercialPage() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState([]);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    tenant_documento: '',
    tenant_razao_social: '',
    tenant_nome_fantasia: '',
    admin_name: '',
    admin_email: '',
    admin_telefone: '',
    admin_password: '',
  });

  useEffect(() => {
    api.get('/public/planos')
      .then(res => setPlanos(res.data?.data || []))
      .catch(() => {});
  }, []);

  const handleConsultarCnpj = async (valor) => {
    const limpo = valor.replace(/\D/g, '');
    setForm(prev => ({ ...prev, tenant_documento: valor }));

    if (limpo.length === 14) {
      setBuscandoCnpj(true);
      try {
        const res = await api.get(`/public/consultar-cnpj/${limpo}`);
        const d = res.data?.data;
        if (d) {
          setForm(prev => ({
            ...prev,
            tenant_razao_social: d.nome || prev.tenant_razao_social,
            tenant_nome_fantasia: d.fantasia || d.nome || prev.tenant_nome_fantasia,
            admin_telefone: d.telefone || prev.admin_telefone,
          }));
        }
      } catch (e) {
        // Silencioso se não encontrar
      } finally {
        setBuscandoCnpj(false);
      }
    }
  };

  const handleFinalizarCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const res = await api.post('/public/registrar-trial', {
        ...form,
        plano_slug: planoSelecionado.slug,
      });

      const { token, user } = res.data.data;
      localStorage.setItem('scalle_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('@scalle:token', token);
      localStorage.setItem('scalle_user', JSON.stringify(user));
      localStorage.setItem('@scalle:user', JSON.stringify(user));

      window.location.replace('/app/dashboard');
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Não foi possível concluir o provisionamento. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              S
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Scalle ERP</span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
              Enterprise Cloud
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Já sou cliente (Login)
            </Link>
            <a
              href="#planos"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              Testar 14 Dias Grátis
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-800/80 text-indigo-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Plataforma Multi-Tenant Integrada — Do MEI à Indústria
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Gestão Corporativa Blindada em uma Única Plataforma
        </h1>
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto">
          Ordens de Serviço com Assinatura MP 2.200-2, WMS com Lote/FEFO, PDV com Balança e Impressora USB, Motor Fiscal SEFAZ (NF-e/NFC-e), PCP Industrial, PMO Kanban e RH REP-P.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <a
            href="#planos"
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition"
          >
            Começar Teste Grátis de 14 Dias <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/login"
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-2xl text-sm transition"
          >
            Acessar Minha Conta
          </Link>
        </div>

        {/* Destaques Arquiteturais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12 text-left">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <Wrench className="h-6 w-6 text-indigo-400 mb-3" />
            <h3 className="font-bold text-white text-sm">CMMS, OS & PMOC</h3>
            <p className="text-xs text-slate-400 mt-1">Laudos técnicos com fotos, SLA automático, Portal do Cliente com PIX e assinatura digital SHA-256.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <Layers className="h-6 w-6 text-emerald-400 mb-3" />
            <h3 className="font-bold text-white text-sm">WMS, Compras & PDV</h3>
            <p className="text-xs text-slate-400 mt-1">Importação de XML NF-e, Curva ABC, endereçamento logístico e PDV integrado à balança e impressora térmica.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <Cpu className="h-6 w-6 text-amber-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Indústria PCP & Telemetria</h3>
            <p className="text-xs text-slate-400 mt-1">Ficha Técnica (BOM), cálculo MRP, OEE em tempo real, genealogia de lote e ingestão IoT.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <BarChart3 className="h-6 w-6 text-sky-400 mb-3" />
            <h3 className="font-bold text-white text-sm">DRE, Conciliação & Fiscal</h3>
            <p className="text-xs text-slate-400 mt-1">Conciliação bancária OFX, DRE gerencial Caixa/Competência, SPED Fiscal e Certificado A1 isolado.</p>
          </div>
        </div>
      </section>

      {/* Matriz de Planos */}
      <section id="planos" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900">
        <div className="text-center space-y-2 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            Oferta Especial de Lançamento
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Escolha o Plano Ideal para sua Operação</h2>
          <p className="text-xs sm:text-sm text-slate-400">Preços reduzidos válidos apenas para os primeiros assinantes. Liberação instantânea com 14 dias grátis.</p>
        </div>

        {/* Alterado para grid-cols-1 md:grid-cols-2 lg:grid-cols-4 para caber os 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planos.map((plano) => {
            const isPro = plano.slug === 'pro';
            const gb = Math.round((plano.cota_storage_bytes || 3221225472) / 1073741824);

            const valorAtual = Number(plano.valor_mensal);
            let valorOriginal = "49,90";
            if (plano.slug === 'pro') valorOriginal = "199,00";
            if (plano.slug === 'enterprise') valorOriginal = "299,00"; // Ajustado para refletir a nova ancoragem

            return (
              <div
                key={plano.id}
                className={`rounded-3xl p-6 flex flex-col justify-between border transition relative overflow-hidden ${
                  isPro
                    ? 'bg-slate-900 border-indigo-500 shadow-2xl shadow-indigo-600/15'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="absolute top-5 -right-12 bg-emerald-600 text-white text-[9px] font-extrabold uppercase py-1 px-12 rotate-45 shadow-lg">
                  Lançamento
                </div>

                {isPro && (
                  <span className="absolute top-4 left-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-extrabold uppercase rounded-full">
                    Mais Escolhido
                  </span>
                )}

                <div className={isPro ? "mt-6" : ""}>
                  <h3 className="text-lg font-bold text-white">{plano.nome}</h3>
                  <div className="mt-4 flex flex-col">
                    <span className="text-slate-500 line-through text-sm font-medium">De R$ {valorOriginal}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-emerald-400">
                        R$ {valorAtual.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[10px] text-slate-400">/mês após trial</span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-300">
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> Até {plano.limite_usuarios} usuários</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> Até {plano.limite_empresas} empresa(s)/CNPJ</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> {gb} GB de Cofre (GED)</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> Ordens de Serviço, Vendas, PDV e Financeiro PIX</li>
                    {plano.slug !== 'mei' && (
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> Motor Fiscal SEFAZ (NF-e/NFC-e) + SPED</li>
                    )}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setPlanoSelecionado(plano)}
                  className={`mt-8 w-full py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                    isPro ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  Testar 14 Dias Grátis
                </button>
              </div>
            );
          })}

          {/* O 4º CARD: White Label / Sob Medida */}
          <div className="rounded-3xl p-6 flex flex-col justify-between border bg-slate-900/40 border-slate-800 border-dashed relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
                <Building2 className="h-5 w-5 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-white">Plano Sob Medida</h3>
              <div className="mt-4 flex flex-col">
                <span className="text-slate-400 text-sm font-medium">Preço sob consulta</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-slate-300">
                    White Label
                  </span>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /> Módulos à la carte (Só paga o que usar)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /> Usuários, Filiais e GBs personalizados</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /> Domínio Personalizado (erp.suaempresa.com.br)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /> Suporte dedicado</li>
              </ul>
            </div>

            <a
              href="https://wa.me/5521975280464?text=Olá, tenho interesse no Plano Sob Medida do Scalle ERP."
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-3 rounded-xl font-bold text-xs text-center cursor-pointer transition bg-slate-800 hover:bg-slate-700 text-white"
            >
              Falar com Consultor (WhatsApp)
            </a>
          </div>
        </div>
      </section>

      {/* Modal de Checkout / Provisionamento Self-Service */}
      {planoSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-400">Provisionamento Instantâneo</span>
                <h3 className="text-base font-bold text-white">Criar Conta — {planoSelecionado.nome}</h3>
              </div>
              <button onClick={() => setPlanoSelecionado(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {erro && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {erro}
              </div>
            )}

            <form onSubmit={handleFinalizarCadastro} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">
                  CNPJ ou CPF da Empresa * {buscandoCnpj && <span className="text-indigo-400">(Consultando ReceitaWS...)</span>}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite apenas números"
                  value={form.tenant_documento}
                  onChange={(e) => handleConsultarCnpj(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={form.tenant_razao_social}
                    onChange={(e) => setForm({ ...form, tenant_razao_social: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={form.tenant_nome_fantasia}
                    onChange={(e) => setForm({ ...form, tenant_nome_fantasia: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Seu Nome (Administrador) *</label>
                  <input
                    type="text"
                    required
                    value={form.admin_name}
                    onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={form.admin_telefone}
                    onChange={(e) => setForm({ ...form, admin_telefone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">E-mail Corporativo (Login) *</label>
                  <input
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Senha de Acesso *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-600/30 transition mt-2"
              >
                {loading ? 'Provisionando Ambiente Isolado...' : 'Liberar Meu Acesso Grátis por 14 Dias'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
