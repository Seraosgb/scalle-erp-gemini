PROJECT MASTER DOCUMENT — SCALLE ERP
====================================

**Version:** 1.1 — Architectural and Tax Shielding**Reference state:** 0%**Objective:** fully specify the Scalle ERP, from scratch to a commercial, scalable SaaS product applicable to companies of any size and segment.**Base architecture:** SaaS Multi-Tenant Modular Monolith**Main database:** PostgreSQL



1. PURPOSE
   ==========

This document is the central specification of the product.



It must allow:



* product;
  
  

* architecture;
  
  

* UX/UI;
  
  

* backend;
  
  

* frontend;
  
  

* database;
  
  

* QA;
  
  

* DevOps;
  
  

* security;
  
  

* deployment;
  
  

* support;
  
  

to be able to work on the same definition.



The project is considered **0%** regardless of the state of previously existing versions, releases, or functionalities.



No historical functionality will be considered automatically completed.



2. PRODUCT VISION
   =================

Scalle ERP must be a SaaS business platform capable of serving:



* MEI (Individual Microentrepreneurs);
  
  

* micro-enterprises;
  
  

* small businesses;
  
  

* medium-sized businesses;
  
  

* large companies;
  
  

* corporate groups;
  
  

* companies with multiple branches;
  
  

* simple operations;
  
  

* complex operations;
  
  

* service companies;
  
  

* commerce;
  
  

* industry;
  
  

* distribution;
  
  

* maintenance;
  
  

* logistics;
  
  

* construction;
  
  

* projects;
  
  

* hybrid operations.
  
  

The architecture must not force a small company to use complex corporate features, but it must allow growth without structural product migration.



3. PRODUCT PRINCIPLES
   =====================

4. Multi-tenant from the foundation.
   
   

2. Security by default.
   
   

3. Modularity.
   
   

4. Auditability.
   
   

5. Configurability.
   
   

6. Scalability.
   
   

7. Transactional integrity.
   
   

8. API-first.
   
   

9. Automation.
   
   

10. Simple user experience.
    
    

11. Compatibility with business growth.
    
    

12. No module should create unnecessary duplicate fundamental registries.
    
    

13. Critical rules must be explicit and testable.
    
    

14. Data must not be destroyed by downgrades, payment defaults, or deactivation.
    
    

15. The system must have an audit trail for relevant operations.
    
    

4. ARCHITECTURE
   ===============

4.1 Model
---------

**SaaS Multi-Tenant Modular Monolith.**



The application will initially be an operational unit, yet organized into independent modules.



Conceptual structure:

Scalle ERP
    ├── Core
    ├── Tenancy
    ├── Identity
    ├── Authorization
    ├── Organization
    ├── Configuration
    ├── Audit
    ├── Storage
    ├── Notifications
    ├── Jobs
    ├── Integrations
    ├── CRM
    ├── Sales
    ├── Purchasing
    ├── Inventory
    ├── Finance
    ├── Fiscal
    ├── Services
    ├── Manufacturing
    ├── Fleet
    ├── Assets
    ├── Projects
    ├── HR
    ├── Payroll
    ├── GED
    ├── BI
    ├── Portal
    └── SaaS/Billing
4.2 Database
------------

PostgreSQL will be the official production database.



Reasons:



* transactional robustness;
  
  

* referential integrity;
  
  

* concurrency;
  
  

* JSONB;
  
  

* advanced indexes;
  
  

* extensibility;
  
  

* ecosystem;
  
  

* scalability;
  
  

* possibility of pgvector for AI.
  
  

4.3 Evolution
-------------

The architecture must later allow for:



* independent workers;
  
  

* distributed cache;
  
  

* external storage;
  
  

* queues;
  
  

* specialized services;
  
  

* dedicated database;
  
  

* dedicated environment;
  
  

* extraction of critical modules to services.
  
  

Microservices will not be adopted prematurely.



5. SAAS MULTI-TENANT
   ====================

5.1 Initial Strategy
--------------------

Shared database + shared schema + `tenant_id`.

5.2 Isolation
-------------

Every entity belonging to a tenant must have a tenant context.



No query can ignore the context.

5.3 Enterprise Evolution
------------------------

Prepare for:



* dedicated schema;
  
  

* dedicated database;
  
  

* dedicated infrastructure;
  
  

* dedicated region;
  
  

* specific policies.
  
  

5.4 Tenant States
-----------------

* trial;
  
  

* active;
  
  

* pending payment;
  
  

* default;
  
  

* suspended;
  
  

* blocked;
  
  

* canceled;
  
  

* closed.
  
  

4.4 Tenant Shielding in Laravel
-------------------------------

In the Laravel backend, every Model belonging to a tenant must use `GlobalScopeTenant` in Eloquent as a mandatory isolation mechanism.



The scope must be automatically applied to multi-tenant Models and must:



* resolve the tenant from a reliable context;
  
  

* prevent queries without a tenant context;
  
  

* prevent creation without a `tenant_id`;
  
  

* prevent alteration/deletion of records from another tenant;
  
  

* have automated isolation tests.
  
  

### Golden Rule

**NEVER query tables from another domain via direct SQL.**



It is prohibited, in domain code, to bypass isolation or encapsulation using `withoutGlobalScopes()`, `DB::table()`, `DB::select()`, or raw SQL to access data from another domain.



