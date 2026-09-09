# MASTER FUNCTIONAL AND TECHNICAL SPECIFICATION — SCALLE ERP

## From requirement to implementation, homologation, and commercial operation

**Version:** 1.0  
**Base:** Master Project Document — Scalle ERP  
**Initial State:** 0%  
**Objective:** Enable a product, UX, architecture, backend, frontend, QA, DevOps, and deployment team to build Scalle ERP without relying on implicit interpretations.

---

# 1. HOW THIS DOCUMENT SHOULD BE USED

This document transforms the Master Document into a construction specification.

The chosen order prioritizes dependencies:

1. Governance and architecture;
2. Core and multi-tenant;
3. Identity, users, and permissions;
4. Master registries;
5. Configuration and workflow engine;
6. Commercial/CRM;
7. Purchasing;
8. Inventory/WMS;
9. Financial;
10. Fiscal;
11. Services/Work Orders (OS);
12. Industrial/PCP/MRP;
13. Fleets;
14. Assets;
15. Projects;
16. HR/Payroll (DP);
17. Document Management (GED);
18. Portal;
19. BI;
20. APIs/integrations;
21. SaaS/Billing;
22. Security/LGPD;
23. Infrastructure/DevOps;
24. QA;
25. Deployment/support;
26. PWA/Offline/Real-time/AI.

**Rule:** No implementation shall be considered final without requirements, rules, permissions, integration, testing, and acceptance criteria.

---

# 2. MANDATORY SPECIFICATION STANDARD

Each module must be described by:

- Objective;
- Scope;
- Actors;
- Permissions;
- Entities;
- Fields;
- Screens;
- Actions;
- Flows;
- Business rules;
- States;
- Validations;
- Integrations;
- Events;
- APIs;
- Reports;
- Audit;
- Security;
- Tests;
- Acceptance criteria;
- Dependencies;
- Completion criteria.
- Guideline that all taxonomy, flow nomenclature, dropdown lists, and process stages must be dynamic and parameterizable per tenant, avoiding hardcoded static terms in the codebase.

---

# 3. FOUNDATION — CORE AND MULTI-TENANT

## 3.1 Objective

Create the foundation upon which all modules will operate.

## 3.2 Minimum Entities

- EnterpriseGroup (GrupoEmpresarial)
- Tenant
- Company (Empresa)
- Branch (Filial)
- Establishment (Estabelecimento)
- User (Usuario)
- Profile (Perfil)
- Permission (Permissao)
- Session (Sessao)
- FeatureFlag
- Configuration (Configuracao)
- Audit (Auditoria)
- File (Arquivo)
- Notification (Notificacao)
- Job
- Webhook
- Integration (Integracao)

## 3.3 Requirements

### CORE-001 — Tenant

All operational data must belong to a tenant when the domain requires isolation.

### CORE-002 — Isolation

Every query must respect the authenticated tenant.

### CORE-003 — Cross-Isolation

A user from one tenant must not query, alter, delete, or infer data from another tenant.

### CORE-004 — Enterprise Group

A group may contain multiple companies/tenants according to the defined model.

### CORE-005 — Branches

A company may have multiple branches/establishments.

### CORE-006 — Feature Flags

Features may be activated/deactivated per tenant and plan.

### CORE-007 — Audit

Critical operations must record user, tenant, date/time, operation, entity, and context.

### CORE-008 — Idempotency

Financial, fiscal, and critical integration operations must have an idempotent mechanism when applicable.

## 3.4 Acceptance Criteria

Do not consider the Core complete until automated tests prove isolation, authorization, auditing, and correct behavior across multiple tenants.

---

# 4. IDENTITY, USERS, AND PERMISSIONS

## 4.1 Objective

Control who can access the system and what each person can do.

## 4.2 Screens

- Login;
- password recovery;
- first access;
- password change;
- MFA;
- user profile;
- users;
- profiles;
- permissions;
- sessions;
- devices;
- audit.

## 4.3 Permissions

Authorization must allow control by:

- module;
- resource;
- action;
- tenant;
- company;
- branch;
- operational context when applicable.

Minimum actions:

- view;
- create;
- edit;
- delete;
- approve;
- cancel;
- export;
- print;
- administer.

## 4.4 Security

- strong password;
- session expiration/revocation;
- MFA/2FA;
- TOTP;
- attempt throttling;
- secure recovery;
- audit.

---

# 5. MASTER REGISTRIES

## 5.1 Persons (Pessoas)

### Screen

List + search + filters + registration + details + history.

### Base Fields

