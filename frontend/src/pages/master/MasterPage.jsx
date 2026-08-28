import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShieldAlert, Building2, Users, CreditCard, Plus, Search, 
  RefreshCw, CheckCircle2, AlertTriangle, X, Lock, Power
} from 'lucide-react';

export default function MasterDashboardPage() {
  const [metricas, setMetricas] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalNovoTenant, setModalNovoTenant] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [form, setForm] = useState({
    tenant_nome_fantasia: '',
    tenant_razao_social: '',
    tenant_documento: '',
    plano_slug: 'pro',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_telefone: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resMetricas, resTenants] = await Promise.all([
        api.get('/master/metricas'),
        api.get('/master/tenants', { params: { search } })
      ]);
      setMetricas(resMetricas.data.data);
      setTenants(resTenants.data.data.tenants?.data || resTenants.data.data.tenants || []);
      setPlanos(resTenants.data.data.planos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search]);

  const handleSalvarTenant = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/master/tenants', form);
      setModalNovoTenant(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setForm({
        tenant_nome_fantasia: '',
        tenant_razao_social: '',
        tenant_documento: '',
        plano_slug: 'pro',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_telefone: '',
      });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || err.response?.data?.message || 'Falha ao provisionar tenant.' });
    }
  };

  const handleAlterarStatus = async (tenantId, novoStatus) => {
    try {
      const res = await api.put(`/master/tenants/${tenantId}/status`, { status: novoStatus });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao alterar status.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Master */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-950 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-rose-500" />
            Painel Master SaaS (Owner)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gestão global de contas contratantes, planos, provisionamento e governança
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalNovoTenant(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition"
        >
          <Plus className="h-4 w-4" /> Provisionar Novo Tenant
        </button>
      </div>

      {/* Cards de Métricas */}
      {metricas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Total de Tenants</span>
            <div className="text-2xl font-black text-white font-mono mt-1">{metricas.total_tenants}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-emerald-400">Tenants Ativos</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{metricas.tenants_ativos}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-indigo-400">Usuários na Plataforma</span>
            <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{metricas.total_usuarios}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-amber-400">Assinaturas Ativas</span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{metricas.total_assinaturas}</div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Busca e Tabela */}
      <div className="space-y-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Empresa, CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">CONTRATANTE / TENANT</th>
                <th className="py-3 px-4">DOCUMENTO</th>
                <th className="py-3 px-4">FILIAIS</th>
                <th className="py-3 px-4">USUÁRIOS</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 font-sans">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-rose-500" />
                    Carregando contas SaaS...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 font-sans">
                    Nenhum tenant cadastrado.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition font-sans">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs sm:text-sm">{t.nome_fantasia}</div>
                      <span className="text-[11px] text-slate-500">{t.razao_social}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{t.documento}</td>
                    <td className="py-3 px-4 font-mono">{t.empresas?.length || 1}</td>
                    <td className="py-3 px-4 font-mono">{t.users?.length || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'ativo' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        t.status === 'soft_lock' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={t.status}
                        onChange={(e) => handleAlterarStatus(t.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 px-2 py-1 rounded-lg focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="soft_lock">Soft-Lock</option>
                        <option value="suspenso">Suspenso</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Provisionar Tenant */}
      {modalNovoTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-rose-400" />
                Provisionar Novo Tenant & Superadmin
              </h2>
              <button type="button" onClick={() => setModalNovoTenant(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarTenant} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="space-y-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block border-b border-slate-800 pb-1">1. Dados da Empresa / Tenant</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Fantasia *</label>
                    <input type="text" required value={form.tenant_nome_fantasia} onChange={(e) => setForm({ ...form, tenant_nome_fantasia: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Razão Social *</label>
                    <input type="text" required value={form.tenant_razao_social} onChange={(e) => setForm({ ...form, tenant_razao_social: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">CNPJ / CPF *</label>
                    <input type="text" required value={form.tenant_documento} onChange={(e) => setForm({ ...form, tenant_documento: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Plano SaaS *</label>
                    <select value={form.plano_slug} onChange={(e) => setForm({ ...form, plano_slug: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                      {planos.map(p => (
                        <option key={p.slug} value={p.slug}>{p.nome} — R$ {parseFloat(p.valor_mensal).toFixed(2)}/mês</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block border-b border-slate-800 pb-1">2. Superadmin do Tenant</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Gestor *</label>
                    <input type="text" required value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail de Login *</label>
                    <input type="email" required value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Senha Inicial de Acesso *</label>
                    <input type="password" required value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoTenant(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer">Provisionar Ecossistema</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}