import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import WmsPage from './pages/wms/WmsPage';
import PdvPage from './pages/pdv/PdvPage';
import OsPage from './pages/os/OsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/wms" replace />} />
            <Route path="wms" element={<WmsPage />} />
            <Route path="pdv" element={<PdvPage />} />
            <Route path="os" element={<OsPage />} />
            <Route path="financeiro" element={<div className="text-xl font-bold">Módulo Financeiro</div>} />
            <Route path="fiscal" element={<div className="text-xl font-bold">Módulo Fiscal</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}