# DOCUMENTO MESTRE DO PROJETO — SCALLE ERP

**Versão:** 1.1 — Blindagem Arquitetural e Tributária  
**Estado de referência:** 0%  
**Objetivo:** especificar integralmente o Scalle ERP, do zero até um produto SaaS comercial, escalável e aplicável a empresas de qualquer porte e segmento.  
**Arquitetura-base:** Monólito Modular SaaS Multi-Tenant  
**Banco principal:** PostgreSQL

---

# 1. PROPÓSITO

Este documento é a especificação central do produto.

Ele deve permitir que:

- produto;
- arquitetura;
- UX/UI;
- backend;
- frontend;
- banco de dados;
- QA;
- DevOps;
- segurança;
- implantação;
- suporte;

consigam trabalhar sobre uma mesma definição.

O projeto é considerado **0%** independentemente do estado de versões, releases ou funcionalidades existentes anteriormente.

Nenhuma funcionalidade histórica será considerada automaticamente concluída.

---

# 2. VISÃO DO PRODUTO

O Scalle ERP deverá ser uma plataforma empresarial SaaS capaz de atender:

- MEI;
- microempresas;
- pequenas empresas;
- médias empresas;
- grandes empresas;
- grupos empresariais;
- empresas com múltiplas filiais;
- operações simples;
- operações complexas;
- empresas de serviços;
- comércio;
- indústria;
- distribuição;
- manutenção;
- logística;
- construção;
- projetos;
- operações híbridas.

A arquitetura não deverá obrigar uma empresa pequena a utilizar recursos corporativos complexos, mas deverá permitir crescimento sem migração estrutural do produto.

---

# 3. PRINCÍPIOS DO PRODUTO

1. Multi-tenant desde a fundação.
2. Segurança por padrão.
3. Modularidade.
4. Auditabilidade.
5. Configurabilidade.
6. Escalabilidade.
7. Integridade transacional.
8. API-first.
9. Automação.
10. Experiência de uso simples.
11. Compatibilidade com crescimento empresarial.
12. Nenhum módulo deve criar cadastros fundamentais duplicados sem necessidade.
13. Regras críticas devem ser explícitas e testáveis.
14. Dados não devem ser destruídos por downgrade, inadimplência ou desativação.
15. O sistema deve possuir trilha de auditoria para operações relevantes.

---

# 4. ARQUITETURA

## 4.1 Modelo

**Monólito Modular SaaS Multi-Tenant.**

A aplicação será inicialmente uma unidade operacional, porém organizada em módulos independentes.

Estrutura conceitual:

```text
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
```

## 4.2 Banco

PostgreSQL será o banco oficial de produção.

Motivos:

- robustez transacional;
- integridade referencial;
- concorrência;
- JSONB;
- índices avançados;
- extensibilidade;
- ecossistema;
- escalabilidade;
- possibilidade de pgvector para IA.

## 4.3 Evolução

A arquitetura deverá permitir posteriormente:

- workers independentes;
- cache distribuído;
- storage externo;
- filas;
- serviços especializados;
- banco dedicado;
- ambiente dedicado;
- extração de módulos críticos para serviços.

Microserviços não serão adotados prematuramente.

---

# 5. SAAS MULTI-TENANT

## 5.1 Estratégia inicial

Banco compartilhado + schema compartilhado + `tenant_id`.

## 5.2 Isolamento

Toda entidade pertencente a um tenant deverá possuir contexto de tenant.

Nenhuma consulta poderá ignorar o contexto.

## 5.3 Evolução Enterprise

Preparar para:

- schema dedicado;
- banco dedicado;
- infraestrutura dedicada;
- região dedicada;
- políticas específicas.

## 5.4 Estados do tenant

- trial;
- ativo;
- pagamento pendente;
- inadimplente;
- suspenso;
- bloqueado;
- cancelado;
- encerrado.

---


## 4.4 Blindagem de Tenant no Laravel

No backend Laravel, todo Model pertencente a tenant deverá utilizar `GlobalScopeTenant` no Eloquent como mecanismo obrigatório de isolamento.

O escopo deverá ser aplicado automaticamente aos Models multi-tenant e deverá:

- resolver o tenant a partir de contexto confiável;
- impedir consultas sem contexto de tenant;
- impedir criação sem `tenant_id`;
- impedir alteração/exclusão de registros de outro tenant;
- possuir testes automatizados de isolamento.

### Regra de ouro

**JAMAIS consultar tabelas de outro domínio via SQL direto.**

