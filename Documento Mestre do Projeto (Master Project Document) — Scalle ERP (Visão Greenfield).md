# **DOCUMENTO MESTRE DO PROJETO (MASTER PROJECT DOCUMENT)**

## **Scalle ERP — Blueprint Arquitetural, Engenharia, Módulos Comerciais e Governança**

**Versão do Documento:** 2.0.0 (Visão Comercial Completa — Do Zero ao Enterprise)  
**Tipo de Produto:** ERP Multi-Tenant Híbrido (SaaS Self-Service & Venda Consultiva B2B Corporativa)  
**Classificação:** Documento Oficial de Engenharia e Especificação de Produto

## **1\. Pré-requisitos e Filosofia Arquitetural**

### **1.1 Diretrizes Fundamentais**

O **Scalle ERP** foi projetado para competir diretamente com soluções consolidadas de mercado (como Omie, Bling, Tiny, Protheus e Sankhya), atendendo com a mesma base de código desde o MEI/Microempreendedor até indústrias e redes multi-filiais de grande porte.

> * **Backend Monólito Modular em PHP 8.4 \+ Laravel:** API RESTful robusta, desacoplada em domínios herméticos com injeção de dependência estrita, DTOs imutáveis e interfaces de serviço. O PHP moderno com OPcache e JIT garante alto desempenho com baixo custo de infraestrutura.  
> * **Banco de Dados PostgreSQL:** Modelagem relacional estrita com UUIDs como chaves públicas (blindagem de IDs sequenciais internos), suporte nativo a JSONB para configurações customizadas e indexação B-Tree/GIN de alto desempenho.  
> * **Multi-Tenancy Híbrido com Isolamento Global (Row-Level Security / Global Scope):** Isolamento lógico hermético por empresa\_id gerenciado em nível de ORM (GlobalScopeTenant) e tabelas de parametrização para listas suspensas (Dropdowns como Tabelas), garantindo escalabilidade sem mutação de schema.  
> * **Desacoplamento e Compatibilidade Retroativa:** Proibição expressa de queries SQL cruzadas entre tabelas de módulos distintos. Toda migração de banco deve ser incremental (aditiva), sem comandos destrutivos (drop column), preservando contratos de API versionados.

### **1.2 Alertas Críticos de Segurança e Anti-Padrões (O que NÃO fazer)**

> * **NÃO** expor IDs sequenciais autoincrementais em rotas públicas ou payloads de resposta.  
> * **NÃO** consultar dados de outro módulo via query direta no banco de dados sem utilizar a interface de serviço ou DTO dedicado do domínio de origem.  
> * **NÃO** armazenar senhas ou segredos fiscais (certificados digitais) sem criptografia simétrica (AES-256) atrelada à chave do tenant.  
> * **NÃO** permitir exclusão física (Hard Delete) de registros com relevância fiscal, trabalhista ou contábil. Toda exclusão deve ser lógica (Soft Delete) com guarda histórica obrigatória de no mínimo 5 anos.

