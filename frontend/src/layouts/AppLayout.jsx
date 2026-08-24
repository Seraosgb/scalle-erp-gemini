import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
  LayoutDashboard,
  Boxes, 
  ShoppingCart, 
  Wrench, 
  DollarSign, 
  FileText, 
  LogOut, 
  Layers,
  Menu,
  X
} from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const menu = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'WMS & Estoque', path: '/wms', icon: Boxes },
    { name: 'Compras & Suprimentos', path: '/compras', icon: ShoppingCart },
    { name: 'PDV Balcão', path: '/pdv', icon: ShoppingCart },
    { name: 'Ordens de Serviço', path: '/os', icon: Wrench },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { name: 'Motor Fiscal', path: '/fiscal', icon: FileText },
    { name: 'Governança & Equipe', path: '/configuracoes', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      {/* Header Mobile / Tablet */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">Scalle ERP</span>
            <span className="text-[10px] font-mono text-indigo-400 block -mt-1">Enterprise</span>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
          aria-label="Abrir menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Backdrop Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Responsiva com Drawer Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900/95 lg:bg-slate-900/60 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="p-6 hidden lg:flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight leading-tight">Scalle ERP</h2>
              <span className="text-xs text-indigo-400 font-mono">v2.0.0 Enterprise</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Operador'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Encerrar Sessão"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area com padding adaptativo */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}