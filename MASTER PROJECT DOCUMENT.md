**MASTER PROJECT DOCUMENT**
===========================

**Scalle ERP — Architectural Blueprint, Engineering, Commercial Modules, and Governance**
-----------------------------------------------------------------------------------------

**Document Version:** 2.0.0 (Complete Commercial Vision — From Zero to Enterprise)

**Product Type:** Hybrid Multi-Tenant ERP (Self-Service SaaS & Corporate B2B Consultative Sales)

**Classification:** Official Engineering and Product Specification Document
**1. Prerequisites and Architectural Philosophy**
-------------------------------------------------

### **1.1 Fundamental Guidelines**

**Scalle ERP** was designed to compete directly with consolidated market solutions (such as Omie, Bling, Tiny, Protheus, and Sankhya), serving everything from individual microentrepreneurs (MEI)/Micro-businesses to large industries and multi-branch networks using the same codebase.

> * **Modular Monolith Backend in PHP 8.4 + Laravel:** A robust RESTful API, decoupled into hermetic domains with strict dependency injection, immutable DTOs, and service interfaces. Modern PHP with OPcache and JIT ensures high performance with low infrastructure costs.
> 
> * **PostgreSQL Database:** Strict relational modeling using UUIDs as public keys (shielding internal sequential IDs), native JSONB support for custom configurations, and high-performance B-Tree/GIN indexing.
> 
> * **Hybrid Multi-Tenancy with Global Isolation (Row-Level Security / Global Scope):** Hermetic logical isolation by `empresa_id` managed at the ORM level (GlobalScopeTenant) and parameterization tables for dropdown lists (Dropdowns as Tables), ensuring scalability without schema mutation.
> 
> * **Decoupling and Backward Compatibility:** Express prohibition of cross-SQL queries between tables from different modules. All database migrations must be incremental (additive), without destructive commands (drop column), preserving versioned API contracts.

### **1.2 Critical Security Alerts and Anti-Patterns (What NOT to do)**

> * **DO NOT** expose auto-increment sequential IDs in public routes or response payloads.
> 
> * **DO NOT** query data from another module via direct database query without using the service interface or dedicated DTO of the origin domain.
> 
> * **DO NOT** store passwords or fiscal secrets (digital certificates) without symmetric encryption (AES-256) tied to the tenant's key.
> 
> * **DO NOT** allow physical deletion (Hard Delete) of records with fiscal, labor, or accounting relevance. All deletions must be logical (Soft Delete) with mandatory historical retention of at least 5 years.

**2. System Domains Architectural Diagram**
-------------------------------------------

                                `┌────────────────────────────────────────────────────────┐`  
                                `│             CORE LAYER & SAAS GOVERNANCE               │`  
                                `│ Auth (Sanctum/OAuth2) | GlobalScopeTenant | ACL/Roles  │`  
                                `│ Idempotency | Audit Trail | Shielded DTOs              │`  
                                `│ Billing & Subscriptions | Plan & Storage Quota Mgt     │`  
                                `└───────────────────────────┬────────────────────────────┘`  
                                                            `│`  
                `┌───────────────────────────────────────────┼───────────────────────────────────────────┐`  
                `▼                                           ▼                                           ▼`  
       `🛠️ SERVICE PROVISION & CMMS              🏬 COMMERCE, SALES & POS                 🏭 INDUSTRY & PCP`  

`- Full OS (Work Order) Lifecycle Mgt - Counter Sales / Offline First POS - Bill of Materials (Multi-level BOM)`

`- Preventive/Corrective Checklists - Quotes, Proposals & Orders - Production Orders (OP) & Time Tracking`

`- Photographic Evidences (Before/After) - Multi-level Commission Management - Cost Appropriation (Direct Labor + Overhead)`

`- Legal Digital Signature (MP 2.200-2) - Dynamic Price Tables by Channel - Analytical Scrap and Loss Control`

`- Customer Portal (Self-Service OS) - CRM & Negotiation Funnel - Production Batch Traceability`

`│ │ │`

`└───────────────────────────────────────────┼───────────────────────────────────────────┘`

`│`

`┌───────────────────────────────────────────┴───────────────────────────────────────────┐`

`▼ ▼`