## **2\. Diagrama Arquitetural de Domínios do Sistema**

                                `┌────────────────────────────────────────────────────────┐`  
                                `│             CAMADA CORE & GOVERNANÇA SAAS              │`  
                                `│ Auth (Sanctum/OAuth2) | GlobalScopeTenant | ACL/Roles  │`  
                                `│ Idempotência | Trilha de Auditoria | DTOs Blindados    │`  
                                `│ Billing & Assinaturas | Gestão de Planos & Cotas Storage│`  
                                `└───────────────────────────┬────────────────────────────┘`  
                                                            `│`  
                `┌───────────────────────────────────────────┼───────────────────────────────────────────┐`  
                `▼                                           ▼                                           ▼`  
       `🛠️ PRESTAÇÃO DE SERVIÇOS & CMMS              🏬 COMÉRCIO, VENDAS & PDV                 🏭 INDÚSTRIA & PCP`  
 `- Gestão Completa de OS & Ciclo de Vida       - Vendas Balcão / PDV Offline First        - Estrutura de Produtos (BOM Multinível)`  
 `- Checklist & Roteiros Preventivos/Corretivos- Orçamentos, Propostas & Pedidos          - Ordens de Produção (OP) & Apontamento`  
 `- Evidências Fotográficas (Antes/Depois)      - Gestão de Comissões Multinível           - Apropriação de Custos (MOD + CIF)`  
 `- Assinatura Digital Jurídica (MP 2.200-2)    - Tabela de Preços Dinâmica por Canal      - Controle Analítico de Refugo e Perdas`  
 `- Portal do Cliente (Self-Service de OS)      - CRM & Funil de Negociações               - Rastreabilidade de Lotes de Produção`  
                `│                                           │                                           │`  
                `└───────────────────────────────────────────┼───────────────────────────────────────────┘`  
                                                            `│`  
                `┌───────────────────────────────────────────┴───────────────────────────────────────────┐`  
                `▼                                                                                       ▼`  
       `📦 SUPRIMENTOS, WMS & LOGÍSTICA                                                 💰 FINANCEIRO, FISCAL & CONTROLADORIA`  
 `- Compras, Cotações & Pedidos de Fornecedor                                      - Contas a Pagar / Contas a Receber / Baixa Parcial`  
 `- Importador Inteligente de XML de NF-e (Entradas)                              - Cobrança PIX Nativa (EMV/QR Code) & Boletos/Cartão`  
 `- Multi-Depósitos, Almoxarifados & Localizações                                  - Conciliação Bancária OFX / Open Finance`  
 `- Rastreabilidade de Lote, Série e Validade                                      - DRE Gerencial, Centros de Custo & Fluxo de Caixa`  
 `- Gestão de Frotas, Abastecimento KM/L & CTe                                     - Engine Fiscal Plena (NF-e, NFS-e, NFC-e, MDF-e, CTe)`  
 `- Ativos Patrimoniais, Depreciação & Cautela                                     - Exportação Fiscal/Contábil (SPED Fiscal/Folha/Domínio)`  
                `│                                                                                       │`  
                `└───────────────────────────────────────────┬───────────────────────────────────────────┘`  
                                                            `▼`  
                                `┌────────────────────────────────────────────────────────┐`  
                                `│             👥 RECURSOS HUMANOS, DP & TALENTOS         │`  
                                `│ Ficha Cadastral | Jornadas, Escalas & Ponto REP-P GPS  │`  
                                `│ Banco de Horas | Holerite Gerencial | Cautela de EPIs  │`  
                                `│ R&S Funil Kanban | Avaliação de Desempenho & PDI       │`  
                                `│ Pesquisa de Clima Organizacional & eNPS Anônimo        │`  
                                `└────────────────────────────────────────────────────────┘`

## **3\. Especificação Completa dos Módulos do Sistema**

### **3.1 Camada Core, Segurança e Governança Multi-Tenant**

> * **Autenticação & Autorização:** Autenticação stateless via Laravel Sanctum / OAuth2, suporte a múltiplos estabelecimentos/filiais no mesmo login e controle granular de permissões baseado em papéis (ACL / CheckRole).  
> * **Isolamento Hermético (GlobalScopeTenant):** Escopo forçado no Eloquent ORM que injeta automaticamente WHERE empresa\_id \= ? em 100% das leituras e gravações, impedindo vazamento de dados inter-tenant.  
> * **Trilha de Auditoria & Idempotência:** Tabela centralizada (sis\_auditoria\_logs) para rastrear mutações (quem, quando, IP, valores anteriores e novos). Header Idempotency-Key obrigatório em requisições de mutação financeira e fiscal para evitar duplicidade de operações.  
> * **Listas Suspensas como Tabelas:** Todas as categorias, status, motivos e parâmetros dinâmicos são modelados em tabelas de domínio do tenant, garantindo escalabilidade e personalização corporativa.

### **3.2 Prestação de Serviços, Field Service & CMMS**