Inter-module communication must use:



* DTOs;
  
  

* Service Interfaces;
  
  

* Application Services;
  
  

* Commands;
  
  

* Events;
  
  

* internal APIs, when necessary.
  
  

Prohibited example:


    DB::table('finance_accounts')->where(...)->get();

Allowed example:


    $receivable =$financeService->findReceivable(
        ReceivableQueryDTO::fromId($id)
    );

Any exception must be restricted to explicitly authorized, documented, and audited infrastructure.

4.5 Database Boundary
---------------------

The database must not be used as an integration contract between modules.



The internal structure of the tables is the property of the domain that owns them.

5.5 Isolation Enforcement
-------------------------

Isolation must exist in layers:


    Request
     ↓
    Tenant Resolver
     ↓
    Authenticated Context
     ↓
    Authorization
     ↓
    GlobalScopeTenant
     ↓
    Service Layer
     ↓
    ORM/Repository
     ↓
    Database

The client can never provide a `tenant_id` and thereby obtain authorization to access that tenant.



Jobs, queues, events, cache, storage, and integrations must also preserve the correct context.

5.6 Mandatory Multi-Tenancy Tests
---------------------------------

They must prove:



* Tenant A does not read Tenant B;
  
  

* Tenant A does not alter Tenant B;
  
  

* Tenant A does not delete Tenant B;
  
  

* Tenant A does not access files from Tenant B;
  
  

* relationships do not allow indirect leakage;
  
  

* IDs do not allow improper enumeration;
  
  

* APIs do not accept arbitrary `tenant_id` from the client;
  
  

* jobs preserve the tenant;
  
  

* events preserve the tenant;
  
  

* cache never mixes tenants.
  
  
6. CORE / FOUNDATION
   ====================

6.1 Responsibility
------------------

Provide common services to all modules.

6.2 Components
--------------

* Tenant;
  
  

* Company;
  
  

* Branch;
  
  

* User;
  
  

* Profile;
  
  

* Permission;
  
  

* Session;
  
  

* Configuration;
  
  

* Feature Flag;
  
  

* Audit;
  
  

* Storage;
  
  

* Notifications;
  
  

* Jobs;
  
  

* Queues;
  
  

* Cache;
  
  

* Events;
  
  

* Webhooks;
  
  

* Integrations;
  
  

* Observability.
  
  

6.3 Identifiers
---------------

Use UUID as a public identifier.



Every relevant record must have:



* `id`;
  
  

* `created_at`;
  
  

* `updated_at`;
  
  

* `deleted_at` when applicable.
  
  
7. BUSINESS ORGANIZATION
   ========================

Flexible hierarchy:


    Tenant
    └── Corporate Group
        └── Company
            └── Branch
                └── Establishment

No level should be mandatory when it doesn't make sense.

Company
-------

Fields:



* corporate name (razão social);
  
  

* trade name (nome fantasia);
  
  

* document (tax ID);
  
  

* registrations;
  
  

* tax regime;
  
  

* size;
  
  

* address;
  
  

* contacts;
  
  

* activity;
  
  

* status.
  
  

Branch
------

Fields:



* company;
  
  

* code;
  
  

* name;
  
  

* document;
  
  

* address;
  
  

* registrations;
  
  

* tax series;
  
  

* timezone;
  
  

* status.
  
  
8. IDENTITY
   ===========

8.1 User
--------

Fields:



* first name;
  
  

* last name;
  
  

* email;
  
  

* phone;
  
  

* password;
  
  

* status;
  
  

* MFA;
  
  

* timezone;
  
  

* locale;
  
  

* avatar;
  
  

* last login.
  
  

8.2 Authentication
------------------

Must support:



* login;
  
  

* logout;
  
  

* recovery;
  
  

* email verification;
  
  

* MFA;
  
  

* TOTP;
  
  

* recovery codes;
  
  

* sessions;
  
  

* revocation;
  
  

* brute force protection.
  
  

8.3 Preparation
---------------

* WebAuthn;
  
  

* Passkeys;
  
  

* SSO;
  
  

* corporate integration.
  
  
9. AUTHORIZATION
   ================

Model:


    User
    → Profile
    → Permission
    → Context

Actions:



* view;
  
  

* create;
  
  

* edit;
  
  

* delete;
  
  

* approve;
  
  

* cancel;
  
  

* download;
  
  

* reverse (estornar);
  
  

* export;
  
  

* print;
  
  

* administer.
  
  

Scopes:



* tenant;
  
  

* company;
  
  

* branch;
  
  

* department;
  
  

* team;
  
  

* own user.
  
  
10. AUDIT
    =========

Record:



* user;
  
  

* tenant;
  
  

* action;
  
  

* module;
  
  

* entity;
  
  

* record;
  
  

* previous values;
  
  

* new values;
  
  

* IP;
  
  

* user-agent;
  
  

* request ID;
  
  

* correlation ID;
  
  

* date/time.
  
  

Critical events:



* authentication;
  
  

* permission changes;
  
  

* financial changes;
  
  

* tax issuance;
  
  

* cancellations;
  
  

* approvals;
  
  

* configuration changes;
  
  

* billing.
  
  
11. CONFIGURATIONS
    ==================

Hierarchy:


    System
    → Plan
    → Tenant
    → Company
    → Branch
    → User