`📦 SUPPLIES, WMS & LOGISTICS 💰 FINANCIAL, FISCAL & CONTROLLERSHIP`

`- Purchasing, Quotations & Supplier Orders - Accounts Payable / Accounts Receivable / Partial Write-offs`

`- Smart Inbound Invoice (NF-e) XML Importer - Native PIX Billing (EMV/QR Code) & Bank Slips/Credit Card`

`- Multi-Warehouses, Storerooms & Locations - Bank Reconciliation OFX / Open Finance`

`- Batch, Serial & Expiration Traceability - Managerial P&L (DRE), Cost Centers & Cash Flow`

`- Fleet Management, Fuel KM/L & CTe - Full Fiscal Engine (NF-e, NFS-e, NFC-e, MDF-e, CTe)`

`- Patrimonial Assets, Depreciation & Assignment - Fiscal/Accounting Export (SPED Fiscal/Payroll/Domínio)`

`│ │`

`└───────────────────────────────────────────┬───────────────────────────────────────────┘`

`▼`

`┌────────────────────────────────────────────────────────┐`

`│ 👥 HUMAN RESOURCES, PAYROLL & TALENT │`

`│ Employee Record | Work Schedules & REP-P GPS Time Tracking│`

`│ Time Bank | Managerial Payslip | PPE Assignment Form │`

`│ R&S Kanban Funnel | Performance Evaluation & IDP │`

`│ Organizational Climate Survey & Anonymous eNPS │`

`└────────────────────────────────────────────────────────┘`
**3. Complete Specification of System Modules**
-----------------------------------------------

### **3.1 Core Layer, Security, and Multi-Tenant Governance**

> * **Authentication & Authorization:** Stateless authentication via Laravel Sanctum / OAuth2, support for multiple branches/establishments under the same login, and granular role-based access control (ACL / CheckRole).
> 
> * **Hermetic Isolation (GlobalScopeTenant):** Forced scope in the Eloquent ORM that automatically injects `WHERE empresa_id = ?` into 100% of reads and writes, preventing cross-tenant data leakage.
> 
> * **Audit Trail & Idempotency:** Centralized table (`sis_auditoria_logs`) to track mutations (who, when, IP, old and new values). Mandatory `Idempotency-Key` header in financial and fiscal mutation requests to prevent duplicate operations.
> 
> * **Dropdown Lists as Tables:** All categories, statuses, reasons, and dynamic parameters are modeled in tenant domain tables, ensuring scalability and corporate customization.

### **3.2 Service Provision, Field Service & CMMS**

> * **Work Order (OS) Lifecycle:** Opening, technical diagnosis, commercial approval, execution, warranty validation, and closure with automatic write-off of parts inventory.
> 
> * **Photographic Evidences & Digital Signature:** Photo collection with compression and optimized storage. Customer signature on the mobile/tablet screen with corroborating metadata collection (Geolocation, Connection IP, Atomic Timestamp, and SHA-256 cryptographic Hash) in compliance with MP 2.200-2/2001.
> 
> * **Customer Portal (Self-Service):** Secure public temporary link for the end customer to approve OS quotes, view technical reports with photos, and make payments via integrated PIX.

### **3.3 Commerce, Sales & Counter POS**

> * **Counter POS (Offline First):** Agile point of sale frontend, compatible with barcode scanners, thermal printers (ESC/POS), and local contingency with automatic batch synchronization.
> 
> * **Commercial Management & CRM:** Sales funnel, smart quotes, commission tracking per salesperson/technician, and discount rules with parameterized approval limits.
> 
> * **Multiple Price Tables:** Support for differentiated pricing by sales channel (Wholesale, Retail, Counter, and Corporate B2B).

### **3.4 Industry, Product Engineering & PCP (Production Planning and Control)**

> * **Bill of Materials (Multi-level BOM):** Detailed technical specification with consumption of raw materials, intermediate components, and fractionated supplies.
> 
> * **Production Orders (OP):** Planning, atomic reservation of inputs, tracking of direct labor (MOD) time, and manufacturing overhead/cost centers (CIF).
> 
> * **Calculated Cost & Scrap Management:** Recalculation of the average unit cost of the finished product after OP completion and analytical tracking of waste/scrap.

