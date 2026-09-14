=========================================================
===========================================================================================================================

📄 **GO-LIVE ROADMAP - SCALLE ERP (V3.1 - FINAL STAGES REMINDER)**
===========================================================================================================================

**⚠️ IMPORTANT DISCLAIMER:** _This roadmap is intended strictly as a memory refresher for the final Go-Live stages. It DOES NOT represent the current active development sprint or the immediate next steps. It is a macro-view of the finish line._

**Goal:** 100% B2B Commercial Readiness and Self-Service SaaS **Architecture:** Multi-Tenant Modular Monolith (Gemini Standard) with RBAC

### 1. CODE X-RAY (WHAT WE ALREADY HAVE 🟢)

The engine is already built and tested in the following areas, respecting the `tenant_id` isolation and UUID shielding:

* **Core & SaaS:** Authentication (Sanctum/TOTP), Subscriptions, Asaas Webhooks, Soft-Lock, and `GlobalScopeTenant` isolation.

* **HR & Payroll (Ponto):** Employee registration, georeferenced time tracking, PDF payslips, and climate evaluation (eNPS).

* **Services (CMMS):** Work Order (OS) lifecycle, SLA, technical reports, and digital signature with hash (MP 2.200-2).

* **WMS & Industry (PCP):** Catalog, multiple warehouses, atomic transfers, stock movement, BOM, and Production Orders (MRP).

* **Commercial & Financial:** Inbound CRM Funnel, quotes, bank accounts, and invoice settlement.

* **Governance:** All dropdown lists are already running dynamically in the `sis_tabelas_dominio` table.

### 2. THE GAP (FINAL STAGES REMINDER 🔴)

Crossing the code with the base document specifications, these are the remaining puzzle pieces to keep on the radar for the future:

1. **Front-End (The Face of the ERP):** The repository has Vite/React configured, but there are no Backoffice or PWA screens developed yet.

2. **Missing Modules:** Fleets/Telemetry, Project Management, and EDMS (Electronic Document Management System - GED).

3. **Full Fiscal Engine:** The A1 certificate controller exists, but the real messaging via SOAP/REST with SEFAZ for issuance, cancellation, and CC-e of NFe/NFCe/NFSe is still missing.

### 3. CHRONOLOGICAL SPRINT TIMELINE (FOR FUTURE REFERENCE)

#### 🚀 Sprint 1: React Front-End and PWA

* **Objective:** Bring the system to life by building the interfaces consuming the ready REST APIs.

* **Steps:**
  
  1. Develop the Administrative Backoffice layout in React/Tailwind.
  
  2. Implement RBAC-based screens (each profile only sees what they have permission to).
  
  3. Create the modular dashboards: Financial Dashboard, CRM Kanban, WMS, and PCP Grids.
  
  4. Configure the Service Worker to transform the technician portal into an **Offline-First PWA** (Work Orders in areas without 4G using `IndexedDB`).

#### 🚀 Sprint 2: Filling the Core Gaps (Fleets, Projects, and EDMS)

* **Objective:** Code the modules described in the specification that do not yet exist in the database.

* **Steps:**
  
  1. **Fleets:** Create isolated controllers and routes for vehicles, drivers, KM/L tracking, and maintenance alerts (oil, tires).
  
  2. **Projects:** Structure task management, team time tracking, and project budgets.
  
  3. **EDMS (GED):** Implement a secure file repository (S3 or local) isolated by tenant for contracts, reports, and financial attachments.
  
  4. _Database Note:_ Use only incremental migrations (`add column` or `create table`) without destructive actions.

#### 🚀 Sprint 3: The Fiscal Engine Trial by Fire (SEFAZ)

* **Objective:** Close the legal billing obligations.

* **Steps:**
  
  1. Replace the "mocked" issuer with real encrypted communication with the State/National Webservices.
  
  2. Homologate authorization, rejection, cancellation, invalidation, and offline contingency flows.
  
  3. Prepare the database structure for _Split Payment_ and tax coexistence (CBS/IBS transition).

#### 🚀 Sprint 4: Multi-Pipeline Refinement and SaaS Onboarding

* **Objective:** Get the system ready for _Self-Service_ sales and closing new clients.

* **Steps:**
  
  1. Ensure that the taxonomies of Multiple Funnels (CRM) and stages are 100% dynamic and parameterizable by tenant.
  
  2. Create automated _Onboarding_ routines (importing client and product spreadsheets via CSV/Excel).
  
  3. E2E review of security ties to prevent any leakage of sequential IDs in responses (total DTO shielding).