É proibido, em código de domínio, contornar o isolamento ou o encapsulamento usando `withoutGlobalScopes()`, `DB::table()`, `DB::select()` ou SQL bruto para acessar dados de outro domínio.

A comunicação intermódulos deverá utilizar:

- DTOs;
- Interfaces de Serviço;
- Application Services;
- Commands;
- Events;
- APIs internas, quando necessário.

Exemplo proibido:

```php
DB::table('finance_accounts')->where(...)->get();
```

Exemplo permitido:

```php
$receivable = $financeService->findReceivable(
    ReceivableQueryDTO::fromId($id)
);
```

Qualquer exceção deverá ficar restrita a infraestrutura explicitamente autorizada, documentada e auditada.

## 4.5 Database Boundary

O banco não deverá ser usado como contrato de integração entre módulos.

A estrutura interna das tabelas é propriedade do domínio que as possui.


## 5.5 Enforcement de Isolamento

O isolamento deverá existir em camadas:

```text
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
```

O cliente nunca poderá informar um `tenant_id` e obter, por isso, autorização para acessar aquele tenant.

Jobs, filas, eventos, cache, storage e integrações também deverão preservar o contexto correto.

## 5.6 Testes Obrigatórios de Multi-Tenancy

Deverão comprovar:

- Tenant A não lê Tenant B;
- Tenant A não altera Tenant B;
- Tenant A não exclui Tenant B;
- Tenant A não acessa arquivos de Tenant B;
- relacionamentos não permitem vazamento indireto;
- IDs não permitem enumeração indevida;
- APIs não aceitam `tenant_id` arbitrário do cliente;
- jobs preservam o tenant;
- eventos preservam o tenant;
- cache nunca mistura tenants.

# 6. CORE / FUNDAÇÃO

## 6.1 Responsabilidade

Fornecer serviços comuns a todos os módulos.

## 6.2 Componentes

- Tenant;
- Empresa;
- Filial;
- Usuário;
- Perfil;
- Permissão;
- Sessão;
- Configuração;
- Feature Flag;
- Auditoria;
- Storage;
- Notificações;
- Jobs;
- Filas;
- Cache;
- Eventos;
- Webhooks;
- Integrações;
- Observabilidade.

## 6.3 Identificadores

Usar UUID como identificador público.

Cada registro relevante deverá possuir:

- `id`;
- `created_at`;
- `updated_at`;
- `deleted_at` quando aplicável.

---

# 7. ORGANIZAÇÃO EMPRESARIAL

Hierarquia flexível:

```text
Tenant
└── Grupo Empresarial
    └── Empresa
        └── Filial
            └── Estabelecimento
```

Nenhum nível deverá ser obrigatório quando não fizer sentido.

## Empresa

Campos:

- razão social;
- nome fantasia;
- documento;
- inscrições;
- regime tributário;
- porte;
- endereço;
- contatos;
- atividade;
- status.

## Filial

Campos:

- empresa;
- código;
- nome;
- documento;
- endereço;
- inscrições;
- série fiscal;
- timezone;
- status.

---

# 8. IDENTIDADE

## 8.1 Usuário

Campos:

- nome;
- sobrenome;
- e-mail;
- telefone;
- senha;
- status;
- MFA;
- timezone;
- locale;
- avatar;
- último acesso.

## 8.2 Autenticação

Deverá suportar:

- login;
- logout;
- recuperação;
- verificação de e-mail;
- MFA;
- TOTP;
- códigos de recuperação;
- sessões;
- revogação;
- proteção contra brute force.

## 8.3 Preparação

- WebAuthn;
- Passkeys;
- SSO;
- integração corporativa.

---

# 9. AUTORIZAÇÃO

Modelo:

```text
Usuário
→ Perfil
→ Permissão
→ Contexto
```

Ações:

- visualizar;
- criar;
- editar;
- excluir;
- aprovar;
- cancelar;
- baixar;
- estornar;
- exportar;
- imprimir;
- administrar.

Escopos:

- tenant;
- empresa;
- filial;
- departamento;
- equipe;
- próprio usuário.

---

# 10. AUDITORIA

Registrar:

- usuário;
- tenant;
- ação;
- módulo;
- entidade;
- registro;
- valores anteriores;
- valores novos;
- IP;
- user-agent;
- request ID;
- correlation ID;
- data/hora.

Eventos críticos:

