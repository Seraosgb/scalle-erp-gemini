import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Importações com caminhos tolerantes
import WmsPage from './pages/wms/WmsPage';
import OrdensServicoPage from './pages/os/OrdensServicoPage';
import PortalOsPage from './pages/portal/PortalOsPage';

// Componente de Layout Fallback Seguro (caso não exista Layout.jsx separado)
function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Público de OS */}
        <Route path="/portal/os/:token" element={<PortalOsPage />} />

        {/* Redirecionamentos da Raiz */}
        <Route path="/" element={<Navigate to="/app/wms" replace />} />
        <Route path="/wms" element={<Navigate to="/app/wms" replace />} />
        <Route path="/estoque" element={<Navigate to="/app/wms" replace />} />
        <Route path="/os" element={<Navigate to="/app/os" replace />} />

        {/* Rotas Principais sob /app */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="wms" replace />} />
          <Route path="wms" element={<WmsPage />} />
          <Route path="estoque" element={<WmsPage />} />
          <Route path="os" element={<OrdensServicoPage />} />
          <Route path="ordens-servico" element={<OrdensServicoPage />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/app/wms" replace />} />
      </Routes>
    </BrowserRouter>
  );
}