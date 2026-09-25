===========================================================================================================================
📄 **GO-LIVE ROADMAP - SCALLE ERP (V4.0 - RUMO À MATURIDADE ENTERPRISE)**
===========================================================================================================================
===========================================================================================================================

**⚠️ AVISO IMPORTANTE:** _Este roadmap destina-se estritamente como um guia estratégico para as etapas finais de Go-Live e alcance da maturidade Enterprise. Ele consolida as conquistas atuais e mapeia os requisitos faltantes cruzados com o Documento Master de Especificação._

**Objetivo:** Prontidão Comercial 100% B2B e SaaS Self-Service (Tier Enterprise)
**Arquitetura:** Monolito Modular Multi-Tenant (Padrão Gemini) com RBAC

---

### 1. RAIO-X DO CÓDIGO (O QUE JÁ TEMOS CONSOLIDADO 🟢)

A espinha dorsal do ERP já está construída e operante no backend, respeitando rigorosamente o isolamento por `tenant_id` e a blindagem com UUIDs:

* **Core & SaaS:** Autenticação (Sanctum/TOTP), Assinaturas, Webhooks Asaas, Soft-Lock e isolamento `GlobalScopeTenant`.
* **RH & Folha (DP):** Cadastro de funcionários, ponto georreferenciado (MTP 671), holerites em PDF e avaliação de clima (eNPS).
* **Serviços (CMMS):** Ciclo de vida de Ordens de Serviço (OS), cálculo de SLA, laudos técnicos e assinatura digital com hash (MP 2.200-2).
* **WMS & Indústria (PCP):** Catálogo unificado, múltiplos depósitos, transferências atômicas, movimentação de estoque, BOM e Ordens de Produção (MRP).
* **Comercial & Financeiro:** Funil Inbound CRM, orçamentos, contas bancárias e liquidação de faturas (Contas a Pagar/Receber).
* **Frotas:** Gestão de veículos, motoristas e controle atômico de abastecimentos integrado ao financeiro.
* **Governança:** Listas suspensas (taxonomia) rodando dinamicamente na tabela `sis_tabelas_dominio`.
* **Motor Fiscal:** Upload de certificado A1 (AES-256), geração de XML e orquestração assíncrona via filas/Jobs.
* **Projetos (PMO Enterprise):** Kanban corporativo com Drag and Drop, Blockers (dependências), Checklists, Gantt, Gestão de Capacidade e Timesheet.
* **Cofre Digital (GED/EDMS):** Upload isolado e seguro de arquivos, plenamente integrado às tarefas do PMO e Ordens de Serviço.

---

### 2. O GAP PARA A MATURIDADE ENTERPRISE (O QUE FALTA 🔴)

Para que o Scalle ERP atenda desde microempresas até grandes indústrias corporativas (em conformidade absoluta com o Documento Master), as seguintes funcionalidades precisam ser implementadas:

#### Core, Multi-Tenant & SaaS
- [ ] **Onboarding Automatizado:** Importador em lote (CSV/Excel) para carga inicial de Pessoas e Catálogo de Itens.
- [ ] **SSO / Enterprise Login:** Integração OAuth2 com Google Workspace e Microsoft Entra ID.
- [ ] **SaaS Prorata:** Cálculo financeiro proporcional (prorata) para Upgrades e Downgrades de planos durante o ciclo vigente.

#### Comercial, CRM & Serviços
- [ ] **Gestão de Contratos de Recorrência:** Criação de contratos comerciais vinculados ao CRM e PMOC, gerando faturamento automático mensal.
- [ ] **Assinatura Digital Expandida:** Aplicar a assinatura com validade jurídica (MP 2.200-2) nativa também no aceite de Propostas Comerciais/Orçamentos.

#### Suprimentos & WMS
- [ ] **Requisição de Compras:** Implementar o fluxo de demanda interna (solicitações de departamentos) antes da etapa de cotação com fornecedores.

#### Controladoria (Financeiro & Fiscal)
- [ ] **Estrutura Contábil:** Implementação de Plano de Contas e Centros de Custo hierárquicos.
- [ ] **DRE & Conciliação:** Geração da DRE (Demonstração do Resultado do Exercício) e motor de leitura OFX para conciliação bancária.
- [ ] **Eventos Fiscais (SEFAZ):** Homologação final e rotas para Carta de Correção (CC-e), Cancelamento, Inutilização de numeração, além da emissão de CT-e/MDF-e para a logística.

#### Indústria (PCP) & Frotas
- [ ] **OEE (Overall Equipment Effectiveness):** Cadastro de Máquinas/Recursos para medição exata da capacidade e eficiência produtiva.
- [ ] **Controle Expandido de Frotas:** Registro de multas de trânsito, controle de vida útil de pneus e rotinas de manutenção preditiva.

#### RH, Portal do Cliente & BI
- [ ] **Workflow DP:** Rotinas de concessão de Férias, cálculo de 13º salário e fluxos de Rescisão.
- [ ] **GED Compliance:** Versionamento de arquivos (v1, v2) e políticas de retenção/expiração (LGPD).
- [ ] **Portal Self-Service Financeiro:** Área para o cliente final emitir 2ª via de boletos, faturas em aberto e visualizar contratos vigentes.
- [ ] **Gerador Dinâmico de Relatórios:** Motor onde o próprio usuário aplica filtros personalizados e exporta dados consolidados em XLSX/PDF.

---

### 3. LINHA DO TEMPO CRONOLÓGICA DAS SPRINTS

#### 🚀 Sprint 1: Front-End React e PWA (Concluída / Em Polimento)
* **Status:** Layout administrativo construído; dashboards modulares criados; roteamento e RBAC implantados no React. Faltam pequenos refinamentos de UI e PWA Offline-First para técnicos de campo.

#### 🚀 Sprint 2: Fechamento do Core, PMO & GED (Concluída)
* **Status:** Gestão de projetos consolidada (Gantt, Timesheet, Entregáveis); GED blindado com S3/Local; Integrações financeiras do PMO ativas.

#### 🚀 Sprint 3: Controladoria, Motor Fiscal & Onboarding (Próximo Alvo)
* **Objetivo:** Estabelecer a operação fiscal e contábil definitiva.
* **Passos:**
  1. Implementar Plano de Contas, Centro de Custo, Conciliação OFX e DRE.
  2. Homologar eventos da SEFAZ (Cancelamento, CC-e) com Certificado A1.
  3. Criar o Importador de Dados (CSV/Excel) para Onboarding de novos Tenants.

#### 🚀 Sprint 4: Lapidação Enterprise & Contratos
* **Objetivo:** Preparar a plataforma para atender grandes corporações.
* **Passos:**
  1. Construir a Gestão de Contratos de Recorrência (CRM e Manutenção).
  2. Implementar Requisição de Compras e OEE no PCP.
  3. Expandir o Workflow do DP (Férias e Rescisão) e a gestão avançada de Frotas (Multas e Pneus).

#### 🚀 Sprint 5: BI, Portal do Cliente & Go-Live Comercial
* **Objetivo:** Entregar autonomia aos clientes finais e inteligência aos gestores.
* **Passos:**
  1. Finalizar o Gerador Dinâmico de Relatórios.
  2. Disponibilizar a visão financeira (faturas) e de contratos no Portal do Cliente.
  3. Implementar SSO (Google/Microsoft) e políticas de retenção do GED (LGPD).
