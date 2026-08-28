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
import ExportacoesPage from './pages/exportacoes/ExportacoesPage';

// Instância global do React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<Login />} />

          {/* Portal Público de OS */}
          <Route path="/portal/os/:token" element={<PortalOsPage />} />

          {/* Redirecionamentos da Raiz para o Dashboard */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/wms" element={<Navigate to="/app/wms" replace />} />
          <Route path="/estoque" element={<Navigate to="/app/wms" replace />} />
          <Route path="/os" element={<Navigate to="/app/os" replace />} />
          <Route path="/pcp" element={<Navigate to="/app/pcp" replace />} />
          <Route path="/vendas" element={<Navigate to="/app/vendas" replace />} />
          <Route path="/pdv" element={<Navigate to="/app/pdv" replace />} />

          {/* Rotas Protegidas sob o Layout /app */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="wms" element={<WmsPage />} />
            <Route path="estoque" element={<WmsPage />} />
            <Route path="os" element={<OrdensServicoPage />} />
            <Route path="ordens-servico" element={<OrdensServicoPage />} />
            <Route path="pcp" element={<PcpPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="/app/exportacoes" element={<ExportacoesPage />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}