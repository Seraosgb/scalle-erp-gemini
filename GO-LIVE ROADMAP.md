===========================================================================================================================
📄 **GO-LIVE ROADMAP - SCALLE ERP (V3.5 - PMO ENTERPRISE GAP ADDED)**
===========================================================================================================================
===========================================================================================================================

**⚠️ IMPORTANT DISCLAIMER:** _This roadmap is intended strictly as a memory refresher for the final Go-Live stages. It DOES NOT represent the current active development sprint or the immediate next steps. It is a macro-view of the finish line._

**Goal:** 100% B2B Commercial Readiness and Self-Service SaaS
**Architecture:** Multi-Tenant Modular Monolith (Gemini Standard) with RBAC

### 1. CODE X-RAY (WHAT WE ALREADY HAVE 🟢)

The engine is already built and tested in the following areas, respecting the `tenant_id` isolation and UUID shielding:

* **Core & SaaS:** Authentication (Sanctum/TOTP), Subscriptions, Asaas Webhooks, Soft-Lock, and `GlobalScopeTenant` isolation.
* **HR & Payroll (Ponto):** Employee registration, georeferenced time tracking, PDF payslips, and climate evaluation (eNPS).
* **Services (CMMS):** Work Order (OS) lifecycle, SLA, technical reports, and digital signature with hash (MP 2.200-2).
* **WMS & Industry (PCP):** Catalog, multiple warehouses, atomic transfers, stock movement, BOM, and Production Orders (MRP).
* **Commercial & Financial:** Inbound CRM Funnel, quotes, bank accounts, and invoice settlement.
* **Fleets:** Gestão de veículos, motoristas, e controle atômico de abastecimentos integrado ao financeiro.
* **Governance:** All dropdown lists are already running dynamically in the `sis_tabelas_dominio` table.
* **Fiscal Engine (Async & Base):** Upload de certificado A1 com criptografia simétrica (AES-256) no cofre do tenant. Geração de XML de NF-e e orquestração de transmissão **assíncrona (via Filas/Jobs)** implementadas e testadas. API base para Eventos Fiscais (Cancelamento e CC-e) estruturada e orquestrada. Base de dados preparada para Reforma Tributária (CBS/IBS e Split Payment).
* **Gestão de Projetos (PMO):** Kanban corporativo com reordenação fluida (DnD), Timesheet integrado para apropriação de custos, gestão de budget e milestones de faturamento concluídos.

### 2. THE GAP (FINAL STAGES REMINDER 🔴)

Crossing the code with the base document specifications, these are the remaining puzzle pieces to keep on the radar for the future:

1. **Front-End (The Face of the ERP):** Mapeamento do layout Backoffice em React/Vite já iniciado (Dashboard PMO funcional), mas as telas operacionais restantes e o PWA Offline-First precisam ser consolidados.
2. **Missing Core Modules:** Apenas o **EDMS (Electronic Document Management System - GED)** para upload isolado e seguro de arquivos.
3. **PMO Enterprise Features (Evolução Pós-MVP):** Implementar Dependências lógicas (Blockers) entre tarefas, Checklists (subtarefas) internas nos cards, Visão de Gantt/Cronogramas, Gestão de Capacidade (Resource Planning) e Taxonomia Dinâmica de prioridades.
4. **Integração Cross-Module:** Plugar o faturamento de Entregáveis do PMO ao Motor Fiscal, apropriação de custos no Contas a Pagar e anexo de arquivos nos cards da equipe (requer o módulo GED concluído).
5. **Fiscal Engine (Homologação Real):** Homologar a autorização de emissão (cStat 100) na SEFAZ utilizando um Certificado A1 e-CNPJ válido.

### 3. CHRONOLOGICAL SPRINT TIMELINE (FOR FUTURE REFERENCE)

#### 🚀 Sprint 1: React Front-End and PWA (In Progress)

* **Objective:** Bring the system to life by building the interfaces consuming the ready REST APIs.
* **Steps:**
  1. Develop the Administrative Backoffice layout in React/Tailwind. *(EM ANDAMENTO)*
  2. Implement RBAC-based screens (each profile only sees what they have permission to).
  3. Create the modular dashboards: Financial Dashboard, CRM Kanban, WMS, and PCP Grids. *(PMO CONCLUÍDO)*
  4. Configure the Service Worker to transform the technician portal into an **Offline-First PWA** (Work Orders in areas without 4G using `IndexedDB`).

#### 🚀 Sprint 2: Filling the Core Gaps (Projects and EDMS)

* **Objective:** Code the modules described in the specification that do not yet exist in the database.
* **Steps:**
  1. ~~**Projects:** Structure task management, team time tracking, and project budgets com visão Kanban.~~ *(CONCLUÍDO)*
  2. **EDMS (GED):** Implement a secure file repository (S3 ou disco local via Storage Facade) isolated by tenant for contracts, reports, and financial attachments.
  3. **PMO Enterprise:** Desenvolver lógicas de Blockers, Checklists, Gantt e amarrar os anexos do GED diretamente nos cards de tarefas.
  4. _Database Note:_ Use only incremental migrations (`add column` or `create table`) without destructive actions.

#### 🚀 Sprint 3: The Fiscal Engine Trial by Fire (SEFAZ)

* **Objective:** Close the legal billing obligations.
* **Steps:**
  1. ~~Refatorar a transmissão da NF-e para o formato **Assíncrono** usando Laravel Queues/Jobs.~~ *(CONCLUÍDO)*
  2. ~~Preparar a estrutura do banco de dados para Split Payment e coexistência tributária (CBS/IBS).~~ *(CONCLUÍDO)*
  3. Homologar a autorização de emissão (cStat 100) utilizando um Certificado A1 e-CNPJ (ICP-Brasil) válido na Hostoo.
  4. Homologar os fluxos reais de rejeição, cancelamento, inutilização e CC-e com a SEFAZ.
  5. Plugar a emissão automática no gatilho de "Gerar Fatura" do Kanban de Projetos.

#### 🚀 Sprint 4: Multi-Pipeline Refinement and SaaS Onboarding

* **Objective:** Get the system ready for _Self-Service_ sales and closing new clients.
* **Steps:**
  1. Ensure that the taxonomies of Multiple Funnels (CRM) and stages are 100% dynamic and parameterizable by tenant.
  2. Create automated _Onboarding_ routines (importing client and product spreadsheets via CSV/Excel).
  3. E2E review of security ties to prevent any leakage of sequential IDs in responses (total DTO shielding).
