import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  Wrench, 
  DollarSign, 
  FileText, 
  Users, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { api } from '../services/api';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('scalle_token');
      localStorage.removeItem('scalle_user');
      navigate('/login');
    }
  };

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
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              S
            </div>
            <span className="font-bold text-lg text-white tracking-wide">Scalle ERP</span>
          </div>
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
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
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
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
        {/* Topbar Mobile */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md lg:hidden shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-base text-white">Scalle ERP</span>
          <div className="w-6" />
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}