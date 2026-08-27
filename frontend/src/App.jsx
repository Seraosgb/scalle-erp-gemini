import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importação do Layout com Sidebar e Topbar
import AppLayout from './layouts/AppLayout';

// Páginas
import WmsPage from './pages/wms/WmsPage';
import OrdensServicoPage from './pages/os/OrdensServicoPage';
import PortalOsPage from './pages/portal/PortalOsPage';
import PcpPage from './pages/pcp/PcpPage';
import VendasPage from './pages/vendas/VendasPage';
import PdvPage from './pages/vendas/PdvPage';

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
        <Route path="/pcp" element={<Navigate to="/app/pcp" replace />} />
        <Route path="/vendas" element={<Navigate to="/app/vendas" replace />} />
        <Route path="/pdv" element={<Navigate to="/app/pdv" replace />} />

        {/* Rotas Principais com Sidebar (Layout) */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="wms" replace />} />
          <Route path="wms" element={<WmsPage />} />
          <Route path="estoque" element={<WmsPage />} />
          <Route path="os" element={<OrdensServicoPage />} />
          <Route path="ordens-servico" element={<OrdensServicoPage />} />
          <Route path="pcp" element={<PcpPage />} />
          <Route path="vendas" element={<VendasPage />} />
          <Route path="pdv" element={<PdvPage />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/app/wms" replace />} />
      </Routes>
    </BrowserRouter>
  );
}