Possible configurations:



* currency;
  
  

* language;
  
  

* timezone;
  
  

* numbering;
  
  

* series;
  
  

* taxes;
  
  

* discounts;
  
  

* SLA;
  
  

* notifications;
  
  

* documents;
  
  

* commercial rules;
  
  

* financial parameters.
  
  

11.1 Dropdown Lists as Domain Tables
------------------------------------

Configurable business values should not be implemented as rigid enums in the database.



Applicable, depending on the domain:



* status;
  
  

* categories;
  
  

* types;
  
  

* reasons;
  
  

* priorities;
  
  

* classifications;
  
  

* origins;
  
  

* natures;
  
  

* modalities;
  
  

* operational situations.
  
  

These values should be domain tables, with `tenant_id` when customizable.



Recommended fields:



* `id`;
  
  

* `tenant_id`;
  
  

* `code`;
  
  

* `name`;
  
  

* `description`;
  
  

* `sort_order`;
  
  

* `is_active`;
  
  

* `is_system`;
  
  

* `metadata`;
  
  

* `created_at`;
  
  

* `updated_at`;
  
  

* `deleted_at`.
  
  

Adding a new business parameter **must not require a schema migration**.



Systemic values may exist as protected records, simultaneously allowing custom values per tenant.



12. FEATURE FLAGS
    =================

Allow activation by:



* system;
  
  

* plan;
  
  

* tenant;
  
  

* company;
  
  

* user.
  
  

A feature flag does not replace a permission.



Effective access:


    Feature enabled
    +
    Plan allows
    +
    Permission allows
    =
    Access

13. WORKFLOW AND APPROVALS
    ==========================

Configurable engine.



Elements:



* trigger;
  
  

* condition;
  
  

* authority limit;
  
  

* approver;
  
  

* sequence;
  
  

* deadline;
  
  

* approval;
  
  

* rejection;
  
  

* justification;
  
  

* escalation;
  
  

* audit.
  
  

Applications:



* purchasing;
  
  

* sales;
  
  

* discounts;
  
  

* payments;
  
  

* contracts;
  
  

* work orders (OS);
  
  

* documents;
  
  

* expenses.
  
  
14. MASTER REGISTRIES
    =====================

14.0 Configurable Domains Rule
------------------------------

Master registries must use domain tables for lists that may vary by company or evolve throughout the product.



Do not use database enums for configurable categories, types, reasons, classifications, statuses, priorities, origins, or situations.



Application enums should only be used for technical states that are truly invariable and structural.

14.1 People
-----------

* customer;
  
  

* supplier;
  
  

* employee;
  
  

* contact;
  
  

* partner.
  
  

Data:



* identification;
  
  

* documents;
  
  

* contacts;
  
  

* addresses;
  
  

* tax data;
  
  

* relationships;
  
  

* status;
  
  

* history.
  
  

14.2 Products
-------------

Fields:



* code;
  
  

* name;
  
  

* description;
  
  

* type;
  
  

* unit;
  
  

* category;
  
  

* group;
  
  

* brand;
  
  

* model;
  
  

* NCM (Tax Code);
  
  

* cost;
  
  

* price;
  
  

* minimum stock;
  
  

* maximum stock;
  
  

* batch;
  
  

* serial number;
  
  

* validity;
  
  

* status.
  
  

14.3 Services
-------------

* code;
  
  

* name;
  
  

* description;
  
  

* unit;
  
  

* price;
  
  

* cost;
  
  

* taxation;
  
  

* SLA;
  
  

* category;
  
  

* status.
  
  

14.4 Units
----------

* unit of measurement;
  
  

* conversions;
  
  

* decimal places;
  
  

* usage rules.
  
  
15. CRM
    =======

Entities
--------

* Lead;
  
  

* Contact;
  
  

* Customer;
  
  

* Opportunity;
  
  

* Activity;
  
  

* Funnel;
  
  

* Stage;
  
  

* Campaign;
  
  

* Proposal.
  
  

Features
--------

* capture;
  
  

* qualification;
  
  

* distribution;
  
  

* follow-up;
  
  

* tasks;
  
  

* history;
  
  

* funnel;
  
  

* forecast;
  
  

* conversion.
  
  

Flow
----

    Lead
    → Qualification
    → Opportunity
    → Proposal
    → Negotiation
    → Won/Lost

16. COMMERCIAL / SALES
    ======================

Entities
--------

* quote/estimate;
  
  

* proposal;
  
  

* order;
  
  

* price table;
  
  

* payment condition;
  
  

* commission;
  
  

* contract.
  
  

Flow
----

    Customer
    → Quote
    → Approval
    → Order
    → Reservation
    → Invoicing
    → Financial
    → Fiscal

Rules
-----

* discount limit;
  
  

* authority level;
  
  

* credit;
  
  

* stock;
  
  

* commission;
  
  

* taxes;
  
  

* commercial conditions.
  
  
17. PURCHASING
    ==============

Entities
--------

* requisition;
  
  

* quotation;
  
  

* supplier;
  
  

* quotation map;
  
  

* order;
  
  

* receipt.
  
  

Flow
----

    Requisition
    → Quotation
    → Comparison
    → Approval
    → Order
    → Receipt
    → Stock
    → Fiscal
    → Financial

Rules
-----

