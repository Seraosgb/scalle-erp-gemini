import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldAlert, Users, Building2, CreditCard, Activity, CheckCircle2, Search, X, Plus, Save } from 'lucide-react';

// Lista mestra de todos os módulos disponíveis na arquitetura
const MODULOS_SISTEMA = [
  { id: 'os', nome: 'Ordens de Serviço (CMMS)' },
  { id: 'pdv', nome: 'Frente de Caixa (PDV)' },
  { id: 'vendas', nome: 'Vendas e Orçamentos' },
  { id: 'compras', nome: 'Compras e Cotações' },
  { id: 'wms', nome: 'Estoque e Logística (WMS)' },
  { id: 'financeiro', nome: 'Financeiro e DRE' },
  { id: 'fiscal', nome: 'Motor Fiscal (NF-e/NFC-e)' },
  { id: 'frota', nome: 'Gestão de Frotas' },
  { id: 'rh', nome: 'RH, DP e Ponto (REP-P)' },
  { id: 'crm', nome: 'CRM e Funil Comercial' },
  { id: 'pcp', nome: 'Indústria e PCP (MRP)' },
  { id: 'pmo', nome: 'Projetos e PMO' },
  { id: 'ged', nome: 'Cofre Digital (GED)' },
];

export default function MasterPage() {
  const [metricas, setMetricas] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('TENANTS'); // TENANTS, PLANOS

  // Modal Planos
  const [modalPlano, setModalPlano] = useState(false);
  const [formPlano, setFormPlano] = useState(getBlankPlanoForm());

  function getBlankPlanoForm() {
    return { id: null, nome: '', valor_mensal: 0, limite_usuarios: 5, limite_empresas: 1, cota_storage_gb: 5, modulos_habilitados: [] };
  }

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resMetricas, resTenants, resPlanos] = await Promise.all([
        api.get('/master/metricas'),
        api.get('/master/tenants', { params: { search } }),
        api.get('/master/planos')
      ]);
      setMetricas(resMetricas.data?.data);
      setTenants(resTenants.data?.data?.tenants?.data || resTenants.data?.data?.tenants || []);
      setPlanos(resPlanos.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(carregarDados, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const alterarStatusTenant = async (id, novoStatus) => {
    try {
      await api.put(`/master/tenants/${id}/status`, { status: novoStatus });
      carregarDados();
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Erro ao alterar status.');
    }
  };

  const handleSalvarPlano = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formPlano.nome,
        valor_mensal: formPlano.valor_mensal,
        limite_usuarios: formPlano.limite_usuarios,
        limite_empresas: formPlano.limite_empresas,
        cota_storage_bytes: formPlano.cota_storage_gb * 1073741824, // Converte GB para Bytes
        modulos_habilitados: formPlano.modulos_habilitados.includes('*') ? ['*'] : formPlano.modulos_habilitados,
      };

      if (formPlano.id) {
        await api.put(`/master/planos/${formPlano.id}`, payload);
      } else {
        await api.post('/master/planos', payload);
      }
      setModalPlano(false);
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erro ao salvar plano.');
    }
  };

  const toggleStatusPlano = async (id) => {
    try {
      await api.put(`/master/planos/${id}/toggle`);
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirEdicaoPlano = (p) => {
    setFormPlano({
      id: p.id,
      nome: p.nome,
      valor_mensal: p.valor_mensal,
      limite_usuarios: p.limite_usuarios,
      limite_empresas: p.limite_empresas,
      cota_storage_gb: Math.round(p.cota_storage_bytes / 1073741824),
      modulos_habilitados: p.modulos_habilitados || []
    });
    setModalPlano(true);
  };

  const toggleModulo = (modId) => {
    let mods = [...formPlano.modulos_habilitados];
    if (mods.includes(modId)) {
      mods = mods.filter(m => m !== modId);
    } else {
      mods.push(modId);
    }
    // Remove o '*' se o usuário estiver selecionando manualmente
    if (modId !== '*') {
      mods = mods.filter(m => m !== '*');
    }
    setFormPlano({ ...formPlano, modulos_habilitados: mods });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-rose-900/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-rose-500 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Painel Master SaaS (Owner)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gestão global de contas contratantes, planos, provisionamento e governança</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Total de Tenants</div>
          <div className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" /> {metricas?.total_tenants || 0}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-emerald-400 text-xs font-semibold uppercase mb-1">Tenants Ativos</div>
          <div className="text-3xl font-extrabold text-emerald-400 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" /> {metricas?.tenants_ativos || 0}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-indigo-400 text-xs font-semibold uppercase mb-1">Usuários na Plataforma</div>
          <div className="text-3xl font-extrabold text-indigo-400 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" /> {metricas?.total_usuarios || 0}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-amber-400 text-xs font-semibold uppercase mb-1">Assinaturas Ativas</div>
          <div className="text-3xl font-extrabold text-amber-400 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" /> {metricas?.total_assinaturas || 0}
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-slate-800 pt-4">
        <button
          onClick={() => setAbaAtiva('TENANTS')}
          className={`px-6 py-2.5 text-sm font-bold border-b-2 transition ${abaAtiva === 'TENANTS' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Carteira de Clientes (Tenants)
        </button>
        <button
          onClick={() => setAbaAtiva('PLANOS')}
          className={`px-6 py-2.5 text-sm font-bold border-b-2 transition ${abaAtiva === 'PLANOS' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Pacotes & Planos (Builder)
        </button>
      </div>

      {/* ABA: TENANTS */}
      {abaAtiva === 'TENANTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por Empresa, CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] sm:text-xs">
                <tr>
                  <th className="px-6 py-4">Contratante / Tenant</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4 text-center">Filiais</th>
                  <th className="px-6 py-4 text-center">Usuários</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-500">Carregando carteira de tenants...</td></tr>
                ) : tenants.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhum tenant localizado.</td></tr>
                ) : (
                  tenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{t.nome_fantasia}</div>
                        <div className="text-[10px] text-slate-500">{t.id}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{t.documento}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-300">{t.empresas?.length || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-300">{t.users?.length || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'ativo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.status === 'trial' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={t.status}
                          onChange={(e) => alterarStatusTenant(t.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-white px-2 py-1.5 focus:border-rose-500 cursor-pointer"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="trial">Trial</option>
                          <option value="soft_lock">Soft-Lock (Bloqueio Fina.)</option>
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
      )}

      {/* ABA: PLANOS (BUILDER COMERCIAL) */}
      {abaAtiva === 'PLANOS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
             <div className="text-sm text-slate-400">Monte pacotes sob medida ou altere regras globais.</div>
             <button
               onClick={() => { setFormPlano(getBlankPlanoForm()); setModalPlano(true); }}
               className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
             >
               <Plus className="h-4 w-4" /> Criar Plano
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {planos.map(plano => (
              <div key={plano.id} className={`border rounded-2xl p-5 relative transition ${plano.is_ativo ? 'bg-slate-950 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{plano.nome}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Slug: {plano.slug}</p>
                  </div>
                  <button onClick={() => toggleStatusPlano(plano.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                    {plano.is_ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                <div className="text-2xl font-extrabold text-emerald-400 mb-4">
                  R$ {Number(plano.valor_mensal).toFixed(2).replace('.', ',')}
                </div>

                <ul className="text-xs text-slate-400 space-y-2 mb-6">
                  <li className="flex justify-between border-b border-slate-800 pb-1"><span>Usuários Max:</span> <span className="font-bold text-white">{plano.limite_usuarios}</span></li>
                  <li className="flex justify-between border-b border-slate-800 pb-1"><span>Filiais (CNPJs):</span> <span className="font-bold text-white">{plano.limite_empresas}</span></li>
                  <li className="flex justify-between border-b border-slate-800 pb-1"><span>Storage (GED):</span> <span className="font-bold text-white">{Math.round(plano.cota_storage_bytes / 1073741824)} GB</span></li>
                  <li className="pt-2 text-[10px]">
                    <span className="font-bold text-indigo-400 block mb-1">Módulos:</span>
                    {plano.modulos_habilitados?.includes('*') ? 'Todos (Full Access)' : plano.modulos_habilitados?.join(', ')}
                  </li>
                </ul>

                <button onClick={() => abrirEdicaoPlano(plano)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer">
                  Editar Pacote
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Plano */}
      {modalPlano && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-rose-500" /> {formPlano.id ? 'Editar Plano' : 'Montar Novo Plano'}
              </h2>
              <button onClick={() => setModalPlano(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSalvarPlano} className="p-6 space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nome do Plano (Ex: Transportadora VIP) *</label>
                  <input type="text" required value={formPlano.nome} onChange={(e) => setFormPlano({ ...formPlano, nome: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Mensalidade (R$) *</label>
                  <input type="number" step="0.01" required value={formPlano.valor_mensal} onChange={(e) => setFormPlano({ ...formPlano, valor_mensal: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 font-bold focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Limite de Usuários *</label>
                  <input type="number" min="1" required value={formPlano.limite_usuarios} onChange={(e) => setFormPlano({ ...formPlano, limite_usuarios: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Limite de Filiais/CNPJs *</label>
                  <input type="number" min="1" required value={formPlano.limite_empresas} onChange={(e) => setFormPlano({ ...formPlano, limite_empresas: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Espaço Cofre (GED) em GB *</label>
                  <input type="number" min="1" required value={formPlano.cota_storage_gb} onChange={(e) => setFormPlano({ ...formPlano, cota_storage_gb: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-rose-500" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 mb-3 flex justify-between items-center">
                  <span>Liberação de Módulos (Feature Flags)</span>
                  <button type="button" onClick={() => setFormPlano({...formPlano, modulos_habilitados: ['*']})} className="text-indigo-400 hover:text-indigo-300 text-[10px] cursor-pointer bg-indigo-950/50 px-2 py-1 rounded">Marcar Todos (*)</button>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MODULOS_SISTEMA.map(mod => {
                    const isChecked = formPlano.modulos_habilitados.includes('*') || formPlano.modulos_habilitados.includes(mod.id);
                    return (
                      <label key={mod.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-950 border border-transparent hover:border-slate-800 transition">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModulo(mod.id)}
                          className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-xs">{mod.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalPlano(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition cursor-pointer">Cancelar</button>
                <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-white font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer">
                  <Save className="h-4 w-4" /> Salvar Pacote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
