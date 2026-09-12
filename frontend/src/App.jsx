import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout Principal com Sidebar
import AppLayout from './layouts/AppLayout';

// Páginas de Autenticação e Públicas
import Login from './pages/Login';
import PortalOsPage from './pages/portal/PortalOsPage';
import LandingCrm from './pages/public/LandingCrm';

// Páginas Operacionais e Corporativas
import DashboardPage from './pages/dashboard/DashboardPage';
import WmsPage from './pages/wms/WmsPage';
import OrdensServicoPage from './pages/os/OrdensServicoPage';
import PcpPage from './pages/pcp/PcpPage';
import TerminalFabricaPage from './pages/pcp/TerminalFabricaPage';
import VendasPage from './pages/vendas/VendasPage';
import PdvPage from './pages/vendas/PdvPage';
import ComprasPage from './pages/compras/ComprasPage';
import CotacoesComprasPage from './pages/compras/CotacoesComprasPage';
import FinanceiroPage from './pages/financeiro/FinanceiroPage';
import ExportacoesPage from './pages/exportacoes/ExportacoesPage';
import FiscalPage from './pages/fiscal/FiscalPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';

// CRM & Funil
import BoardCrm from './pages/crm/BoardCrm';
import ConfiguracoesCrm from './pages/crm/ConfiguracoesCrm';
import CrmKanbanView from './Pages/Crm/CrmKanbanView';

// Gestão Master & Billing
import MasterPage from './pages/master/MasterPage';
import PainelCobrancaView from './pages/billing/PainelCobrancaView';
import AuditoriaE2EView from './pages/master/AuditoriaE2EView';

//RH
import PontoEletronicoPage from './pages/rh/PontoEletronicoPage';
import ColaboradoresPage from './pages/RH/ColaboradoresPage';
import PessoasPage from './pages/Cadastros/PessoasPage';
import HoleritesPage from './pages/RH/HoleritesPage';
import RecrutamentoPage from './pages/RH/RecrutamentoPage';

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
          <Route path="/login" element={<Login />} />
          <Route path="/portal/os/:token" element={<PortalOsPage />} />
          <Route path="/crm" element={<LandingCrm />} />

          {/* Aliases e Redirecionamentos de Segurança */}
          <Route path="/crm/configuracoes" element={<Navigate to="/app/crm/configuracoes" replace />} />
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* Rotas Protegidas sob o Layout Principal (/app) */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* CRM & Vendas */}
            <Route path="crm" element={<BoardCrm />} />
            <Route path="crm/kanban" element={<CrmKanbanView />} />
            <Route path="crm/configuracoes" element={<ConfiguracoesCrm />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="pdv" element={<PdvPage />} />

            {/* Suprimentos & WMS */}
            <Route path="wms" element={<WmsPage />} />
            <Route path="estoque" element={<Navigate to="/app/wms" replace />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="compras/cotacoes" element={<CotacoesComprasPage />} />

            {/* Indústria & PCP */}
            <Route path="pcp" element={<PcpPage />} />
            <Route path="pcp/terminal" element={<TerminalFabricaPage />} />

            {/* Serviços & CMMS */}
            <Route path="os" element={<OrdensServicoPage />} />
            <Route path="ordens-servico" element={<Navigate to="/app/os" replace />} />

            {/* Financeiro, Fiscal & Controladoria */}
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="exportacoes" element={<ExportacoesPage />} />
            <Route path="fiscal" element={<FiscalPage />} />

            {/* Governança, Equipe & Billing */}
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="billing" element={<PainelCobrancaView />} />

            {/*RH & Gestão de Pessoas*/}
            <Route path="ponto" element={<PontoEletronicoPage />} />
            <Route path="colaboradores" element={<ColaboradoresPage />} />
            <Route path="pessoas" element={<PessoasPage />} />
            <Route path="holerites" element={<HoleritesPage />} />
            <Route path="recrutamento" element={<RecrutamentoPage />} />

            {/* Módulo Master (SaaS Owner) */}
            <Route path="master" element={<MasterPage />} />
            <Route path="master/auditoria" element={<AuditoriaE2EView />} />
            <Route path="master/auditoria-e2e" element={<Navigate to="/app/master/auditoria" replace />} />
          </Route>

          {/* Fallback Global */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