> * **Ciclo de Vida de Ordens de Serviço:** Abertura, diagnóstico técnico, aprovação comercial, execução, validação de garantia e encerramento com baixa automática de estoque de peças.  
> * **Evidências Fotográficas & Assinatura Digital:** Coleta de fotos com compressão e armazenamento otimizado. Assinatura do cliente na tela do celular/tablet com coleta de metadados comprobatórios (Geolocalização, IP de conexão, Timestamp atômico e Hash criptográfico SHA-256) em conformidade com a MP 2.200-2/2001.  
> * **Portal do Cliente (Self-Service):** Link temporário público seguro para o cliente final aprovar orçamentos de OS, visualizar laudos técnicos com fotos e efetuar o pagamento via PIX integrado.

### **3.3 Comércio, Vendas & PDV Balcão**

> * **PDV Balcão (Offline First):** Frente de caixa ágil, compatível com leitores de código de barras, impressoras térmicas (ESC/POS) e contingência local com sincronização automática em lote.  
> * **Gestão Comercial & CRM:** Funil de vendas, orçamentos inteligentes, controle de comissões por vendedor/técnico e regras de desconto com trava de alçada parametrizada.  
> * **Tabelas de Preço Múltiplas:** Suporte a preços diferenciados por canal de venda (Atacado, Varejo, Balcão e B2B Corporativo).

### **3.4 Indústria, Engenharia de Produto & PCP**

> * **Estrutura de Produtos (BOM Multinível):** Ficha técnica detalhada com consumo de matéria-prima, componentes intermediários e insumos fracionados.  
> * **Ordens de Produção (OP):** Planejamento, reserva atômica de insumos, apontamento de tempos de mão de obra direta (MOD) e centros de custo fabris (CIF).  
> * **Custo Apurado & Gestão de Refugo:** Recálculo do custo médio unitário do produto acabado após a finalização da OP e apontamento analítico de desperdício/sucata.

### **3.5 Suprimentos, Compras, WMS & Logística**

> * **Compras & Cotações:** Mapa comparativo de cotações com múltiplos fornecedores e pedidos de compra atrelados à conferência de recebimento.  
> * **Importador Inteligente de XML:** Leitura automática de NF-e de entrada, vinculação inteligente de itens, conversão automática de unidades de medida e lançamento no Contas a Pagar.  
> * **WMS & Multi-Depósitos:** Controle fracionado de estoques por almoxarifado, endereçamento logístico e transferências internas nos modos Direto e Em Trânsito.  
> * **Rastreabilidade de Lote, Série e Validade:** Controle rigoroso de validade (FEFO/FIFO), números de série para garantia e bloqueio automático de itens vencidos.  
> * **Gestão de Frotas & Ativos:** Controle de veículos, odômetro/KM, consumo médio KM/L integrado ao Financeiro, tombamento de ativos patrimoniais, depreciação linear automática e Termo de Cautela Digital com QR Code para ferramentas.

### **3.6 Financeiro, Cobrança, Conciliação & Controladoria**

> * **Contas a Pagar & Receber:** Gestão de títulos com parcelamentos, juros, multas, descontos, retenções de impostos e baixa parcial ou em lote.  
> * **Cobrança Integrada:** Geração nativa de PIX EMV (Copia e Cola \+ QR Code dinâmico com CRC16), emissão de boletos bancários registrados e integração com gateways de cartão.  
> * **Conciliação Bancária:** Importador de arquivos OFX bancários e preparação para integração via Open Finance com conciliação automática de lançamentos.  
> * **DRE Gerencial & Fluxo de Caixa:** Demonstração do Resultado do Exercício analítico por regime de competência e caixa, com segregação por centro de custo e plano de contas estruturado.  
> * **Ponte Contábil Externa:** Geração de arquivos padronizados para contabilidades externas (SPED Fiscal, SPED Contribuições, Domínio Sistemas e CSV gerencial).

### **3.7 Engine Fiscal Desacoplada**