### **3.5 Supplies, Purchasing, WMS & Logistics**

> * **Purchasing & Quotations:** Comparative quotation map with multiple suppliers and purchase orders linked to receipt verification.
> 
> * **Smart XML Importer:** Automatic reading of inbound NF-e, smart linking of items, automatic unit of measurement conversion, and entry into Accounts Payable.
> 
> * **WMS & Multi-Warehouses:** Fractionated stock control by storeroom, logistical addressing, and internal transfers in Direct and In-Transit modes.
> 
> * **Batch, Serial & Expiration Traceability:** Strict expiration tracking (FEFO/FIFO), serial numbers for warranties, and automatic blocking of expired items.
> 
> * **Fleet & Asset Management:** Vehicle tracking, odometer/KM, KM/L average consumption integrated with Financials, capitalization of patrimonial assets, automatic linear depreciation, and Digital Assignment Term with QR Code for tools.

### **3.6 Financial, Billing, Reconciliation & Controllership**

> * **Accounts Payable & Receivable:** Management of titles with installments, interest, fines, discounts, tax withholdings, and partial or batch write-offs.
> 
> * **Integrated Billing:** Native generation of EMV PIX (Copy & Paste + dynamic QR Code with CRC16), issuance of registered bank slips, and integration with credit card gateways.
> 
> * **Bank Reconciliation:** Importer for bank OFX files and preparation for Open Finance integration with automatic transaction reconciliation.
> 
> * **Managerial P&L (DRE) & Cash Flow:** Analytical Income Statement by accrual and cash basis, segregated by cost center and structured chart of accounts.
> 
> * **External Accounting Bridge:** Generation of standardized files for external accounting firms (SPED Fiscal, SPED Contribuições, Domínio Sistemas, and managerial CSV).

### **3.7 Decoupled Fiscal Engine**

> * **Fiscal Drivers Architecture:** Abstract interface (`FiscalDriverInterface`) decoupling the core from municipal and state rules.
> 
> * **Supported Fiscal Documents:** Issuance, cancellation, invalidation, and Electronic Correction Letter (CC-e) for NF-e (Model 55), NFC-e (Model 65), NFS-e (National Standard and Major City Halls), CT-e (Model 57), and MDF-e (Model 58).
> 
> * **Certificate Management & XML Storage:** Support for A1 Digital Certificates (secure encrypted storage) and automatic routine for archiving and compressing signed XMLs for 5 years.

### **3.8 Human Resources, Payroll & Talent**

> * **Employee Record & Schedules:** Complete registry of employees, dependents, salary history, job titles, and matrix of flexible work schedules.
> 
> * **Georeferenced Electronic Time Tracking (MTP Ordinance No. 671/2021):** Time clocking capturing Atomic Date/Time, IP, and GPS coordinates. Immutable base with an auditable mirror record for labor rectifications.
> 
> * **Managerial Payslip & Time Bank:** Calculation of earnings, hazard/unhealthiness bonuses, overtime matrix, and time bank compensation integrated with Accounts Payable.
> 
> * **Recruitment, Selection & Evaluation:** Kanban funnel for job openings, admission process with assisted form filling, competency-based performance evaluations, Individual Development Plan (IDP), and 100% anonymous eNPS survey (with a minimum floor of 5 respondents per department).

**4. Commercial Matrix of SaaS Plans & Feature Flags**
------------------------------------------------------

