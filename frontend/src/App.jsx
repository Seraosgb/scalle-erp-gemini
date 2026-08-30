import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout Principal com Sidebar
import AppLayout from './layouts/AppLayout';

// Páginas
import Login from './pages/Login';
import DashboardPage from './pages/dashboard/DashboardPage';
import WmsPage from './pages/wms/WmsPage';
import OrdensServicoPage from './pages/os/OrdensServicoPage';
import PortalOsPage from './pages/portal/PortalOsPage';
import PcpPage from './pages/pcp/PcpPage';
import VendasPage from './pages/vendas/VendasPage';
import PdvPage from './pages/vendas/PdvPage';
import ComprasPage from './pages/compras/ComprasPage';
import CotacoesComprasPage from './pages/compras/CotacoesComprasPage';
import FinanceiroPage from './pages/financeiro/FinanceiroPage';
import ExportacoesPage from './pages/exportacoes/ExportacoesPage';
import FiscalPage from './pages/fiscal/FiscalPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import MasterPage from './pages/master/MasterPage';
import TerminalFabricaPage from './pages/pcp/TerminalFabricaPage';
import BoardCrm from './Pages/Crm/BoardCrm';
import ConfiguracoesCrm from './pages/Crm/ConfiguracoesCrm';
import LandingCrm from './pages/public/LandingCrm';

// Instância global do React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/portal/os/:token" element={<PortalOsPage />} />
          <Route path="/crm" element={<LandingCrm />} />

          {/* Redirecionamento da raiz pura */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* Rotas Protegidas sob o Layout /app */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="crm" element={<BoardCrm />} />
            <Route path="crm/configuracoes" element={<ConfiguracoesCrm />} />
            <Route path="wms" element={<WmsPage />} />
            <Route path="estoque" element={<WmsPage />} />
            <Route path="pcp" element={<PcpPage />} />
            <Route path="pcp/terminal" element={<TerminalFabricaPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="compras/cotacoes" element={<CotacoesComprasPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="os" element={<OrdensServicoPage />} />
            <Route path="ordens-servico" element={<OrdensServicoPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="exportacoes" element={<ExportacoesPage />} />
            <Route path="fiscal" element={<FiscalPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="master" element={<MasterPage />} />
          </Route>

          {/* Fallback de Segurança */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}