> * **Arquitetura de Drivers Fiscais:** Interface abstrata (FiscalDriverInterface) desacoplando o core de regras municipais e estaduais.  
> * **Documentos Fiscais Suportados:** Emissão, cancelamento, inutilização e Carta de Correção Eletrônica (CC-e) para NF-e (Modelo 55), NFC-e (Modelo 65), NFS-e (Padrão Nacional e Principais Prefeituras), CT-e (Modelo 57\) e MDF-e (Modelo 58).  
> * **Gestão de Certificados & Guarda de XML:** Suporte a Certificados Digitais A1 (armazenamento seguro criptografado) e rotina automática de guarda e compactação de XMLs assinados por 5 anos.

### **3.8 Recursos Humanos, Departamento Pessoal & Gente**

> * **Ficha Funcional & Escalas:** Cadastro completo de colaboradores, dependentes, histórico salarial, cargos e matriz de jornadas de trabalho flexíveis.  
> * **Ponto Eletrônico Georreferenciado (Portaria MTP nº 671/2021):** Registro de ponto com captura de Data/Hora atômica, IP e coordenadas GPS. Base imutável com registro espelho auditável para retificações trabalhistas.  
> * **Holerite Gerencial & Banco de Horas:** Cálculo de proventos, adicionais de periculosidade/insalubridade, matriz de horas extras e compensação em banco de horas integrado ao Contas a Pagar.  
> * **Recrutamento, Seleção & Avaliação:** Funil Kanban de vagas, processo de admissão com preenchimento assistido, avaliações de desempenho por competências, PDI e pesquisa eNPS 100% anônima (com piso mínimo de 5 respondentes por setor).

## **4\. Matriz Comercial de Planos SaaS & Feature Flags**

| Domínio / Funcionalidade | MEI / Básico (SaaS) | Pro / PMEs (SaaS) | Enterprise / Corporativo (B2B) |
| :---- | :---: | :---: | :---: |
| **Modelo de Venda** | Self-Service Online | Self-Service / Assistida | Consultiva / Implantação Dedicada |
| **Ordens de Serviço & CMMS** | ✅ Básico | ✅ Completo | ✅ Completo \+ Roteiros Avançados |
| **Vendas & Orçamentos** | ✅ | ✅ | ✅ \+ CRM Avançado |
| **PDV Balcão Offline** | ✅ | ✅ | ✅ Multi-PDVs Concorrentes |
| **Gestão Financeira & DRE** | ✅ | ✅ | ✅ \+ Centros de Custo Multinível |
| **Cobrança PIX Nativa** | ✅ | ✅ | ✅ |
| **Evidências & Assinatura Jurídica** | — | ✅ | ✅ |
| **Portal do Cliente (Self-Service)** | ✅ | ✅ | ✅ com White-label / Domínio Próprio |
| **Cota de Armazenamento (Storage)** | **3 GB** | **20 GB** | **100 GB+ (Customizável)** |
| **Emissão Fiscal (NFe/NFSe/NFCe)** | — | ✅ | ✅ \+ CT-e / MDF-e / Emissão em Lote |
| **Módulo Industrial (PCP & Custos)** | — | Opcional (Add-on) | ✅ Completo |
| **WMS & Rastreamento de Lotes** | — | ✅ | ✅ |
| **Gestão de Frotas & Ativos** | — | ✅ | ✅ |
| **DP, Ponto REP-P GPS & RH** | — | ✅ | ✅ |
| **Multi-Filiais / CNPJs Concorrentes** | — | — | ✅ Ilimitado |
| **Motor de Alçadas Avançado** | — | Simples (Desconto \> 10%) | ✅ Multinível Parametrizável |
| **Exportação Contábil / SPED** | — | ✅ | ✅ |
| **Segurança & MFA Obrigatório** | — | Opcional | ✅ Obrigatório com TOTP |

## **5\. Execução Passo a Passo do Desenvolvimento (Linha do Tempo Cronológica)**