| **Domain / Feature**                      | **MEI / Basic (SaaS)** | **Pro / SMBs (SaaS)**   | **Enterprise / Corporate (B2B)**        |
| ----------------------------------------- | ---------------------- | ----------------------- | --------------------------------------- |
| **Sales Model**                           | Online Self-Service    | Self-Service / Assisted | Consultative / Dedicated Implementation |
| **Work Orders & CMMS**                    | ✅ Basic                | ✅ Full                  | ✅ Full + Advanced Checklists            |
| **Sales & Quotes**                        | ✅                      | ✅                       | ✅ + Advanced CRM                        |
| **Offline Counter POS**                   | ✅                      | ✅                       | ✅ Multi-Concurrent POS                  |
| **Financial Management & P&L**            | ✅                      | ✅                       | ✅ + Multi-level Cost Centers            |
| **Native PIX Billing**                    | ✅                      | ✅                       | ✅                                       |
| **Evidences & Legal Signature**           | —                      | ✅                       | ✅                                       |
| **Customer Portal (Self-Service)**        | ✅                      | ✅                       | ✅ with White-label / Custom Domain      |
| **Storage Quota**                         | **3 GB**               | **20 GB**               | **100 GB+ (Customizable)**              |
| **Fiscal Issuance (NFe/NFSe/NFCe)**       | —                      | ✅                       | ✅ + CT-e / MDF-e / Batch Issuance       |
| **Industrial Module (PCP & Costs)**       | —                      | Optional (Add-on)       | ✅ Full                                  |
| **WMS & Batch Tracking**                  | —                      | ✅                       | ✅                                       |
| **Fleet & Asset Management**              | —                      | ✅                       | ✅                                       |
| **Payroll, GPS REP-P Time Tracking & HR** | —                      | ✅                       | ✅                                       |
| **Multi-Branches / Concurrent Tax IDs**   | —                      | —                       | ✅ Unlimited                             |
| **Advanced Approval Limits Engine**       | —                      | Simple (Discount > 10%) | ✅ Parameterizable Multi-level           |
| **Accounting Export / SPED**              | —                      | ✅                       | ✅                                       |
| **Security & Mandatory MFA**              | —                      | Optional                | ✅ Mandatory with TOTP                   |

**5. Step-by-Step Development Execution (Chronological Timeline)**
------------------------------------------------------------------

### **Phase 1: Core Foundation, Database & Multi-Tenant Governance (Sprints 1 to 3)**

> * **Action:** Model migrations in PostgreSQL with UUIDs in public routes and create the GlobalScopeTenant in Laravel.
> 
> * **Why:** Ensures that no future module is built without security isolation constraints.
> 
> * **Deliverables:** Sanctum authentication, audit table (`sis_auditoria_logs`), tables for dynamic dropdown lists, and idempotency middleware.

### **Phase 2: Base Registries, Products, WMS & Purchasing (Sprints 4 to 6)**

> * **Action:** Build People domain (`pes_pessoas`), Items catalog (`pro_itens`), multi-warehouses (`wms_depositos`), and NF-e XML importer.
> 
> * **Why:** Provides the infrastructure of inputs and master data necessary for sales, services, and manufacturing.
> 
> * **Deliverables:** Registry with CPF/CNPJ (Tax ID) validation, batch/expiration control, internal stock transfers, and inbound supplier invoices.

### **Phase 3: Service Provision (CMMS), Sales & Counter POS (Sprints 7 to 9)**

> * **Action:** Implement full OS workflow with evidences/legal signature and POS frontend.
> 
> * **Why:** Delivers the most commercially appealing operational module for service providers and retail businesses.
> 
> * **Deliverables:** Quotes, orders, OS with technical report and photo uploads, signature collection (MP 2.200-2), OS PDF generation, and counter POS with atomic stock write-off.

### **Phase 4: Full Financial, PIX Billing & Controllership (Sprints 10 to 12)**

> * **Action:** Develop Accounts Payable/Receivable, EMV PIX Copy & Paste payload generator with QR Code, and analytical Managerial P&L (DRE).
> 
> * **Why:** Connects the invoicing of OS and Sales to the client company's financial health.
> 
> * **Deliverables:** Partial/total write-offs, bank statement, OFX reconciliation, cost centers, cash flow, and real-time P&L.

### **Phase 5: Integrated Fiscal Engine & Fleets/Assets (Sprints 13 to 15)**

> * **Action:** Implement `FiscalDriverInterface` with actual issuance of NF-e, NFS-e, and NFC-e, alongside vehicle tracking and asset capitalization.
> 
> * **Why:** Allows full legal operation for clients issuing tax documents and controlling corporate assets.
> 
> * **Deliverables:** XML signature with A1 certificate, SEFAZ transmission, CC-e, cancellation, KM/L tracking, and Assignment Term with QR Code.

### **Phase 6: Industrial Module (PCP) & Complete Human Resources (Sprints 16 to 18)**