- type;
- name/legal name;
- document (CPF/CNPJ);
- contacts;
- address;
- fiscal data;
- status;
- observations;
- relationships.

### Rules

- documents must be validated when applicable;
- duplicates must be controlled;
- history must preserve relevant changes.

## 5.2 Products

### Base Fields

- code;
- name;
- description;
- type;
- unit;
- category;
- group;
- brand;
- model;
- NCM/taxation when applicable;
- cost;
- price;
- minimum stock;
- maximum stock;
- lot;
- serial number;
- expiration date;
- active/inactive.

## 5.3 Services

- code;
- name;
- description;
- unit;
- price;
- cost;
- taxation;
- standard SLA;
- category;
- active/inactive.

## 5.4 Acceptance Criteria

Master registries must function as the single source of truth for dependent modules.

---

# 6. CONFIGURATIONS AND RULE ENGINE

A central layer must exist for:

- tenant parameters;
- company parameters;
- branch parameters;
- numbering series;
- numberings;
- payment conditions;
- discount rules;
- approval thresholds (alçadas);
- limits;
- feature flags;
- templates;
- notifications.

## Approval Engine (Motor de Alçadas)

Must allow:

- condition;
- limit;
- approver;
- sequence;
- approval/rejection;
- justification;
- audit.

---

# 7. CRM AND COMMERCIAL

## 7.1 Entities

- Lead;
- Opportunity;
- Customer;
- Contact;
- Activity;
- Proposal;
- Quote (Orçamento);
- Sales Order (Pedido);
- Contract;
- PriceTable;
- Commission.

## 7.2 Screens

- commercial dashboard;
- leads;
- funnel;
- opportunities;
- customers;
- proposals;
- quotes;
- orders;
- contracts;
- price tables;
- commissions.

## 7.3 Main Flow

Lead → Qualification → Opportunity → Proposal/Quote → Approval → Order → Sale → Financial/Fiscal.

## 7.4 Rules

- discounts above limit require approval;
- sales must respect availability or reservation rules;
- approved orders may generate financial records;
- fiscal documents must be issued according to fiscal configuration;
- conversions must maintain history.

## 7.5 Acceptance Criteria

An authorized user must be able to execute the complete cycle from opportunity to order, with proper integration to subsequent modules.

---

# 8. PURCHASING AND SUPPLIES

## Entities

- PurchaseRequisition;
- Quotation;
- Supplier;
- PurchaseOrder;
- Receiving;
- Entry.

## Flow

Requisition → Quotation → Comparison → Approval → Order → Receiving → Inventory/Fiscal/Financial.

## Rules

- orders above threshold require approval;
- receiving must reflect effective quantities;
- entry must generate necessary links;
- discrepancies must be recorded.

---

# 9. INVENTORY AND WMS

## Entities

- Product;
- Warehouse (Deposito);
- Location (Localizacao);
- StockBalance;
- Lot;
- Serial;
- Movement;
- Transfer;
- InventoryCount;
- Reservation.

## Operations

- entry;
- exit;
- adjustment;
- transfer;
- inventory;
- reservation;
- write-off;
- reversal.

## Rules

- movements must be auditable;
- balances must be consistent;
- lot/serial/validity must be respected when configured;
- in-transit transfers must have states;
- concurrent operations must not corrupt balances.

## Acceptance Criteria

Balance and history must remain consistent after normal operations, reversals, transfers, and controlled concurrency.

---

# 10. FINANCIAL

## 10.1 Entities

- FinancialAccount;
- AccountsPayable;
- AccountsReceivable;
- Installment (Parcela);
- Settlement (Baixa);
- Reversal (Estorno);
- Cash (Caixa);
- Bank;
- Transfer;
- Reconciliation;
- CostCenter;
- ChartOfAccounts;
- Billing/Collection.

## 10.2 Screens

- dashboard;
- accounts payable;
- accounts receivable;
- cash flow;
- banks;
- reconciliation;
- collection;
- cash flow projection;
- P&L (DRE);
- cost centers;
- chart of accounts;
- closing.

## 10.3 Flows

### Payable

Entry → Approval → Due Date → Payment → Settlement → Reconciliation.

### Receivable

Sale/Entry → Installment → Collection → Receipt → Settlement → Reconciliation.

## 10.4 Rules

- settlement must have an origin;
- reversal must preserve history;
- interest/fine/discount must be parameterizable;
- entries must link to their origin;
- closing must restrict modifications per policy.

---

# 11. PIX AND COLLECTIONS

## Flow

Collection → Payload/QR → Gateway → Webhook → Confirmation → Settlement → Reconciliation.