- autenticação;
- alteração de permissões;
- alterações financeiras;
- emissão fiscal;
- cancelamentos;
- aprovações;
- alterações de configuração;
- billing.

---

# 11. CONFIGURAÇÕES

Hierarquia:

```text
Sistema
→ Plano
→ Tenant
→ Empresa
→ Filial
→ Usuário
```

Configurações possíveis:

- moeda;
- idioma;
- timezone;
- numeração;
- séries;
- impostos;
- descontos;
- SLA;
- notificações;
- documentos;
- regras comerciais;
- parâmetros financeiros.

---


## 11.1 Listas Suspensas como Tabelas de Domínio

Valores configuráveis de negócio não deverão ser implementados como enums rígidos no banco.

Aplicam-se, conforme o domínio:

- status;
- categorias;
- tipos;
- motivos;
- prioridades;
- classificações;
- origens;
- naturezas;
- modalidades;
- situações operacionais.

Esses valores deverão ser tabelas de domínio, com `tenant_id` quando personalizáveis.

Campos recomendados:

- `id`;
- `tenant_id`;
- `code`;
- `name`;
- `description`;
- `sort_order`;
- `is_active`;
- `is_system`;
- `metadata`;
- `created_at`;
- `updated_at`;
- `deleted_at`.

Adicionar um novo parâmetro de negócio **não poderá exigir migration de schema**.

Valores sistêmicos poderão existir como registros protegidos, permitindo simultaneamente valores personalizados por tenant.

# 12. FEATURE FLAGS

Permitir ativação por:

- sistema;
- plano;
- tenant;
- empresa;
- usuário.

Feature flag não substitui permissão.

Acesso efetivo:

```text
Feature habilitada
+
Plano permite
+
Permissão permite
=
Acesso
```

---

# 13. WORKFLOW E APROVAÇÕES

Motor configurável.

Elementos:

- gatilho;
- condição;
- alçada;
- aprovador;
- sequência;
- prazo;
- aprovação;
- rejeição;
- justificativa;
- escalonamento;
- auditoria.

Aplicações:

- compras;
- vendas;
- descontos;
- pagamentos;
- contratos;
- OS;
- documentos;
- despesas.

---

# 14. CADASTROS MESTRES


## 14.0 Regra de Domínios Configuráveis

Cadastros mestres deverão utilizar tabelas de domínio para listas que possam variar por empresa ou evoluir ao longo do produto.

Não usar enum de banco para categorias, tipos, motivos, classificações, status configuráveis, prioridades, origens ou situações.

Enums de aplicação somente deverão ser utilizados para estados técnicos realmente invariáveis e estruturais.

## 14.1 Pessoas

- cliente;
- fornecedor;
- funcionário;
- contato;
- parceiro.

Dados:

- identificação;
- documentos;
- contatos;
- endereços;
- dados fiscais;
- relacionamentos;
- status;
- histórico.

## 14.2 Produtos

Campos:

- código;
- nome;
- descrição;
- tipo;
- unidade;
- categoria;
- grupo;
- marca;
- modelo;
- NCM;
- custo;
- preço;
- estoque mínimo;
- estoque máximo;
- lote;
- série;
- validade;
- status.

## 14.3 Serviços

- código;
- nome;
- descrição;
- unidade;
- preço;
- custo;
- tributação;
- SLA;
- categoria;
- status.

## 14.4 Unidades

- unidade de medida;
- conversões;
- casas decimais;
- regras de utilização.

---

# 15. CRM

## Entidades

- Lead;
- Contato;
- Cliente;
- Oportunidade;
- Atividade;
- Funil;
- Etapa;
- Campanha;
- Proposta.

## Funcionalidades

- captura;
- qualificação;
- distribuição;
- follow-up;
- tarefas;
- histórico;
- funil;
- forecast;
- conversão.

## Fluxo

```text
Lead
→ Qualificação
→ Oportunidade
→ Proposta
→ Negociação
→ Ganho/Perdido
```

---

# 16. COMERCIAL

## Entidades

- orçamento;
- proposta;
- pedido;
- tabela de preço;
- condição de pagamento;
- comissão;
- contrato.

## Fluxo

```text
Cliente
→ Orçamento
→ Aprovação
→ Pedido
→ Reserva
→ Faturamento
→ Financeiro
→ Fiscal
```

## Regras

- limite de desconto;
- alçada;
- crédito;
- estoque;
- comissão;
- impostos;
- condições comerciais.

---

# 17. COMPRAS

## Entidades