* multiple suppliers;
  
  

* lowest price;
  
  

* deadline;
  
  

* quality;
  
  

* approval;
  
  

* divergence;
  
  

* partial receipt.
  
  
18. INVENTORY / WMS
    ===================

Entities
--------

* product;
  
  

* warehouse;
  
  

* address;
  
  

* balance;
  
  

* batch;
  
  

* serial number;
  
  

* movement;
  
  

* transfer;
  
  

* reservation;
  
  

* physical count (inventory).
  
  

Operations
----------

* inward / entry;
  
  

* outward / exit;
  
  

* adjustment;
  
  

* transfer;
  
  

* physical count;
  
  

* reservation;
  
  

* write-off;
  
  

* reversal.
  
  

Control
-------

* FIFO/FEFO when configured;
  
  

* batch;
  
  

* validity;
  
  

* serial number;
  
  

* location;
  
  

* available balance;
  
  

* reserved balance;
  
  

* blocked balance.
  
  

Critical Criterion
------------------

No concurrency may produce an inconsistent balance.



19. FINANCIAL
    =============

Accounts Payable
----------------

* entry;
  
  

* installment;
  
  

* approval;
  
  

* due date;
  
  

* payment;
  
  

* settlement/write-off;
  
  

* reversal.
  
  

Accounts Receivable
-------------------

* entry;
  
  

* installment;
  
  

* billing/collection;
  
  

* receipt;
  
  

* settlement/write-off;
  
  

* reversal.
  
  

Treasury
--------

* cash;
  
  

* bank;
  
  

* transfer;
  
  

* reconciliation.
  
  

Managerial Accounting
---------------------

* chart of accounts;
  
  

* cost centers;
  
  

* categories;
  
  

* P&L (DRE);
  
  

* cash flow.
  
  

Rules
-----

* entry origin;
  
  

* history;
  
  

* competence period;
  
  

* due date;
  
  

* liquidation;
  
  

* interest;
  
  

* penalty/fine;
  
  

* discount;
  
  

* reversal;
  
  

* closing.
  
  
20. BILLING / PIX
    =================

Flow:


    Billing
    → QR/Payload
    → Gateway
    → Webhook
    → Confirmation
    → Settlement
    → Reconciliation

Requirements:



* idempotency;
  
  

* signature;
  
  

* retry;
  
  

* logs;
  
  

* duplication handling;
  
  

* reconciliation.
  
  
21. FISCAL (TAX)
    ================

Decoupled architecture.

Entities
--------

* fiscal document;
  
  

* fiscal item;
  
  

* event;
  
  

* certificate;
  
  

* rule;
  
  

* XML;
  
  

* contingency.
  
  

Processes
---------

* issuance;
  
  

* validation;
  
  

* signature;
  
  

* sending;
  
  

* return;
  
  

* authorization;
  
  

* rejection;
  
  

* cancellation;
  
  

* CC-e (correction letter);
  
  

* invalidation;
  
  

* contingency;
  
  

* query;
  
  

* storage.
  
  

Fiscal support must be modular per document, operation, and applicability.

21.4 Tax Reform — CBS / IBS
---------------------------

The tax engine must be born ready for the coexistence and transition between tax models.



It must allow representing, according to validity, operation, and framework:



* PIS;
  
  

* COFINS;
  
  

* ICMS;
  
  

* ISS;
  
  

* CBS;
  
  

* IBS;
  
  

* other future taxes or components.
  
  

Rules should not be scattered in `if/else` statements throughout the system.



The calculation must consider:

Tax
    +
    Rule
    +
    Validity Period
    +
    Framework
    +
    Operation
    +
    Product/Service
    +
    Location
    +
    Calculation Base
    +
    Rate
    +
    Benefit/Exception
21.5 Tax Validity
-----------------

Every relevant tax rule must support:



* start date;
  
  

* end date;
  
  

* tax;
  
  

* regime;
  
  

* operation;
  
  

* parameters/formula.
  
  

Thus, old and new rules can coexist during the transition.

21.6 Split Payment
------------------

The fiscal/financial engine must have an architecture prepared for Split Payment.



The model must be able to represent:


    Gross Value
     ↓
    Tax Components
     ↓
    Segregated/Withheld Value when applicable
     ↓
    Net Value to the receiver

It must support:



* calculation;
  
  

* segregation;
  
  

* integration with payment methods;
  
  

* reconciliation;
  
  

* divergence;
  
  

* reversal;
  
  

* traceability;
  
  

* audit.
  
  

The concrete implementation must be configurable according to legislation, regulation, validity period, and integration used.

21.7 Fiscal Engine Components
-----------------------------

    FiscalEngine
    ├── TaxRuleResolver
    ├── TaxCalculator
    ├── TaxValidator
    ├── FiscalDocumentBuilder
    ├── FiscalEventProcessor
    ├── TaxTransitionResolver
    └── SplitPaymentResolver

21.8 Tax Tests
--------------

Scenarios must exist for:



* previous regime;
  
  

* transition;
  
  

* CBS;
  
  

* IBS;
  
  

* coexistence of taxes;
  
  

* change in validity period;
  
  

* exceptions;
  
  

* goods;
  
  

* services;
  
  

* returns;
  
  

* cancellations;
  
  

* contingency;
  
  

* Split Payment;
  
  