> * **Action:** Develop Bill of Materials (BOM), Production Orders (OP), georeferenced REP-P time tracking, and R&S Kanban Funnel.
> 
> * **Why:** Enables serving industrial accounts and medium/large companies with a broad workforce.
> 
> * **Deliverables:** OP tracking with cost apportionment, loss calculation, GPS time clocking with immutable base, managerial payslips, and anonymous eNPS.

### **Phase 7: SaaS Monetization, Billing, Customer Portal & Commercial Polish (Sprints 19 to 21)**

> * **Action:** Develop plan billing engine (`sis_planos`), storage quota control, downgrade soft-lock, and Customer Portal.
> 
> * **Why:** Enables large-scale monetization in the self-service SaaS model and delivers the self-service channel to the end customer.
> 
> * **Deliverables:** Recurring subscription billing, public portal with temporary token for OS, upload storage lock, and accounting/SPED export.

**6. Success Validation and Acceptance Criteria**
-------------------------------------------------

| **Stage / Module**                 | **Testing and Validation Method**                                                                              | **Acceptance Criteria (Success)**                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Multi-Tenant Isolation**         | Automated HTTP test suite simulating an authenticated request from Tenant A trying to read data from Tenant B. | Mandatory return of HTTP 403 Forbidden or 404 Not Found on 100% of endpoints without exception.                    |
| **Financial Idempotency**          | Simultaneous duplicate sending of the same financial write-off request with the same Idempotency-Key.          | Single processing in the database; the second request returns the same payload without duplicating entries.        |
| **Digital OS Signature**           | Signature collection on the device screen and verification of the cryptographic payload.                       | Generation of the SHA-256 hash integrating latitude, longitude, IP, atomic date/time, and executed service data.   |
| **Fiscal Issuance (NF-e / NFS-e)** | Transmission in the SEFAZ/City Hall staging environment with different ICMS/ISS tax rates.                     | Document authorization returning a protocol, DANFE/PDF generation, and signed XML storage.                         |
| **Production Tracking**            | Completion of a Production Order for a composite item.                                                         | Automatic write-off of raw materials stock, finished product entry, and accurately recalculated average unit cost. |
| **Immutable Time Clock (REP-P)**   | Attempted direct update (UPDATE) via API on the original time clock record.                                    | Blocked at the service layer; rectifications are recorded exclusively in the auditable mirror table.               |
| **Downgrade Soft-Lock**            | Simulation of a corporate plan downgrading to basic in a tenant exceeding warehouses and users.                | Excess data remains preserved in Read-Only mode, blocking new insertions without causing integrity failures.       |

**7. Diagnostics and Immediate Problem Resolution**
---------------------------------------------------

> * **Problem: Sluggishness in financial reports and managerial P&L with large data volumes.**
>   _Diagnosis:_ Queries calculating balances of millions of records at runtime without indexed aggregations.
>   _Solution:_ Create materialized views or daily/monthly consolidation tables per tenant, updated asynchronously via Laravel Queues (Jobs).
> 
> * **Problem: Rejection in fiscal document transmission due to SEFAZ instability.**
>   _Diagnosis:_ Communication timeout or temporary unavailability of state servers.
>   _Solution:_ Activate automatic contingency (EPEC/SVC for NF-e or offline contingency for NFC-e) and reprocess the batch via an asynchronous queue as soon as connectivity is restored.
> 
> * **Problem: Upload attempt failing due to plan storage limit.**
>   _Diagnosis:_ Tenant reached the contracted GB ceiling (e.g., 3GB on the basic plan).
>   _Solution:_ Upload interceptor returns a friendly 402/422 error with a standardized payload indicating quota usage and a direct link for a storage upgrade.
> 
> * **Problem: Inventory inconsistency during simultaneous POS sales.**
>   _Diagnosis:_ Concurrency in balance write-off without transactional lock.
>   _Solution:_ Use atomic transactions with pessimistic locking (`DB::transaction` with `lockForUpdate()`) on the balance table per warehouse during sale checkout.

**8. Immediate Action Plan to Start Development**
-------------------------------------------------

> 1. Create the base Laravel project structure with PHP 8.4 and PostgreSQL.
> 
> 2. Define the migration for the Core layer: Tenants, Users, Roles, and Domain Tables for Dropdown Lists.
> 
> 3. Implement the GlobalScopeTenant and the first cross-isolation test suite.