- requisição;
- cotação;
- fornecedor;
- mapa de cotação;
- pedido;
- recebimento.

## Fluxo

```text
Requisição
→ Cotação
→ Comparação
→ Aprovação
→ Pedido
→ Recebimento
→ Estoque
→ Fiscal
→ Financeiro
```

## Regras

- múltiplos fornecedores;
- menor preço;
- prazo;
- qualidade;
- aprovação;
- divergência;
- recebimento parcial.

---

# 18. ESTOQUE / WMS

## Entidades

- produto;
- depósito;
- endereço;
- saldo;
- lote;
- série;
- movimentação;
- transferência;
- reserva;
- inventário.

## Operações

- entrada;
- saída;
- ajuste;
- transferência;
- inventário;
- reserva;
- baixa;
- estorno.

## Controle

- FIFO/FEFO quando configurado;
- lote;
- validade;
- série;
- localização;
- saldo disponível;
- saldo reservado;
- saldo bloqueado.

## Critério crítico

Nenhuma concorrência poderá produzir saldo inconsistente.

---

# 19. FINANCEIRO

## Contas a pagar

- lançamento;
- parcela;
- aprovação;
- vencimento;
- pagamento;
- baixa;
- estorno.

## Contas a receber

- lançamento;
- parcela;
- cobrança;
- recebimento;
- baixa;
- estorno.

## Tesouraria

- caixa;
- banco;
- transferência;
- conciliação.

## Contabilidade gerencial

- plano de contas;
- centros de custo;
- categorias;
- DRE;
- fluxo de caixa.

## Regras

- origem do lançamento;
- histórico;
- competência;
- vencimento;
- liquidação;
- juros;
- multa;
- desconto;
- estorno;
- fechamento.

---

# 20. COBRANÇA / PIX

Fluxo:

```text
Cobrança
→ QR/Payload
→ Gateway
→ Webhook
→ Confirmação
→ Baixa
→ Conciliação
```

Requisitos:

- idempotência;
- assinatura;
- retry;
- logs;
- duplicidade;
- reconciliação.

---

# 21. FISCAL

Arquitetura desacoplada.

## Entidades

- documento fiscal;
- item fiscal;
- evento;
- certificado;
- regra;
- XML;
- contingência.

## Processos

- emissão;
- validação;
- assinatura;
- envio;
- retorno;
- autorização;
- rejeição;
- cancelamento;
- CC-e;
- inutilização;
- contingência;
- consulta;
- armazenamento.

O suporte fiscal deverá ser modular por documento, operação e aplicabilidade.

---


## 21.4 Reforma Tributária — CBS / IBS

O motor fiscal deverá nascer preparado para a coexistência e transição entre modelos tributários.

Deverá permitir representar, conforme vigência, operação e enquadramento:

- PIS;
- COFINS;
- ICMS;
- ISS;
- CBS;
- IBS;
- outros tributos ou componentes futuros.

As regras não deverão ficar espalhadas em `if/else` pelo sistema.

O cálculo deverá considerar:

```text
Tributo
+
Regra
+
Vigência
+
Enquadramento
+
Operação
+
Produto/Serviço
+
Localidade
+
Base de cálculo
+
Alíquota
+
Benefício/Exceção
```

## 21.5 Vigência Tributária

Toda regra fiscal relevante deverá suportar:

- data inicial;
- data final;
- tributo;
- regime;
- operação;
- parâmetros/fórmula.

Assim, regras anteriores e novas poderão coexistir durante a transição.

## 21.6 Split Payment

O motor fiscal/financeiro deverá possuir arquitetura preparada para Split Payment.

O modelo deverá conseguir representar:

```text
Valor bruto
 ↓
Componentes tributários
 ↓
Valor segregado/retido quando aplicável
 ↓
Valor líquido ao recebedor
```

Deverá suportar:

- cálculo;
- segregação;
- integração com meios de pagamento;
- conciliação;
- divergência;
- estorno;
- rastreabilidade;
- auditoria.

A implementação concreta deverá ser parametrizável conforme legislação, regulamentação, vigência e integração utilizada.

## 21.7 Componentes do Motor Fiscal

```text
FiscalEngine
├── TaxRuleResolver
├── TaxCalculator
├── TaxValidator
├── FiscalDocumentBuilder
├── FiscalEventProcessor
├── TaxTransitionResolver
└── SplitPaymentResolver
```

## 21.8 Testes Tributários

Deverão existir cenários para:

- regime anterior;
- transição;
- CBS;
- IBS;
- coexistência de tributos;
- alteração de vigência;
- exceções;
- mercadorias;
- serviços;
- devoluções;
- cancelamentos;
- contingência;
- Split Payment;
- divergências.

# 22. SERVIÇOS / OS / CMMS

## Entidades

- OS;
- cliente;
- técnico;
- equipe;
- agenda;
- SLA;
- ativo;
- material;
- evidência;
- laudo;
- assinatura;
- contrato.

## Fluxo

```text
Abertura
→ Triagem
→ Agendamento
→ Execução
→ Materiais
→ Evidências
→ Laudo
→ Aprovação
→ Encerramento
→ Financeiro
```

## Regras

- SLA;
- calendário;
- prioridade;
- equipe;
- técnico;
- materiais;
- assinatura;
- evidências;
- custo;
- faturamento.

---

# 23. INDUSTRIAL / PCP / MRP

## Entidades

- produto;
- BOM;
- versão;
- operação;
- recurso;
- máquina;
- operador;
- ordem de produção;
- apontamento;
- consumo;
- perda;
- custo.

## Fluxo

```text
Demanda
→ MRP
→ Planejamento
→ OP
→ Separação
→ Produção
→ Apontamento
→ Consumo
→ Acabado
→ Custos
```

## Regras

- versões da BOM;
- capacidade;
- lead time;
- estoque;
- perdas;
- refugo;
- rastreabilidade;
- custo.

---

# 24. FROTAS

Funcionalidades:

- veículos;
- motoristas;
- documentos;
- abastecimento;
- manutenção;
- pneus;
- viagens;
- custos;
- multas;
- alertas;
- telemetria quando integrada.

Integrações fiscais/logísticas quando aplicáveis.

---

# 25. ATIVOS / PATRIMÔNIO

Funcionalidades:

- cadastro;
- patrimônio;
- localização;
- responsável;
- movimentação;
- depreciação;
- manutenção;
- cautela;
- QR Code;
- baixa;
- histórico.

---

# 26. PROJETOS

Entidades:

- projeto;
- contrato;
- tarefa;
- equipe;
- recurso;
- apontamento;
- custo;
- orçamento;
- entrega.

Funcionalidades:

- cronograma;
- dependências;
- responsáveis;
- horas;
- custos;
- orçamento;
- margem;
- progresso;
- faturamento.

---

# 27. RH

Funcionalidades:

- colaboradores;
- vagas;
- recrutamento;
- seleção;
- competências;
- avaliações;
- PDI;
- treinamentos;
- desempenho;
- clima;
- pesquisas;
- Nine-Box.

---

# 28. DEPARTAMENTO PESSOAL

Funcionalidades:

- cadastro;
- jornada;
- escala;
- ponto;
- banco de horas;
- férias;
- 13º;
- benefícios;
- holerite;
- rescisão;
- integrações legais.

Dados deverão possuir acesso restrito e auditado.

---

# 29. GED

Funcionalidades:

- documentos;
- pastas;
- versões;
- categorias;
- permissões;
- assinatura;
- retenção;
- busca;
- vínculos;
- histórico.

Arquivos poderão ser vinculados a:

- cliente;
- fornecedor;
- funcionário;
- contrato;
- OS;
- pedido;
- documento fiscal;
- projeto;
- ativo.

---

# 30. PORTAL DO CLIENTE

Permitir:

- login;
- acompanhamento;
- aprovação;
- documentos;
- OS;
- orçamento;
- contratos;
- financeiro;
- pagamentos;
- PIX;
- assinatura;
- notificações.

---

# 31. BI

## Dashboards

Cada módulo deverá possuir indicadores próprios.

Exemplos:

### Comercial
- vendas;
- conversão;
- ticket médio;
- margem;
- forecast.

### Financeiro
- faturamento;
- recebimento;
- inadimplência;
- fluxo;
- margem.

### Estoque
- giro;
- cobertura;
- ruptura;
- inventário;
- perdas.

### Serviços
- OS;
- SLA;
- produtividade;
- custo;
- reincidência.

### Industrial
- produção;
- OEE quando aplicável;
- perdas;
- eficiência;
- capacidade.

---

# 32. RELATÓRIOS

Relatórios deverão possuir:

- filtros;
- período;
- empresa;
- filial;
- usuário;
- exportação;
- impressão;
- permissões;
- agendamento quando aplicável.

Formatos:

- PDF;
- XLSX;
- CSV;
- JSON.

---

# 33. API

Padrão:

```text
/api/v1
```

Recursos deverão possuir:

- autenticação;
- autorização;
- paginação;
- filtros;
- ordenação;
- validação;
- erros padronizados;
- rate limiting;
- idempotência quando necessário;
- versionamento.

Resposta:

```json
{
  "data": {},
  "meta": {},
  "request_id": "..."
}
```

Erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {}
  },
  "request_id": "..."
}
```

---

# 34. INTEGRAÇÕES

Toda integração deverá possuir:

- contrato;
- autenticação;
- credenciais;
- timeout;
- retry;
- backoff;
- logs;
- idempotência;
- monitoramento;
- documentação;
- versionamento.

Categorias:

- bancos;
- pagamentos;
- fiscal;
- contabilidade;
- e-commerce;
- marketplaces;
- logística;
- comunicação;
- assinatura;
- armazenamento;
- identidade.

---

# 35. EVENTOS E WEBHOOKS

Eventos internos:

- TenantCreated;
- UserCreated;
- OrderCreated;
- OrderApproved;
- StockMoved;
- PaymentConfirmed;
- InvoiceAuthorized;
- ServiceOrderClosed;
- SubscriptionChanged.

Webhooks externos deverão possuir:

- assinatura;
- segredo;
- eventos;
- tentativas;
- resposta;
- retry;
- logs.

---

# 36. NOTIFICAÇÕES

Canais:

- in-app;
- e-mail;
- WhatsApp;
- push.

Recursos:

- templates;
- preferências;
- filas;
- retry;
- histórico;
- status de entrega.

---

# 37. PWA

Deverá permitir:

- instalação;
- responsividade;
- cache;
- notificações;
- experiência mobile;
- recursos offline quando aplicáveis.

---

# 38. OFFLINE

Arquitetura preparada para:

- IndexedDB;
- fila local;
- sincronização;
- conflitos;
- timestamps;
- idempotência.

Prioridade inicial:

- OS;
- coleta de dados;
- leitura;
- apontamentos;
- evidências.

---

# 39. TEMPO REAL

Possibilidades:

- SSE;
- WebSocket quando necessário;
- notificações;
- dashboards;
- status de jobs;
- acompanhamento operacional.

---

# 40. IA

A IA será uma camada transversal.

Possibilidades:

- busca semântica;
- classificação;
- OCR;
- extração;
- assistente;
- análise financeira;
- previsão;
- recomendação;
- automação;
- geração de relatórios;
- detecção de anomalias.

Nenhuma automação crítica deverá executar operação irreversível sem política de autorização adequada.

---

# 41. SAAS / BILLING

## Entidades

- plano;
- assinatura;
- recurso;
- limite;
- consumo;
- cobrança;
- fatura;
- pagamento;
- evento.

## Planos

O modelo deverá permitir:

- plano gratuito/trial;
- planos pagos;
- módulos adicionais;
- usuários adicionais;
- consumo;
- armazenamento;
- recursos Enterprise.

## Fluxo

```text
Cadastro
→ Trial
→ Plano
→ Assinatura
→ Cobrança
→ Pagamento
→ Ativação
→ Consumo
→ Renovação
```

---

# 42. LIMITES POR PLANO

Possíveis limites:

- usuários;
- empresas;
- filiais;
- storage;
- documentos;
- APIs;
- integrações;
- volume;
- módulos;
- automações.

Limites deverão ser configuráveis.

---

# 43. DOWNGRADE / UPGRADE

Upgrade:

- ativação imediata ou conforme política;
- cobrança proporcional quando aplicável.

Downgrade:

- não apagar dados;
- preservar histórico;
- bloquear apenas novos usos que excedam o plano.

---

# 44. SEGURANÇA

Requisitos:

- HTTPS;
- secrets seguros;
- hash de senhas;
- MFA;
- RBAC;
- rate limiting;
- proteção de sessão;
- auditoria;
- isolamento de tenant;
- validação de entrada;
- proteção de APIs;
- headers de segurança;
- gestão de dependências;
- análise de vulnerabilidades.

---

# 45. LGPD

Deverá existir estrutura para:

- finalidade;
- consentimento quando aplicável;
- base legal;
- minimização;
- retenção;
- anonimização;
- exportação;
- solicitação de titular;
- exclusão quando juridicamente aplicável;
- auditoria;
- controle de acesso.

---

# 46. OBSERVABILIDADE

Métricas:

- CPU;
- memória;
- latência;
- erros;
- banco;
- cache;
- filas;
- jobs;
- storage;
- integrações;
- autenticação;
- consumo por tenant.

Logs deverão possuir:

- timestamp;
- nível;
- serviço/módulo;
- request ID;
- correlation ID;
- tenant;
- usuário quando aplicável.

---

# 47. INFRAESTRUTURA

Ambientes:

- desenvolvimento;
- teste;
- homologação;
- produção.

Componentes:

- aplicação;
- banco;
- cache;
- filas;
- workers;
- storage;
- CDN quando necessário;
- monitoramento.

---

# 48. CI/CD

Pipeline:

```text
Commit
→ Lint
→ Testes
→ Build
→ Security Scan
→ Package
→ Deploy
→ Smoke Test
→ Monitoramento
```

Deverá permitir rollback.

Migrations deverão ser controladas.

---

# 49. BACKUP

Backup deverá contemplar:

- banco;
- arquivos;
- configurações;
- metadados.

Definir:

- frequência;
- retenção;
- criptografia;
- armazenamento;
- restauração;
- RPO;
- RTO.

Restauração deverá ser testada periodicamente.

---

# 50. DISASTER RECOVERY

Deverá existir plano para:

- indisponibilidade do servidor;
- falha do banco;
- perda de storage;
- corrupção;
- incidente de segurança;
- falha de deploy;
- indisponibilidade de integração.

---

# 51. ESCALABILIDADE

Preparar para:

- múltiplas instâncias;
- load balancer;
- workers horizontais;
- cache distribuído;
- banco escalável;
- storage externo;
- filas;
- CDN.

---

# 52. QA

Cada funcionalidade deverá possuir:

- teste unitário;
- integração;
- API;
- autorização;
- multitenant;
- regressão;
- erro;
- concorrência quando necessário;
- homologação.

---

# 53. TESTES DE SEGURANÇA

Obrigatórios:

- acesso cruzado entre tenants;
- privilege escalation;
- brute force;
- sessão;
- arquivos;
- APIs;
- injeção;
- validações;
- CSRF quando aplicável;
- XSS;
- controle de permissões.

---

# 54. TESTES DE CARGA

Deverão avaliar:

- login;
- dashboard;
- consultas;
- gravações;
- APIs;
- jobs;
- filas;
- relatórios;
- operações concorrentes.

---

# 55. HOMOLOGAÇÃO

Cada módulo deverá possuir ambiente de homologação.

Fluxo:

```text
Desenvolvimento
→ QA
→ Homologação
→ Aprovação
→ Produção
```

---

# 56. ONBOARDING

Fluxo:

```text
Cadastro
→ Verificação
→ Tenant
→ Plano
→ Empresa
→ Usuário
→ Configuração
→ Importação
→ Treinamento
→ Homologação
→ Ativação
```

---

# 57. MIGRAÇÃO DE DADOS

Deverá existir:

- importação;
- mapeamento;
- validação;
- prévia;
- erros;
- logs;
- rollback quando possível;
- relatório de migração.

Fontes possíveis:

- Excel;
- CSV;
- APIs;
- bancos;
- outros ERPs.

---

# 58. SUPORTE

Deverá existir:

- chamados;
- prioridades;
- SLA;
- categorias;
- responsáveis;
- histórico;
- base de conhecimento;
- incidentes;
- problemas;
- mudanças.

---

# 59. DOCUMENTAÇÃO

Documentos obrigatórios:

- arquitetura;
- API;
- banco;
- módulos;
- implantação;
- configuração;
- segurança;
- backup;
- recuperação;
- usuário;
- administrador;
- suporte.

---

# 60. MODELO COMERCIAL

O Scalle deverá permitir comercialização:

- por plano;
- por usuário;
- por empresa;
- por módulo;
- por consumo;
- por storage;
- Enterprise sob contrato.

A arquitetura de billing deverá ser independente dos módulos de negócio.

---

# 61. CRITÉRIO DE 100%

O Scalle somente será considerado 100% comercial quando:

- requisitos definidos;
- arquitetura validada;
- Core funcional;
- multitenant validado;
- segurança validada;
- cadastros completos;
- módulos operacionais;
- integrações críticas;
- fiscal aplicável homologado;
- financeiro validado;
- QA concluído;
- backup validado;
- restauração validada;
- monitoramento ativo;
- documentação completa;
- onboarding pronto;
- suporte pronto;
- billing pronto;
- produção estável;
- operação comercial validada.

---

# 62. DEFINITION OF DONE

Uma funcionalidade somente poderá ser marcada como pronta quando:

1. requisito definido;
2. regra de negócio definida;
3. UX definida;
4. banco definido;
5. backend implementado;
6. frontend implementado;
7. permissões implementadas;
8. auditoria definida;
9. integrações implementadas;
10. testes aprovados;
11. documentação atualizada;
12. homologação aprovada;
13. deploy realizado;
14. monitoramento disponível.

---

# 63. MATRIZ 0% → 100%

| Domínio | Especificação | Projeto | Desenvolvimento | QA | Homologação | Produção | Comercial |
|---|---|---|---|---|---|---|---|
| Core | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Identity | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Organization | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Cadastros | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Workflow | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CRM | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Comercial | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Compras | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Estoque/WMS | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Financeiro | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Fiscal | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Serviços | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Industrial | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Frotas | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Ativos | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Projetos | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RH | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| DP | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| GED | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Portal | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| BI | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| API | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Integrações | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SaaS/Billing | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Segurança | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| LGPD | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| DevOps | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| QA | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Implantação | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Suporte | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

# 64. ORDEM OFICIAL DE CONSTRUÇÃO

A ordem recomendada é:

1. Arquitetura e padrões;
2. Core;
3. Multi-tenancy;
4. Identity;
5. Authorization;
6. Organização;
7. Cadastros;
8. Configurações;
9. Workflow;
10. CRM;
11. Comercial;
12. Compras;
13. Estoque;
14. Financeiro;
15. Fiscal;
16. Serviços;
17. Industrial;
18. Frotas;
19. Ativos;
20. Projetos;
21. RH;
22. DP;
23. GED;
24. Portal;
25. BI;
26. APIs;
27. Integrações;
28. SaaS/Billing;
29. Segurança/LGPD;
30. DevOps;
31. QA;
32. Implantação;
33. Suporte;
34. PWA/Offline;
35. Tempo real;
36. IA.

---

# 65. REGRA DE GOVERNANÇA DO DOCUMENTO

Qualquer alteração relevante deverá registrar:

- requisito;
- motivo;
- impacto;
- módulos afetados;
- banco afetado;
- APIs afetadas;
- testes afetados;
- documentação afetada.

Nenhuma mudança de regra crítica deverá ocorrer apenas no código.

---


# 66. BLINDAGENS ARQUITETURAIS OBRIGATÓRIAS

Estas regras possuem aplicação transversal sobre todos os módulos.

## 66.1 Isolamento

**Nenhum dado de tenant poderá ser acessado sem contexto válido.**

## 66.2 Comunicação entre Domínios

**JAMAIS consultar tabelas de outro domínio diretamente via SQL.**

O banco não é contrato de integração entre módulos.

## 66.3 Configuração

Valores de negócio configuráveis devem ser dados, não alterações de schema.

## 66.4 Fiscal

A tributação deverá ser:

- desacoplada;
- parametrizável;
- versionável;
- orientada por vigência;
- preparada para coexistência de modelos;
- preparada para CBS/IBS;
- preparada para Split Payment;
- testável independentemente dos módulos consumidores.

## 66.5 Checklist de Blindagem

- [ ] `GlobalScopeTenant` aplicado aos Models multi-tenant.
- [ ] Testes de isolamento entre tenants.
- [ ] Nenhum acesso SQL direto a tabelas de outro domínio.
- [ ] Comunicação por DTOs/interfaces/serviços/eventos.
- [ ] Listas configuráveis modeladas como tabelas de domínio.
- [ ] Inclusão de parâmetros não exige migration de schema.
- [ ] Regras fiscais possuem vigência.
- [ ] Regras fiscais suportam coexistência tributária.
- [ ] CBS/IBS previstos na arquitetura.
- [ ] Split Payment previsto na arquitetura.
- [ ] Jobs preservam tenant.
- [ ] Cache preserva tenant.
- [ ] Storage preserva tenant.
- [ ] APIs não confiam em `tenant_id` enviado pelo cliente.

# 67. CONCLUSÃO

Este documento representa a definição do Scalle ERP como produto.

O ponto de partida é:

> **0%**

O objetivo final é:

> **ERP SaaS comercial, multi-tenant, modular, seguro, escalável e capaz de atender empresas de qualquer porte e segmento.**

O projeto não deverá ser considerado completo simplesmente porque todas as telas existem.

**100% significa produto operacional, testado, seguro, documentado, implantável, suportável e comercializável.**