* divergences.
  
  
22. SERVICES / WORK ORDERS (OS) / CMMS
    ======================================

Entities
--------

* OS (Work Order);
  
  

* customer;
  
  

* technician;
  
  

* team;
  
  

* schedule;
  
  

* SLA;
  
  

* asset;
  
  

* material;
  
  

* evidence;
  
  

* technical report;
  
  

* signature;
  
  

* contract.
  
  

Flow
----

    Opening
    → Triage
    → Scheduling
    → Execution
    → Materials
    → Evidences
    → Technical Report
    → Approval
    → Closing
    → Financial

Rules
-----

* SLA;
  
  

* calendar;
  
  

* priority;
  
  

* team;
  
  

* technician;
  
  

* materials;
  
  

* signature;
  
  

* evidences;
  
  

* cost;
  
  

* invoicing.
  
  
23. INDUSTRIAL / PCP / MRP
    ==========================

Entities
--------

* product;
  
  

* BOM (Bill of Materials);
  
  

* version;
  
  

* operation;
  
  

* resource;
  
  

* machine;
  
  

* operator;
  
  

* production order (OP);
  
  

* recording/entry;
  
  

* consumption;
  
  

* loss;
  
  

* cost.
  
  

Flow
----

    Demand
    → MRP
    → Planning
    → OP (Production Order)
    → Separation
    → Production
    → Recording
    → Consumption
    → Finished Goods
    → Costs

Rules
-----

* BOM versions;
  
  

* capacity;
  
  

* lead time;
  
  

* stock;
  
  

* losses;
  
  

* scrap;
  
  

* traceability;
  
  

* cost.
  
  
24. FLEET
    =========

Features:



* vehicles;
  
  

* drivers;
  
  

* documents;
  
  

* fueling;
  
  

* maintenance;
  
  

* tires;
  
  

* trips;
  
  

* costs;
  
  

* fines;
  
  

* alerts;
  
  

* telemetry when integrated.
  
  

Fiscal/logistical integrations when applicable.



25. ASSETS / PATRIMONY
    ======================

Features:



* registry;
  
  

* patrimony;
  
  

* location;
  
  

* responsible person;
  
  

* movement;
  
  

* depreciation;
  
  

* maintenance;
  
  

* assignment term (cautela);
  
  

* QR Code;
  
  

* write-off;
  
  

* history.
  
  
26. PROJECTS
    ============

Entities:



* project;
  
  

* contract;
  
  

* task;
  
  

* team;
  
  

* resource;
  
  

* time entry;
  
  

* cost;
  
  

* budget;
  
  

* delivery.
  
  

Features:



* schedule;
  
  

* dependencies;
  
  

* responsible parties;
  
  

* hours;
  
  

* costs;
  
  

* budget;
  
  

* margin;
  
  

* progress;
  
  

* invoicing.
  
  
27. HR
    ======

Features:



* employees;
  
  

* job openings;
  
  

* recruitment;
  
  

* selection;
  
  

* competencies;
  
  

* evaluations;
  
  

* IDP (Individual Development Plan);
  
  

* training;
  
  

* performance;
  
  

* climate;
  
  

* surveys;
  
  

* Nine-Box.
  
  
28. PAYROLL (DEPARTAMENTO PESSOAL)
    ==================================

Features:



* registry;
  
  

* work journey;
  
  

* schedule;
  
  

* time and attendance;
  
  

* time bank;
  
  

* vacations;
  
  

* 13th salary;
  
  

* benefits;
  
  

* payslip;
  
  

* severance;
  
  

* legal integrations.
  
  

Data must have restricted and audited access.



29. EDMS (GED)
    ==============

Features:



* documents;
  
  

* folders;
  
  

* versions;
  
  

* categories;
  
  

* permissions;
  
  

* signature;
  
  

* retention;
  
  

* search;
  
  

* links;
  
  

* history.
  
  

Files may be linked to:



* customer;
  
  

* supplier;
  
  

* employee;
  
  

* contract;
  
  

* OS;
  
  

* order;
  
  

* fiscal document;
  
  

* project;
  
  

* asset.
  
  
30. CUSTOMER PORTAL
    ===================

Allow:



* login;
  
  

* tracking;
  
  

* approval;
  
  

* documents;
  
  

* OS;
  
  

* quotes;
  
  

* contracts;
  
  

* financial;
  
  

* payments;
  
  

* PIX;
  
  

* signature;
  
  

* notifications.
  
  
31. BI
    ======

Dashboards
----------

Each module must have its own indicators.



Examples:



### Commercial

* sales;
  
  

* conversion;
  
  

* average ticket;
  
  

* margin;
  
  

* forecast.
  
  

### Financial

* invoicing;
  
  

* receipt;
  
  

* default rate;
  
  

* cash flow;
  
  

* margin.
  
  

### Inventory

* turnover;
  
  

* coverage;
  
  

* stockout;
  
  

* physical count;
  
  

* losses.
  
  

### Services

* OS;
  
  

* SLA;
  
  

* productivity;
  
  

* cost;
  
  

* recurrence.
  
  

### Industrial

* production;
  
  

* OEE when applicable;
  
  

* losses;
  
  

* efficiency;
  
  

* capacity.
  
  
32. REPORTS
    ===========

Reports must have:



* filters;
  
  

* period;
  
  

* company;
  
  

