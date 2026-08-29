import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Boxes, ShoppingCart, ShoppingBag, Wrench, 
  DollarSign, FileText, Users, LogOut, Menu, X, 
  Building2, ShieldAlert, Factory, FileSpreadsheet,
  Truck, UserCheck, ShieldCheck, Monitor, Kanban
} from 'lucide-react';
import { api } from '../services/api';
import MfaConfigModal from '../components/MfaConfigModal';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaAtivaId, setEmpresaAtivaId] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [modalMfaAberto, setModalMfaAberto] = useState(false);
  const navigate = useNavigate();

  const carregarContexto = async () => {
    try {
      const [resMe, resEmps] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/empresas')
      ]);

      if (resMe.status === 'fulfilled' && resMe.value.data?.data) {
        setUsuario(resMe.value.data.data);
      } else {
        const localUser = localStorage.getItem('scalle_user');
        if (localUser) {
          try { setUsuario(JSON.parse(localUser)); } catch (e) {}
        }
      }

      if (resEmps.status === 'fulfilled' && resEmps.value.data?.data) {
        const emps = Array.isArray(resEmps.value.data.data) ? resEmps.value.data.data : [];
        setEmpresas(emps);
        if (emps.length > 0) {
          setEmpresaAtivaId(emps[0].id);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar contexto inicial do layout:', e);
    }
  };

  useEffect(() => {
    carregarContexto();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('scalle_token');
      localStorage.removeItem('token');
      localStorage.removeItem('scalle_user');
      navigate('/login');
    }
  };

  const handleTrocarEmpresa = async (novaId) => {
    try {
      await api.post('/empresas/trocar-contexto', { empresa_id: novaId });
      setEmpresaAtivaId(novaId);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  // Rotas relativas sob o layout /app
  const menu = [
    ...(usuario?.is_master ? [{ name: 'Painel Master SaaS', path: 'master', icon: ShieldAlert, isMaster: true }] : []),
    { name: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
    { name: 'CRM & Funil', path: 'crm', icon: Kanban },
    { name: 'WMS & Estoque', path: 'wms', icon: Boxes },
    { name: 'Indústria & PCP', path: 'pcp', icon: Factory },
    { name: 'Terminal Chão de Fábrica', path: 'pcp/terminal', icon: Monitor },
    { name: 'Compras & Suprimentos', path: 'compras', icon: ShoppingCart },
    { name: 'Pedidos & Vendas', path: 'vendas', icon: ShoppingBag },
    { name: 'PDV Balcão', path: 'pdv', icon: ShoppingBag },
    { name: 'Ordens de Serviço', path: 'os', icon: Wrench },
    { name: 'Frotas & Ativos', path: 'frotas', icon: Truck },
    { name: 'RH & Ponto REP-P', path: 'rh', icon: UserCheck },
    { name: 'Financeiro', path: 'financeiro', icon: DollarSign },
    { name: 'Exportação Contábil', path: 'exportacoes', icon: FileSpreadsheet },
    { name: 'Motor Fiscal', path: 'fiscal', icon: FileText },
    { name: 'Governança & Equipe', path: 'usuarios', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 font-sans">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg ${
              usuario?.is_master ? 'bg-rose-600 shadow-rose-600/30' : 'bg-indigo-600 shadow-indigo-600/30'
            }`}>
              S
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-wide leading-none">Scalle ERP</span>
              {usuario?.is_master && (
                <span className="text-[9px] font-bold text-rose-400 font-mono tracking-wider mt-0.5">SaaS Owner</span>
              )}
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                  isActive 
                    ? item.isMaster 
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-bold'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : item.isMaster
                      ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-200'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/20">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Context Switcher de Empresa / Filial */}
            {empresas.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
                <select
                  value={empresaAtivaId}
                  onChange={(e) => handleTrocarEmpresa(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm text-white font-medium focus:outline-none cursor-pointer pr-2"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                      {emp.nome_fantasia} {emp.is_matriz ? '(Matriz)' : '(Filial)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de Gestão de 2FA / MFA */}
            <button
              type="button"
              onClick={() => setModalMfaAberto(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                usuario?.mfa_ativo 
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Configuração de Autenticação em 2 Etapas (MFA/2FA)"
            >
              <ShieldCheck className={`h-4 w-4 ${usuario?.mfa_ativo ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden md:inline">{usuario?.mfa_ativo ? '2FA Ativo' : 'Ativar 2FA'}</span>
            </button>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{usuario?.name || 'Operador Conectado'}</div>
              <div className={`text-[11px] font-medium ${usuario?.is_master ? 'text-rose-400 font-bold' : 'text-indigo-400'}`}>
                {usuario?.is_master ? 'SaaS Owner (Global)' : (usuario?.perfil?.nome || 'Operador')}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shadow-inner ${
              usuario?.is_master 
                ? 'bg-rose-600/20 border-rose-500/30 text-rose-400' 
                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
            }`}>
              {usuario?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <Outlet />
        </main>
      </div>

      {/* Modal de Gestão de 2FA / MFA */}
      {modalMfaAberto && (
        <MfaConfigModal
          usuario={usuario}
          onClose={() => setModalMfaAberto(false)}
          onAtualizado={(status) => {
            const updated = { ...usuario, mfa_ativo: status };
            setUsuario(updated);
            localStorage.setItem('scalle_user', JSON.stringify(updated));
          }}
        />
      )}
    </div>
  );
}