### **Fase 1: Fundação do Core, Banco & Governança Multi-Tenant (Sprints 1 a 3\)**

> * **Ação:** Modelar migrações no PostgreSQL com UUIDs em rotas públicas e criação do GlobalScopeTenant no Laravel.  
> * **Por quê:** Garante que nenhum módulo futuro seja construído sem amarra de isolamento de segurança.  
> * **Entregáveis:** Autenticação Sanctum, tabela de auditoria (sis\_auditoria\_logs), tabelas para listas suspensas dinâmicas e middleware de idempotência.

### **Fase 2: Cadastros Base, Produtos, WMS & Compras (Sprints 4 a 6\)**

> * **Ação:** Construir domínio de Pessoas (pes\_pessoas), catálogo de Itens (pro\_itens), multi-depósitos (wms\_depositos) e importador de XML de NF-e.  
> * **Por quê:** Fornece a infraestrutura de insumos e dados cadastrais necessária para vendas, serviços e manufatura.  
> * **Entregáveis:** Cadastro com validação de CPF/CNPJ, controle de lotes/validade, transferências internas de estoque e entrada de notas fiscais de fornecedor.

### **Fase 3: Prestação de Serviços (CMMS), Vendas & PDV Balcão (Sprints 7 a 9\)**

> * **Ação:** Implementar fluxo completo de OS com evidências/assinatura jurídica e frente de caixa PDV.  
> * **Por quê:** Entrega o módulo operacional de maior apelo comercial para prestadores de serviço e comércio varejista.  
> * **Entregáveis:** Orçamentos, pedidos, OS com laudo e upload de fotos, coleta de assinatura (MP 2.200-2), geração de PDF de OS e PDV balcão com baixa atômica.

### **Fase 4: Financeiro Pleno, Cobranças PIX & Controladoria (Sprints 10 a 12\)**

> * **Ação:** Desenvolver Contas a Pagar/Receber, gerador de payload PIX Copia e Cola EMV com QR Code e DRE Gerencial analítico.  
> * **Por quê:** Conecta o faturamento das OS e Vendas à saúde financeira da empresa cliente.  
> * **Entregáveis:** Baixas parciais/totais, extrato bancário, conciliação OFX, centro de custos, fluxo de caixa e DRE em tempo real.

### **Fase 5: Engine Fiscal Integrada & Frotas/Ativos (Sprints 13 a 15\)**

> * **Ação:** Implementar FiscalDriverInterface com emissão real de NF-e, NFS-e e NFC-e, além do controle veicular e tombamento patrimonial.  
> * **Por quê:** Permite operação legal completa de clientes emissores de documentos fiscais e controle de bens corporativos.  
> * **Entregáveis:** Assinatura de XML com certificado A1, transmissão SEFAZ, CC-e, cancelamento, controle de KM/L e Termo de Cautela com QR Code.

### **Fase 6: Módulo Industrial (PCP) & Recursos Humanos Completo (Sprints 16 a 18\)**

> * **Ação:** Desenvolver Ficha Técnica (BOM), Ordens de Produção (OP), Ponto REP-P georreferenciado e Funil Kanban de R\&S.  
> * **Por quê:** Habilita o atendimento de contas industriais e médias/grandes empresas com quadro amplo de funcionários.  
> * **Entregáveis:** Apontamento de OP com rateio de custos, cálculo de perdas, registro de ponto por GPS com base imutável, holerites gerenciais e eNPS anônimo.

### **Fase 7: Monetização SaaS, Billing, Portal do Cliente & Polimento Comercial (Sprints 19 a 21\)**

> * **Ação:** Desenvolver motor de faturamento de planos (sis\_planos), controle de cotas de storage, soft-lock de downgrade e Portal do Cliente.  
> * **Por quê:** Habilita a monetização em larga escala no modelo SaaS self-service e entrega o canal de autoatendimento ao cliente final.  
> * **Entregáveis:** Cobrança recorrente de assinaturas, portal público com token temporário para OS, trava de storage no upload e exportação contábil/SPED.