* branch;
  
  

* user;
  
  

* export;
  
  

* printing;
  
  

* permissions;
  
  

* scheduling when applicable.
  
  

Formats:



* PDF;
  
  

* XLSX;
  
  

* CSV;
  
  

* JSON.
  
  
33. API
    =======

Standard:


    /api/v1

Resources must have:



* authentication;
  
  

* authorization;
  
  

* pagination;
  
  

* filters;
  
  

* sorting;
  
  

* validation;
  
  

* standardized errors;
  
  

* rate limiting;
  
  

* idempotency when necessary;
  
  

* versioning.
  
  

Response:


    {
      "data": {},
      "meta": {},
      "request_id": "..."
    }

Error:


    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid data",
        "details": {}
      },
      "request_id": "..."
    }

34. INTEGRATIONS
    ================

Every integration must have:



* contract;
  
  

* authentication;
  
  

* credentials;
  
  

* timeout;
  
  

* retry;
  
  

* backoff;
  
  

* logs;
  
  

* idempotency;
  
  

* monitoring;
  
  

* documentation;
  
  

* versioning.
  
  

Categories:



* banks;
  
  

* payments;
  
  

* fiscal;
  
  

* accounting;
  
  

* e-commerce;
  
  

* marketplaces;
  
  

* logistics;
  
  

* communication;
  
  

* signature;
  
  

* storage;
  
  

* identity.
  
  
35. EVENTS AND WEBHOOKS
    =======================

Internal events:



* TenantCreated;
  
  

* UserCreated;
  
  

* OrderCreated;
  
  

* OrderApproved;
  
  

* StockMoved;
  
  

* PaymentConfirmed;
  
  

* InvoiceAuthorized;
  
  

* ServiceOrderClosed;
  
  

* SubscriptionChanged.
  
  

External webhooks must have:



* signature;
  
  

* secret;
  
  

* events;
  
  

* attempts;
  
  

* response;
  
  

* retry;
  
  

* logs.
  
  
36. NOTIFICATIONS
    =================

Channels:



* in-app;
  
  

* email;
  
  

* WhatsApp;
  
  

* push.
  
  

Features:



* templates;
  
  

* preferences;
  
  

* queues;
  
  

* retry;
  
  

* history;
  
  

* delivery status.
  
  
37. PWA
    =======

Must allow:



* installation;
  
  

* responsiveness;
  
  

* cache;
  
  

* notifications;
  
  

* mobile experience;
  
  

* offline resources when applicable.
  
  
38. OFFLINE
    ===========

Architecture prepared for:



* IndexedDB;
  
  

* local queue;
  
  

* synchronization;
  
  

* conflicts;
  
  

* timestamps;
  
  

* idempotency.
  
  

Initial priority:



* OS;
  
  

* data collection;
  
  

* reading;
  
  

* entries;
  
  

* evidences.
  
  
39. REAL TIME
    =============

Possibilities:



* SSE;
  
  

* WebSocket when necessary;
  
  

* notifications;
  
  

* dashboards;
  
  

* job status;
  
  

* operational tracking.
  
  
40. AI
    ======

AI will be a cross-cutting layer.



Possibilities:



* semantic search;
  
  

* classification;
  
  

* OCR;
  
  

* extraction;
  
  

* assistant;
  
  

* financial analysis;
  
  

* forecasting;
  
  

* recommendation;
  
  

* automation;
  
  

* report generation;
  
  

* anomaly detection.
  
  

No critical automation shall execute an irreversible operation without an appropriate authorization policy.



41. SAAS / BILLING
    ==================

Entities
--------

* plan;
  
  

* subscription;
  
  

* resource;
  
  

* limit;
  
  

* consumption;
  
  

* charge;
  
  

* invoice;
  
  

* payment;
  
  

* event.
  
  

Plans
-----

The model must allow:



* free/trial plan;
  
  

* paid plans;
  
  

* add-on modules;
  
  

* additional users;
  
  

* consumption;
  
  

* storage;
  
  

* Enterprise resources.
  
  

Flow
----

    Registration
    → Trial
    → Plan
    → Subscription
    → Charge
    → Payment
    → Activation
    → Consumption
    → Renewal

42. LIMITS PER PLAN
    ===================

Possible limits:



* users;
  
  

* companies;
  
  

* branches;
  
  

* storage;
  
  

* documents;
  
  

* APIs;
  
  

* integrations;
  
  

* volume;
  
  

* modules;
  
  

* automations.
  
  

Limits must be configurable.



43. DOWNGRADE / UPGRADE
    =======================

Upgrade:



* immediate activation or according to policy;
  
  

* proportional billing when applicable.
  
  

Downgrade:



* do not delete data;
  
  

* preserve history;
  
  

* block only new uses that exceed the plan.
  
  
44. SECURITY
    ============

Requirements:



* HTTPS;
  
  

* secure secrets;
  
  

* password hashing;
  
  

* MFA;
  
  

* RBAC;
  
  

* rate limiting;
  
  

* session protection;
  
  

* audit;
  
  

* tenant isolation;
  
  

* input validation;
  
  

* API protection;
  
  

* security headers;
  
  

* dependency management;
  
  

* vulnerability analysis.
  
  
45. LGPD (General Data Protection Law)
    ======================================

Structure must exist for:



* purpose;
  
  

