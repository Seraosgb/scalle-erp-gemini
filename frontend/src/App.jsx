import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import WmsPage from './pages/wms/WmsPage';
import PdvPage from './pages/pdv/PdvPage';
import FinanceiroPage from './pages/financeiro/FinanceiroPage';
import FiscalPage from './pages/fiscal/FiscalPage';
import ComprasPage from './pages/compras/ComprasPage';
import UsuariosEmpresasPage from './pages/configuracoes/UsuariosEmpresasPage';
import VendasPage from './pages/vendas/VendasPage';
import MasterDashboardPage from './pages/master/MasterDashboardPage';
import OrdensServicoPage from './pages/os/OrdensServicoPage';
import PortalOsPage from './pages/portal/PortalOsPage';
import EstoquePage from './pages/estoque/EstoquePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated, token } = useAuthStore();
  
  const storedToken = localStorage.getItem('token') 
                   || localStorage.getItem('scalle_token') 
                   || localStorage.getItem('auth_token');

  const authStorage = localStorage.getItem('auth-storage');
  let hasPersistedToken = false;
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      hasPersistedToken = !!(parsed?.state?.token || parsed?.state?.isAuthenticated);
    } catch (e) {}
  }

  const isAuthed = isAuthenticated || !!token || !!storedToken || hasPersistedToken;

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/portal/os/:token" element={<PortalOsPage />} />
          <Route path="/app/portal/os/:token" element={<PortalOsPage />} />
          
          {/* Rotas Privadas Raiz */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="estoque" element={<EstoquePage />} />
<Route path="wms" element={<EstoquePage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="os" element={<OrdensServicoPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="fiscal" element={<FiscalPage />} />
            <Route path="configuracoes" element={<UsuariosEmpresasPage />} />
            <Route path="master" element={<MasterDashboardPage />} />
          </Route>

          {/* Rotas Privadas sob prefixo /app */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="wms" element={<WmsPage />} />
            <Route path="/estoque" element={<WmsPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="os" element={<OrdensServicoPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="fiscal" element={<FiscalPage />} />
            <Route path="configuracoes" element={<UsuariosEmpresasPage />} />
            <Route path="master" element={<MasterDashboardPage />} />
          </Route>

          {/* Fallback Global */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}