import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import WmsPage from './pages/wms/WmsPage';
import PdvPage from './pages/pdv/PdvPage';
import OsPage from './pages/os/OsPage';
import FinanceiroPage from './pages/financeiro/FinanceiroPage';
import FiscalPage from './pages/fiscal/FiscalPage';
import PortalClientePage from './pages/portal/PortalClientePage';
import ComprasPage from './pages/compras/ComprasPage';
import UsuariosEmpresasPage from './pages/configuracoes/UsuariosEmpresasPage';
import VendasPage from './pages/vendas/VendasPage';
import MasterDashboardPage from './pages/master/MasterDashboardPage';

// Instância estável do QueryClient fora do ciclo de render
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
  
  // Validação híbrida (Zustand State + LocalStorage) para evitar falso negativo na montagem
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
          <Route path="/portal/os/:token" element={<PortalClientePage />} />
          
          {/* Rotas Privadas */}
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
            <Route path="wms" element={<WmsPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="os" element={<OsPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="fiscal" element={<FiscalPage />} />
            <Route path="configuracoes" element={<UsuariosEmpresasPage />} />
            // Na rota protegida:
<Route path="master" element={<MasterDashboardPage />} />
          </Route>

          {/* Rota Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}