* consent when applicable;
  
  

* legal basis;
  
  

* minimization;
  
  

* retention;
  
  

* anonymization;
  
  

* export;
  
  

* data subject request;
  
  

* deletion when legally applicable;
  
  

* audit;
  
  

* access control.
  
  
46. OBSERVABILITY
    =================

Metrics:



* CPU;
  
  

* memory;
  
  

* latency;
  
  

* errors;
  
  

* database;
  
  

* cache;
  
  

* queues;
  
  

* jobs;
  
  

* storage;
  
  

* integrations;
  
  

* authentication;
  
  

* consumption per tenant.
  
  

Logs must have:



* timestamp;
  
  

* level;
  
  

* service/module;
  
  

* request ID;
  
  

* correlation ID;
  
  

* tenant;
  
  

* user when applicable.
  
  
47. INFRASTRUCTURE
    ==================

Environments:



* development;
  
  

* testing;
  
  

* staging (homologation);
  
  

* production.
  
  

Components:



* application;
  
  

* database;
  
  

* cache;
  
  

* queues;
  
  

* workers;
  
  

* storage;
  
  

* CDN when necessary;
  
  

* monitoring.
  
  
48. CI/CD
    =========

Pipeline:


    Commit
    → Lint
    → Tests
    → Build
    → Security Scan
    → Package
    → Deploy
    → Smoke Test
    → Monitoring

Must allow rollback.



Migrations must be controlled.



49. BACKUP
    ==========

Backup must include:



* database;
  
  

* files;
  
  

* configurations;
  
  

* metadata.
  
  

Define:



* frequency;
  
  

* retention;
  
  

* encryption;
  
  

* storage;
  
  

* restoration;
  
  

* RPO;
  
  

* RTO.
  
  

Restoration must be tested periodically.



50. DISASTER RECOVERY
    =====================

A plan must exist for:



* server unavailability;
  
  

* database failure;
  
  

* storage loss;
  
  

* corruption;
  
  

* security incident;
  
  

* deployment failure;
  
  

* integration unavailability.
  
  
51. SCALABILITY
    ===============

Prepare for:



* multiple instances;
  
  

* load balancer;
  
  

* horizontal workers;
  
  

* distributed cache;
  
  

* scalable database;
  
  

* external storage;
  
  

* queues;
  
  

* CDN.
  
  
52. QA
    ======

Each feature must have:



* unit test;
  
  

* integration;
  
  

* API;
  
  

* authorization;
  
  

* multitenant;
  
  

* regression;
  
  

* error;
  
  

* concurrency when necessary;
  
  

* staging (homologation).
  
  
53. SECURITY TESTS
    ==================

Mandatory:



* cross-access between tenants;
  
  

* privilege escalation;
  
  

* brute force;
  
  

* session;
  
  

* files;
  
  

* APIs;
  
  

* injection;
  
  

* validations;
  
  

* CSRF when applicable;
  
  

* XSS;
  
  

* permission control.
  
  
54. LOAD TESTS
    ==============

Must evaluate:



* login;
  
  

* dashboard;
  
  

* queries;
  
  

* writes;
  
  

* APIs;
  
  

* jobs;
  
  

* queues;
  
  

* reports;
  
  

* concurrent operations.
  
  
55. HOMOLOGATION (STAGING)
    ==========================

Each module must have a staging environment.



Flow:


    Development
    → QA
    → Staging
    → Approval
    → Production

56. ONBOARDING
    ==============

Flow:


    Registration
    → Verification
    → Tenant
    → Plan
    → Company
    → User
    → Configuration
    → Import
    → Training
    → Staging
    → Activation

57. DATA MIGRATION
    ==================

Must exist:



* import;
  
  

* mapping;
  
  

* validation;
  
  

* preview;
  
  

* errors;
  
  

* logs;
  
  

* rollback when possible;
  
  

* migration report.
  
  

Possible sources:



* Excel;
  
  

* CSV;
  
  

* APIs;
  
  

* databases;
  
  

* other ERPs.
  
  
58. SUPPORT
    ===========

Must exist:



* tickets;
  
  

* priorities;
  
  

* SLA;
  
  

* categories;
  
  

* assignees;
  
  

* history;
  
  

* knowledge base;
  
  

* incidents;
  
  

* problems;
  
  

* changes.
  
  
59. DOCUMENTATION
    =================

Mandatory documents:



* architecture;
  
  

* API;
  
  

* database;
  
  

* modules;
  
  

* deployment;
  
  

* configuration;
  
  

* security;
  
  

* backup;
  
  

* recovery;
  
  

* user;
  
  

* administrator;
  
  

* support.
  
  
60. COMMERCIAL MODEL
    ====================

Scalle must allow commercialization:



* per plan;
  
  

* per user;
  
  

* per company;
  
  

* per module;
  
  

* per consumption;
  
  

* per storage;
  
  

* Enterprise under contract.
  
  

The billing architecture must be independent of the business modules.



61. 100% CRITERION
    ==================

Scalle will only be considered 100% commercial when:



* requirements defined;
  
  

* architecture validated;
  
  

* Core functional;
  
  

* multitenant validated;
  
  

* security validated;
  
  

* master registries complete;
  
  

* operational modules;
  
  

* critical integrations;
  
  

* applicable fiscal homologated;
  
  