## Requirements

- idempotency;
- webhook validation;
- transaction logging;
- duplicity handling;
- failures and reprocessing;
- audit.

---

# 12. FISCAL

## 12.1 Architecture

Decoupled fiscal driver.

## 12.2 Entities

- FiscalDocument;
- FiscalItem;
- FiscalEvent;
- Certificate;
- FiscalRule;
- Contingency;
- XML.

## 12.3 Flows

Issuance → Validation → Signing → Submission → Return → Storage → Integrations.

## 12.4 Treatment

Must include:

- authorization;
- rejection;
- cancellation;
- correction letter (CC-e);
- nullification (inutilização);
- contingency;
- events;
- query;
- storage.

## Acceptance Criteria

Each enabled fiscal type must be validated in an appropriate environment and handle major returns and failures.

---

# 13. SERVICES / WORK ORDERS / CMMS

## Entities

- WorkOrder (OrdemServico);
- Customer;
- Technician;
- Team;
- Schedule;
- SLA;
- Asset;
- WorkOrderMaterial;
- Evidence;
- TechnicalReport (Laudo);
- Signature;
- MaintenanceContract.

## Flow

Opening → Triage → Scheduling → Execution → Evidences → Materials → Report → Signature/Approval → Closure → Financial.

## Rules

- SLA must be calculated per configured calendar;
- execution must record the responsible party;
- materials must move inventory;
- closure must respect mandatory requirements;
- evidences must be traceable.

---

# 14. PCP / INDUSTRIAL / MRP

## Entities

- Product;
- BOM;
- BOMVersion;
- ProductionOrder;
- Operation;
- Machine;
- Operator;
- Tracking/TimeSheet (Apontamento);
- Consumption;
- Scrap/Loss;
- Cost.

## Flow

Demand → Planning → Production Order → Reservation/Picking → Production → Tracking → Consumption → Finished Product → Costs.

## Rules

- BOM version must be identifiable;
- consumption must have traceability;
- losses/scraps must be recorded;
- Production Orders must have states;
- costs must be calculable per adopted method.

---

# 15. FLEETS AND TRANSPORTS

Must include:

- vehicles;
- drivers;
- documents;
- refuelings;
- maintenance;
- tires;
- trips;
- costs;
- alerts;
- CT-e/MDF-e when applicable.

Criterion: Utilization and cost history must be auditable per vehicle.

---

# 16. ASSETS AND PATRIMONY

Must include:

- registry;
- asset tagging;
- location;
- responsible person;
- depreciation;
- transfer;
- write-off;
- digital custody;
- QR Code;
- maintenance;
- history.

---

# 17. HR AND PERSONNEL DEPARTMENT (DP)

## Strategic HR

- vacancies;
- candidates;
- selection;
- evaluations;
- cycles;
- IDP (PDI);
- trainings;
- competencies;
- climate;
- eNPS;
- Nine-Box.

## Personnel Department (DP)

- employee;
- functional file;
- work schedule;
- shift;
- time clock (ponto);
- time bank;
- vacation;
- 13th salary;
- payslip (holerite);
- termination;
- integrations.

## Rule

Personal data must have restricted access by role and audit trail.

---

# 18. PROJECTS

Entities:

- Project;
- Contract;
- Task;
- Team;
- TimeTracking;
- Cost;
- Budget;
- Deliverable.

Flow:
Planning → Execution → Time tracking → Costs → Deliverables → Billing/Closure.

---

# 19. DOCUMENT MANAGEMENT (GED)

Must include:

- document;
- version;
- category;
- permissions;
- entity binding;
- storage;
- retention;
- audit;
- search.

---

# 20. CUSTOMER PORTAL

The customer must be able to, per permissions/contract:

- access;
- query work orders;
- query quotes;
- approve;
- track;
- view documents;
- sign;
- query payments;
- use PIX;
- receive notifications.

---

# 21. BI AND REPORTS

Each module must define its indicators and reports.

Common requirements:

- filters;
- period;
- company;
- branch;
- user;
- export;
- permissions;
- audit;
- tenant isolation.

---

# 22. API AND INTEGRATIONS

Every external integration must have:

- contract;
- authentication;
- timeout;
- retry;
- idempotency when applicable;
- logs;
- error handling;
- versioning;
- documentation;
- monitoring.

---

# 23. EVENTS AND MESSAGING

Events must be defined for relevant processes, for example:

- sale created;
- order approved;
- inventory moved;
- payment confirmed;
- fiscal document authorized;
- work order closed;
- user created;
- tenant created.

Asynchronous processes must be retryable and observable.