## **6\. Validação de Sucesso e Critérios de Aceite**

| Etapa / Módulo | Método de Teste e Validação | Critério de Aceite (Sucesso) |
| :---- | :---- | :---- |
| **Isolamento Multi-Tenant** | Bateria automatizada de testes HTTP simulando requisição autenticada do Tenant A tentando ler dados do Tenant B. | Retorno obrigatório de HTTP 403 Forbidden ou 404 Not Found em 100% dos endpoints sem exceção. |
| **Idempotência Financeira** | Envio duplicado simultâneo da mesma requisição de baixa financeira com o mesmo Idempotency-Key. | Processamento único na base de dados; a segunda requisição retorna o mesmo payload sem duplicar lançamentos. |
| **Assinatura Digital de OS** | Coleta de assinatura na tela do dispositivo e verificação do payload criptográfico. | Geração do hash SHA-256 integrando latitude, longitude, IP, data/hora atômica e dados do serviço executado. |
| **Emissão Fiscal (NF-e / NFS-e)** | Transmissão em ambiente de homologação SEFAZ/Prefeitura com diferentes alíquotas de ICMS/ISS. | Autorização do documento com retorno de protocolo, geração de DANFE/PDF e guarda de XML assinado. |
| **Apontamento de Produção** | Conclusão de uma Ordem de Produção de item composto. | Baixa automática do estoque de matérias-primas, entrada do produto acabado e custo unitário médio recalculado com precisão. |
| **Ponto Imutável (REP-P)** | Tentativa de atualização direta (UPDATE) via API no registro de batida de ponto original. | Bloqueio na camada de serviço; retificações são registradas exclusivamente na tabela espelho auditável. |
| **Soft-Lock em Downgrade** | Simulação de downgrade de plano corporativo para básico em tenant com excesso de depósitos e usuários. | Dados excedentes permanecem preservados em modo somente leitura (Read-Only), bloqueando novas inserções sem falha de integridade. |

## **7\. Diagnóstico e Resolução Imediata de Problemas**

> * **Problema: Lentidão em relatórios financeiros e DRE gerencial com grande volume de dados.**  
>   *Diagnóstico:* Queries calculando saldos de milhões de registros em tempo de execução sem agregações indexadas.  
>   *Solução:* Criar visões materializadas ou tabelas de consolidação diária/mensal por tenant, atualizadas de forma assíncrona via filas do Laravel (Queue/Jobs).  
> * **Problema: Rejeição na transmissão de documentos fiscais por instabilidade da SEFAZ.**  
>   *Diagnóstico:* Timeout de comunicação ou indisponibilidade temporária dos servidores estaduais.  
>   *Solução:* Ativar contingência automática (EPEC/SVC para NF-e ou contingência offline para NFC-e) e reprocessar o lote via fila assíncrona assim que a conectividade for restabelecida.  
> * **Problema: Tentativa de upload falhando por limite de storage do plano.**  
>   *Diagnóstico:* Tenant atingiu o teto de GB contratado (ex: 3GB no plano básico).  
>   *Solução:* Interceptor de upload retorna erro amigável 402/422 com payload padronizado indicando uso de cota e link direto para upgrade de storage.  
> * **Problema: Inconsistência de estoque em vendas simultâneas no PDV.**  
>   *Diagnóstico:* Concorrência na baixa de saldo sem bloqueio transacional.  
>   *Solução:* Utilizar transações atômicas com bloqueio pessimista (DB::transaction com lockForUpdate()) na tabela de saldo por depósito durante a finalização da venda.

## **8\. Plano de Ação Imediato para Início do Desenvolvimento**

> 1. Criar a estrutura base do projeto Laravel com PHP 8.4 e PostgreSQL.  
> 2. Definir a migração da camada Core: Tenants, Usuários, Perfis (Roles) e Tabelas de Domínio para Listas Suspensas.  
> 3. Implementar o GlobalScopeTenant e a primeira suíte de testes de isolamento cruzado.