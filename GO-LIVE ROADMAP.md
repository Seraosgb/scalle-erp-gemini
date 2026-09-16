=========================================================
===========================================================================================================================

📄 **GO-LIVE ROADMAP - SCALLE ERP (V3.2 - FISCAL ENGINE ADVANCEMENT)**
===========================================================================================================================

**⚠️ IMPORTANT DISCLAIMER:** _This roadmap is intended strictly as a memory refresher for the final Go-Live stages[cite: 4]. It DOES NOT represent the current active development sprint or the immediate next steps[cite: 4]. It is a macro-view of the finish line[cite: 4]._

**Goal:** 100% B2B Commercial Readiness and Self-Service SaaS[cite: 4] 
**Architecture:** Multi-Tenant Modular Monolith (Gemini Standard) with RBAC[cite: 4]

### 1. CODE X-RAY (WHAT WE ALREADY HAVE 🟢)

The engine is already built and tested in the following areas, respecting the `tenant_id` isolation and UUID shielding[cite: 4]:

* **Core & SaaS:** Authentication (Sanctum/TOTP), Subscriptions, Asaas Webhooks, Soft-Lock, and `GlobalScopeTenant` isolation[cite: 4].
* **HR & Payroll (Ponto):** Employee registration, georeferenced time tracking, PDF payslips, and climate evaluation (eNPS)[cite: 4].
* **Services (CMMS):** Work Order (OS) lifecycle, SLA, technical reports, and digital signature with hash (MP 2.200-2)[cite: 4].
* **WMS & Industry (PCP):** Catalog, multiple warehouses, atomic transfers, stock movement, BOM, and Production Orders (MRP)[cite: 4].
* **Commercial & Financial:** Inbound CRM Funnel, quotes, bank accounts, and invoice settlement[cite: 4].
* **Governance:** All dropdown lists are already running dynamically in the `sis_tabelas_dominio` table[cite: 4].
* **Fiscal Engine (Base):** Upload de certificado A1 com criptografia simétrica (AES-256) no cofre do tenant, geração de XML de NF-e, validação rigorosa de XSD (SEFAZ) e orquestração de transmissão síncrona implementadas e testadas.

### 2. THE GAP (FINAL STAGES REMINDER 🔴)

Crossing the code with the base document specifications, these are the remaining puzzle pieces to keep on the radar for the future[cite: 4]:

1. **Front-End (The Face of the ERP):** The repository has Vite/React configured, but there are no Backoffice or PWA screens developed yet[cite: 4].
2. **Missing Modules:** Fleets/Telemetry, Project Management, and EDMS (Electronic Document Management System - GED)[cite: 4].
3. **Fiscal Engine (Assincronicidade e Eventos):** O motor de comunicação e assinatura existe, mas a mensageria precisa ser migrada para Filas/Jobs (assíncrono) para evitar timeouts. Faltam também as emissões reais de Cancelamento, Inutilização e CC-e, além dos drivers específicos para NFC-e e NFS-e[cite: 4].

### 3. CHRONOLOGICAL SPRINT TIMELINE (FOR FUTURE REFERENCE)

#### 🚀 Sprint 1: React Front-End and PWA

* **Objective:** Bring the system to life by building the interfaces consuming the ready REST APIs[cite: 4].
* **Steps:**
  1. Develop the Administrative Backoffice layout in React/Tailwind[cite: 4].
  2. Implement RBAC-based screens (each profile only sees what they have permission to)[cite: 4].
  3. Create the modular dashboards: Financial Dashboard, CRM Kanban, WMS, and PCP Grids[cite: 4].
  4. Configure the Service Worker to transform the technician portal into an **Offline-First PWA** (Work Orders in areas without 4G using `IndexedDB`)[cite: 4].

#### 🚀 Sprint 2: Filling the Core Gaps (Fleets, Projects, and EDMS)

* **Objective:** Code the modules described in the specification that do not yet exist in the database[cite: 4].
* **Steps:**
  1. **Fleets:** Create isolated controllers and routes for vehicles, drivers, KM/L tracking, and maintenance alerts (oil, tires)[cite: 4].
  2. **Projects:** Structure task management, team time tracking, and project budgets[cite: 4].
  3. **EDMS (GED):** Implement a secure file repository (S3 or local) isolated by tenant for contracts, reports, and financial attachments[cite: 4].
  4. _Database Note:_ Use only incremental migrations (`add column` or `create table`) without destructive actions[cite: 4].

#### 🚀 Sprint 3: The Fiscal Engine Trial by Fire (SEFAZ)

* **Objective:** Close the legal billing obligations[cite: 4].
* **Steps:**
  1. Refatorar a transmissão da NF-e para o formato **Assíncrono** usando Laravel Queues/Jobs, garantindo que o PDV não congele aguardando a SEFAZ.
  2. Homologar a autorização de emissão (cStat 100) utilizando um Certificado A1 e-CNPJ (ICP-Brasil) válido.
  3. Homologate rejection, cancellation, invalidation, and offline contingency flows[cite: 4] (CC-e).
  4. Prepare the database structure for _Split Payment_ and tax coexistence (CBS/IBS transition)[cite: 4].

#### 🚀 Sprint 4: Multi-Pipeline Refinement and SaaS Onboarding

* **Objective:** Get the system ready for _Self-Service_ sales and closing new clients[cite: 4].
* **Steps:**
  1. Ensure that the taxonomies of Multiple Funnels (CRM) and stages are 100% dynamic and parameterizable by tenant[cite: 4].
  2. Create automated _Onboarding_ routines (importing client and product spreadsheets via CSV/Excel)[cite: 4].
  3. E2E review of security ties to prevent any leakage of sequential IDs in responses (total DTO shielding)[cite: 4].