---

# 24. SAAS AND BILLING

## Entities

- Plan;
- Subscription;
- Tenant;
- Resource;
- Limit;
- Consumption;
- Billing;
- Invoice;
- BillingEvent.

## Flow

Registration → Trial/Plan → Subscription → Billing → Confirmation → Activation → Consumption → Renewal/Upgrade/Downgrade/Cancellation.

## Rules

- downgrade must not destroy data;
- excess resources must have a defined policy;
- delinquency must have states;
- plan changes must be audited.

---

# 25. SECURITY AND LGPD

Cross-cutting requirements:

- least privilege;
- tenant isolation;
- MFA;
- audit;
- session protection;
- API protection;
- rate limiting;
- secrets management;
- retention;
- anonymization when applicable;
- traceability;
- incident response.

---

# 26. INFRASTRUCTURE AND DEVOPS

Must include:

- separate environments;
- CI/CD;
- controlled deploy;
- migrations;
- rollback;
- secrets;
- workers;
- queues;
- cache;
- storage;
- database;
- monitoring;
- logs;
- alerts;
- health checks;
- SSL/TLS.

---

# 27. BACKUP AND DISASTER RECOVERY

Must define:

- frequency;
- retention;
- destination;
- encryption;
- restoration;
- RPO;
- RTO;
- periodic tests;
- contingency plan.

---

# 28. QA AND ACCEPTANCE CRITERIA

Every module must have:

- unit tests;
- integration tests;
- API tests;
- permission tests;
- multi-tenant tests;
- regression tests;
- critical flow tests;
- error tests;
- homologation.

## Definition of Done

A feature is only considered done when:

1. requirement approved;
2. implementation completed;
3. validations implemented;
4. permissions implemented;
5. audit defined when necessary;
6. tests approved;
7. integration validated;
8. documentation updated;
9. homologation approved;
10. controlled deploy executed.

---

# 29. ONBOARDING, DEPLOYMENT, AND SUPPORT

Must exist:

- tenant creation;
- configuration;
- import;
- training;
- homologation;
- activation;
- checklist;
- support;
- ticketing;
- SLA;
- knowledge base;
- incident management.

---

# 30. PWA, OFFLINE, REAL-TIME, AND AI

These features will be treated as evolution layers, but must respect the Core.

## PWA/Offline

- cache;
- IndexedDB;
- local queue;
- synchronization;
- conflict resolution.

## Real-Time

- SSE;
- notifications;
- dashboard updates;
- events.

## AI

- semantic search;
- vectorization;
- recommendations;
- automation;
- assistants.

---

# 31. DEPENDENCY MATRIX

Minimum recommended order:

**Core → Identity → Registries → Configurations → Commercial/Purchasing → Inventory → Financial → Fiscal → Services/Industrial → Corporate → SaaS/Operation**

No module shall duplicate fundamental registries without architectural justification.

---

# 32. GLOBAL 100% CRITERION

Scalle will be 100% commercially ready only when:

- product specified;
- architecture validated;
- Core stable;
- multi-tenant validated;
- identity secure;
- registries complete;
- operational modules functional;
- integrations working;
- fiscal homologated as applicable;
- financial validated;
- critical automated tests passing;
- security validated;
- LGPD documented;
- backup tested;
- recovery validated;
- observability active;
- CI/CD operational;
- documentation complete;
- onboarding defined;
- support structured;
- SaaS/Billing operational;
- contracts and policies defined;
- production ready;
- commercial operation validated.

---

# 33. MASTER EXECUTION MATRIX

| Domain             | Specification | Development | Tests | Homologation | Production | Commercial |
| ------------------ | ------------- | ----------- | ----- | ------------ | ---------- | ---------- |
| Core               | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Identity           | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Registries         | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Commercial         | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Purchasing         | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Inventory/WMS      | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Financial          | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Fiscal             | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Services/OS        | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| PCP/MRP            | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Fleets             | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Assets             | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| HR/DP              | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Projects           | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| GED                | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Portal             | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| BI                 | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| API/Integrations   | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| SaaS/Billing       | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Security/LGPD      | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| DevOps             | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| QA                 | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |
| Deployment/Support | ⚪             | ⚪           | ⚪     | ⚪            | ⚪          | ⚪          |

---

# 34. FINAL RULE

This document is a construction specification.

When a decision is not defined, it must be recorded as a pending requirement prior to implementation, rather than assumed by the team.

The objective is to eliminate the need to "guess" how the ERP should work.

**SCALLE ERP — 0% → 100% COMMERCIALLY READY**