* financial validated;
  
  

* QA completed;
  
  

* backup validated;
  
  

* restoration validated;
  
  

* monitoring active;
  
  

* documentation complete;
  
  

* onboarding ready;
  
  

* support ready;
  
  

* billing ready;
  
  

* production stable;
  
  

* commercial operation validated.
  
  
62. DEFINITION OF DONE
    ======================

A feature can only be marked as done when:



1. requirement defined;
   
   

2. business rule defined;
   
   

3. UX defined;
   
   

4. database defined;
   
   

5. backend implemented;
   
   

6. frontend implemented;
   
   

7. permissions implemented;
   
   

8. audit defined;
   
   

9. integrations implemented;
   
   

10. tests passed;
    
    

11. documentation updated;
    
    

12. staging approved;
    
    

13. deployment executed;
    
    

14. monitoring available.
    
    

63. 0% → 100% MATRIX
    ====================

| **Domain**    | **Specification** | **Design** | **Development** | **QA** | **Staging** | **Production** | **Commercial** |
| ------------- | ----------------- | ---------- | --------------- | ------ | ----------- | -------------- | -------------- |
| Core          | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Identity      | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Organization  | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Registries    | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Workflow      | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| CRM           | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Commercial    | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Purchasing    | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Inventory/WMS | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Financial     | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Fiscal        | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Services      | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Industrial    | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Fleet         | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Assets        | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Projects      | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| HR            | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Payroll       | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| EDMS          | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Portal        | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| BI            | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| API           | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Integrations  | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| SaaS/Billing  | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Security      | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| LGPD          | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| DevOps        | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| QA            | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Deployment    | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |
| Support       | ⬜                 | ⬜          | ⬜               | ⬜      | ⬜           | ⬜              | ⬜              |

64. OFFICIAL BUILD ORDER
    ========================

The recommended order is:



1. Architecture and standards;
   
   

2. Core;
   
   

3. Multi-tenancy;
   
   

4. Identity;
   
   

5. Authorization;
   
   

6. Organization;
   
   

7. Registries;
   
   

8. Configurations;
   
   

9. Workflow;
   
   

10. CRM;
    
    

11. Commercial;
    
    

12. Purchasing;
    
    

13. Inventory;
    
    

14. Financial;
    
    

15. Fiscal;
    
    

16. Services;
    
    

17. Industrial;
    
    

18. Fleet;
    
    

19. Assets;
    
    

20. Projects;
    
    

21. HR;
    
    

22. Payroll;
    
    

23. EDMS;
    
    

24. Portal;
    
    

25. BI;
    
    

26. APIs;
    
    

27. Integrations;
    
    

28. SaaS/Billing;
    
    

29. Security/LGPD;
    
    

30. DevOps;
    
    

31. QA;
    
    

32. Deployment;
    
    

33. Support;
    
    

34. PWA/Offline;
    
    

35. Real time;
    
    

36. AI.
    
    

65. DOCUMENT GOVERNANCE RULE
    ============================

Any relevant change must record:



* requirement;
  
  

* reason;
  
  

* impact;
  
  

* affected modules;
  
  

* affected database;
  
  

* affected APIs;
  
  

* affected tests;
  
  

* affected documentation.
  
  

No critical rule change should occur only in the code.



66. MANDATORY ARCHITECTURAL SHIELDINGS
    ======================================

These rules apply transversely across all modules.

66.1 Isolation
--------------

**No tenant data can be accessed without a valid context.**

66.2 Cross-Domain Communication
-------------------------------

**NEVER query tables from another domain directly via SQL.**



The database is not an integration contract between modules.

66.3 Configuration
------------------

Configurable business values must be data, not schema changes.

66.4 Fiscal
-----------

Taxation must be:



* decoupled;
  
  

* configurable/parameterized;
  
  

* versionable;
  
  

* validity-driven;
  
  

* prepared for the coexistence of models;
  
  

* prepared for CBS/IBS;
  
  

* prepared for Split Payment;
  
  

* testable independently from consuming modules.
  
  

66.5 Shielding Checklist
------------------------

* [ ] `GlobalScopeTenant` applied to multi-tenant Models.
  
  

* [ ] Isolation tests between tenants.
  
  

* [ ] No direct SQL access to tables from another domain.
  
  

* [ ] Communication via DTOs/interfaces/services/events.
  
  

* [ ] Configurable lists modeled as domain tables.
  
  

* [ ] Adding parameters does not require schema migration.
  
  

* [ ] Tax rules have validity periods.
  
  

* [ ] Tax rules support tax coexistence.
  
  

* [ ] CBS/IBS foreseen in the architecture.
  
  

* [ ] Split Payment foreseen in the architecture.
  
  

* [ ] Jobs preserve tenant.
  
  

* [ ] Cache preserves tenant.
  
  

* [ ] Storage preserves tenant.
  
  

* [ ] APIs do not trust `tenant_id` sent by the client.
  
  
67. CONCLUSION
    ==============

This document represents the definition of Scalle ERP as a product.



The starting point is:



> **0%**

The final objective is:



> **Commercial SaaS ERP, multi-tenant, modular, secure, scalable, and capable of serving companies of any size and segment.**

The project shall not be considered complete simply because all screens exist.



**100% means an operational, tested, secure, documented, deployable, supportable, and marketable product.**
