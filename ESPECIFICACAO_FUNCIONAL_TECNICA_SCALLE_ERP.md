# ESPECIFICAÇÃO FUNCIONAL E TÉCNICA MESTRE — SCALLE ERP

## Do requisito à implementação, homologação e operação comercial

**Versão:** 1.0  
**Base:** Documento Mestre do Projeto — Scalle ERP  
**Estado inicial:** 0%  
**Objetivo:** permitir que uma equipe de produto, UX, arquitetura, backend, frontend, QA, DevOps e implantação consiga construir o Scalle ERP sem depender de interpretações implícitas.

---

# 1. COMO ESTE DOCUMENTO DEVE SER USADO

Este documento transforma o Documento Mestre em especificação de construção.

A ordem escolhida prioriza dependências:

1. Governança e arquitetura;
2. Core e multitenant;
3. Identidade, usuários e permissões;
4. Cadastros mestres;
5. Motor de configurações e workflows;
6. Comercial/CRM;
7. Compras;
8. Estoque/WMS;
9. Financeiro;
10. Fiscal;
11. Serviços/OS;
12. Industrial/PCP/MRP;
13. Frotas;
14. Ativos;
15. Projetos;
16. RH/DP;
17. GED;
18. Portal;
19. BI;
20. APIs/integrações;
21. SaaS/Billing;
22. Segurança/LGPD;
23. Infraestrutura/DevOps;
24. QA;
25. Implantação/suporte;
26. PWA/Offline/Tempo real/IA.

**Regra:** nenhuma implementação deve ser considerada definitiva sem requisitos, regras, permissões, integração, testes e critério de aceite.

---

# 2. PADRÃO OBRIGATÓRIO DE ESPECIFICAÇÃO

Cada módulo deverá ser descrito por:

- objetivo;
- escopo;
- atores;
- permissões;
- entidades;
- campos;
- telas;
- ações;
- fluxos;
- regras de negócio;
- estados;
- validações;
- integrações;
- eventos;
- APIs;
- relatórios;
- auditoria;
- segurança;
- testes;
- critérios de aceite;
- dependências;
- critérios de conclusão.
- Diretriz de que toda taxonomia, nomenclatura de fluxos, listas suspensas e etapas de processos devem ser dinâmicas e parametrizáveis por tenant, evitando termos estáticos chumbados no código (_hardcoded_)

---

# 3. FUNDAÇÃO — CORE E MULTITENANT

## 3.1 Objetivo

Criar a base sobre a qual todos os módulos funcionarão.

## 3.2 Entidades mínimas

- GrupoEmpresarial
- Tenant
- Empresa
- Filial
- Estabelecimento
- Usuario
- Perfil
- Permissao
- Sessao
- FeatureFlag
- Configuracao
- Auditoria
- Arquivo
- Notificacao
- Job
- Webhook
- Integracao

## 3.3 Requisitos

### CORE-001 — Tenant

Todo dado operacional deverá pertencer a um tenant quando o domínio exigir isolamento.

### CORE-002 — Isolamento

Toda consulta deverá respeitar o tenant autenticado.

### CORE-003 — Isolamento cruzado

Usuário de um tenant não poderá consultar, alterar, excluir ou inferir dados de outro tenant.

### CORE-004 — Grupo empresarial

Um grupo poderá conter múltiplas empresas/tenants conforme o modelo definido.

### CORE-005 — Filiais

Uma empresa poderá possuir múltiplas filiais/estabelecimentos.

### CORE-006 — Feature flags

Recursos poderão ser ativados/desativados por tenant e plano.

### CORE-007 — Auditoria

Operações críticas deverão registrar usuário, tenant, data/hora, operação, entidade e contexto.

### CORE-008 — Idempotência

Operações financeiras, fiscais e integrações críticas deverão possuir mecanismo idempotente quando aplicável.

## 3.4 Critério de aceite

Não considerar o Core concluído enquanto testes automatizados não comprovarem isolamento, autorização, auditoria e comportamento correto em múltiplos tenants.

---

# 4. IDENTIDADE, USUÁRIOS E PERMISSÕES

## 4.1 Objetivo

Controlar quem pode acessar o sistema e o que cada pessoa pode fazer.

## 4.2 Telas

- Login;
- recuperação de acesso;
- primeiro acesso;
- troca de senha;
- MFA;
- perfil do usuário;
- usuários;
- perfis;
- permissões;
- sessões;
- dispositivos;
- auditoria.

## 4.3 Permissões

A autorização deverá permitir controle por:

- módulo;
- recurso;
- ação;
- tenant;
- empresa;
- filial;
- contexto operacional quando aplicável.

Ações mínimas:

- visualizar;
- criar;
- editar;
- excluir;
- aprovar;
- cancelar;
- exportar;
- imprimir;
- administrar.

## 4.4 Segurança

- senha segura;
- expiração/revogação de sessão;
- MFA/2FA;
- TOTP;
- controle de tentativas;
- recuperação segura;
- auditoria.

---

# 5. CADASTROS MESTRES

## 5.1 Pessoas

### Tela

Lista + busca + filtros + cadastro + detalhes + histórico.

### Campos-base

- tipo;
- nome/razão social;
- documento;
- contatos;
- endereço;
- dados fiscais;
- situação;
- observações;
- vínculos.

### Regras

- documentos deverão possuir validação quando aplicável;
- duplicidades deverão ser controladas;
- histórico deverá preservar alterações relevantes.

## 5.2 Produtos

### Campos-base

- código;
- nome;
- descrição;
- tipo;
- unidade;
- categoria;
- grupo;
- marca;
- modelo;
- NCM/tributação quando aplicável;
- custo;
- preço;
- estoque mínimo;
- estoque máximo;
- lote;
- série;
- validade;
- ativo/inativo.

## 5.3 Serviços

- código;
- nome;
- descrição;
- unidade;
- preço;
- custo;
- tributação;
- SLA padrão;
- categoria;
- ativo/inativo.

## 5.4 Critério de aceite

Cadastros mestres deverão funcionar como fonte única de dados para os módulos que deles dependem.

---

# 6. CONFIGURAÇÕES E MOTOR DE REGRAS

Deverá existir camada central para:

- parâmetros por tenant;
- parâmetros por empresa;
- parâmetros por filial;
- séries;
- numerações;
- condições de pagamento;
- regras de desconto;
- alçadas;
- limites;
- feature flags;
- templates;
- notificações.

## Motor de Alçadas

Deverá permitir:

- condição;
- limite;
- aprovador;
- sequência;
- aprovação/rejeição;
- justificativa;
- auditoria.

---

# 7. CRM E COMERCIAL

## 7.1 Entidades

- Lead;
- Oportunidade;
- Cliente;
- Contato;
- Atividade;
- Proposta;
- Orçamento;
- Pedido;
- Contrato;
- TabelaPreco;
- Comissao.

## 7.2 Telas

- dashboard comercial;
- leads;
- funil;
- oportunidades;
- clientes;
- propostas;
- orçamentos;
- pedidos;
- contratos;
- tabelas de preço;
- comissões.

## 7.3 Fluxo principal

Lead → Qualificação → Oportunidade → Proposta/Orçamento → Aprovação → Pedido → Venda → Financeiro/Fiscal.

## 7.4 Regras

- descontos acima do limite exigem aprovação;
- venda deverá respeitar disponibilidade ou regra de reserva;
- pedido aprovado poderá gerar financeiro;
- documento fiscal deverá ser emitido conforme configuração fiscal;
- conversões deverão manter histórico.

## 7.5 Critério de aceite

Um usuário autorizado deverá conseguir realizar o ciclo completo de oportunidade até pedido, com integração correta aos módulos subsequentes.

---

# 8. COMPRAS E SUPRIMENTOS

## Entidades

- RequisicaoCompra;
- Cotacao;
- Fornecedor;
- PedidoCompra;
- Recebimento;
- Entrada.

## Fluxo

Requisição → Cotação → Comparação → Aprovação → Pedido → Recebimento → Estoque/Fiscal/Financeiro.

## Regras

- pedido acima da alçada exige aprovação;
- recebimento deverá refletir quantidades efetivas;
- entrada deverá gerar os vínculos necessários;
- divergências deverão ser registradas.

---

# 9. ESTOQUE E WMS

## Entidades

- Produto;
- Deposito;
- Localizacao;
- SaldoEstoque;
- Lote;
- Serie;
- Movimentacao;
- Transferencia;
- Inventario;
- Reserva.

## Operações

- entrada;
- saída;
- ajuste;
- transferência;
- inventário;
- reserva;
- baixa;
- estorno.

## Regras

- movimentações deverão ser auditáveis;
- saldos deverão ser consistentes;
- lote/série/validade deverão ser respeitados quando configurados;
- transferência em trânsito deverá possuir estados;
- operações concorrentes não poderão corromper saldo.

## Critério de aceite

Saldo e histórico deverão permanecer consistentes após operações normais, estornos, transferências e concorrência controlada.

---

# 10. FINANCEIRO

## 10.1 Entidades

- ContaFinanceira;
- ContaPagar;
- ContaReceber;
- Parcela;
- Baixa;
- Estorno;
- Caixa;
- Banco;
- Transferencia;
- Conciliacao;
- CentroCusto;
- PlanoConta;
- Cobranca.

## 10.2 Telas

- dashboard;
- contas a pagar;
- contas a receber;
- caixa;
- bancos;
- conciliação;
- cobrança;
- fluxo de caixa;
- DRE;
- centros de custo;
- plano de contas;
- fechamento.

## 10.3 Fluxos

### A pagar

Lançamento → Aprovação → Vencimento → Pagamento → Baixa → Conciliação.

### A receber

Venda/lançamento → Parcela → Cobrança → Recebimento → Baixa → Conciliação.

## 10.4 Regras

- baixa deverá possuir origem;
- estorno deverá preservar histórico;
- juros/multa/desconto deverão ser parametrizáveis;
- lançamentos deverão possuir vínculo com origem;
- fechamento deverá restringir alterações conforme política.

---

# 11. PIX E COBRANÇAS

## Fluxo

Cobrança → Payload/QR → Gateway → Webhook → Confirmação → Baixa → Conciliação.

## Requisitos

- idempotência;
- validação de webhook;
- registro da transação;
- tratamento de duplicidade;
- falhas e reprocessamento;
- auditoria.

---

# 12. FISCAL

## 12.1 Arquitetura

Driver fiscal desacoplado.

## 12.2 Entidades

- DocumentoFiscal;
- ItemFiscal;
- EventoFiscal;
- Certificado;
- RegraFiscal;
- Contingencia;
- XML.

## 12.3 Fluxos

Emissão → Validação → Assinatura → Envio → Retorno → Armazenamento → Integrações.

## 12.4 Tratamento

Deverá contemplar:

- autorização;
- rejeição;
- cancelamento;
- CC-e;
- inutilização;
- contingência;
- eventos;
- consulta;
- armazenamento.

## Critério de aceite

Cada tipo fiscal habilitado deverá ser validado em ambiente apropriado e possuir tratamento dos principais retornos e falhas.

---

# 13. SERVIÇOS / OS / CMMS

## Entidades

- OrdemServico;
- Cliente;
- Tecnico;
- Equipe;
- Agenda;
- SLA;
- Ativo;
- MaterialOS;
- Evidencia;
- Laudo;
- Assinatura;
- ContratoManutencao.

## Fluxo

Abertura → Triagem → Agendamento → Execução → Evidências → Materiais → Laudo → Assinatura/Aprovação → Encerramento → Financeiro.

## Regras

- SLA deverá ser calculado conforme calendário configurado;
- execução deverá registrar responsável;
- materiais deverão movimentar estoque;
- encerramento deverá respeitar requisitos obrigatórios;
- evidências deverão ser rastreáveis.

---

# 14. PCP / INDUSTRIAL / MRP

## Entidades

- Produto;
- BOM;
- VersaoBOM;
- OrdemProducao;
- Operacao;
- Maquina;
- Operador;
- Apontamento;
- Consumo;
- Perda;
- Custo.

## Fluxo

Demanda → Planejamento → OP → Reserva/Separação → Produção → Apontamento → Consumo → Produto acabado → Custos.

## Regras

- versão da BOM deverá ser identificável;
- consumo deverá possuir rastreabilidade;
- perdas/refugos deverão ser registrados;
- OP deverá possuir estados;
- custos deverão ser calculáveis conforme método adotado.

---

# 15. FROTAS E TRANSPORTES

Deverá possuir:

- veículos;
- motoristas;
- documentos;
- abastecimentos;
- manutenção;
- pneus;
- viagens;
- custos;
- alertas;
- CT-e/MDF-e quando aplicável.

Critério: histórico de utilização e custos deverá ser auditável por veículo.

---

# 16. ATIVOS E PATRIMÔNIO

Deverá possuir:

- cadastro;
- tombamento;
- localização;
- responsável;
- depreciação;
- movimentação;
- baixa;
- cautela;
- QR Code;
- manutenção;
- histórico.

---

# 17. RH E DP

## RH

- vagas;
- candidatos;
- seleção;
- avaliações;
- ciclos;
- PDI;
- treinamentos;
- competências;
- clima;
- eNPS;
- Nine-Box.

## DP

- colaborador;
- jornada;
- escala;
- ponto;
- banco de horas;
- férias;
- 13º;
- holerite;
- rescisão;
- integrações.

## Regra

Dados pessoais deverão possuir acesso restrito por função e auditoria.

---

# 18. PROJETOS

Entidades:

- Projeto;
- Contrato;
- Tarefa;
- Equipe;
- ApontamentoHoras;
- Custo;
- Orçamento;
- Entrega.

Fluxo:

Planejamento → Execução → Apontamentos → Custos → Entregas → Faturamento/Encerramento.

---

# 19. GED

Deverá possuir:

- documento;
- versão;
- categoria;
- permissões;
- vínculo com entidade;
- armazenamento;
- retenção;
- auditoria;
- busca.

---

# 20. PORTAL DO CLIENTE

O cliente deverá conseguir, conforme permissões/contratação:

- acessar;
- consultar OS;
- consultar orçamento;
- aprovar;
- acompanhar;
- visualizar documentos;
- assinar;
- consultar pagamentos;
- utilizar PIX;
- receber notificações.

---

# 21. BI E RELATÓRIOS

Cada módulo deverá definir seus indicadores e relatórios.

Requisitos comuns:

- filtros;
- período;
- empresa;
- filial;
- usuário;
- exportação;
- permissões;
- auditoria;
- isolamento por tenant.

---

# 22. API E INTEGRAÇÕES

Toda integração externa deverá possuir:

- contrato;
- autenticação;
- timeout;
- retry;
- idempotência quando aplicável;
- logs;
- tratamento de erro;
- versionamento;
- documentação;
- monitoramento.

---

# 23. EVENTOS E MENSAGERIA

Eventos deverão ser definidos para processos relevantes, por exemplo:

- venda criada;
- pedido aprovado;
- estoque movimentado;
- pagamento confirmado;
- documento fiscal autorizado;
- OS encerrada;
- usuário criado;
- tenant criado.

Processos assíncronos deverão ser reprocessáveis e observáveis.

---

# 24. SAAS E BILLING

## Entidades

- Plano;
- Assinatura;
- Tenant;
- Recurso;
- Limite;
- Consumo;
- Cobrança;
- Fatura;
- EventoBilling.

## Fluxo

Cadastro → Trial/Plano → Assinatura → Cobrança → Confirmação → Ativação → Consumo → Renovação/Upgrade/Downgrade/Cancelamento.

## Regras

- downgrade não deverá destruir dados;
- recursos excedentes deverão possuir política definida;
- inadimplência deverá possuir estados;
- alterações de plano deverão ser auditadas.

---

# 25. SEGURANÇA E LGPD

Requisitos transversais:

- menor privilégio;
- isolamento por tenant;
- MFA;
- auditoria;
- proteção de sessão;
- proteção de APIs;
- rate limiting;
- gestão de secrets;
- retenção;
- anonimização quando aplicável;
- rastreabilidade;
- resposta a incidentes.

---

# 26. INFRAESTRUTURA E DEVOPS

Deverá possuir:

- ambientes separados;
- CI/CD;
- deploy controlado;
- migrations;
- rollback;
- secrets;
- workers;
- filas;
- cache;
- storage;
- banco;
- monitoramento;
- logs;
- alertas;
- health checks;
- SSL/TLS.

---

# 27. BACKUP E DISASTER RECOVERY

Deverá definir:

- frequência;
- retenção;
- destino;
- criptografia;
- restauração;
- RPO;
- RTO;
- testes periódicos;
- plano de contingência.

---

# 28. QA E CRITÉRIOS DE ACEITAÇÃO

Todo módulo deverá possuir:

- testes unitários;
- integração;
- API;
- permissões;
- multitenant;
- regressão;
- fluxos críticos;
- testes de erro;
- homologação.

## Definition of Done

Uma funcionalidade só será considerada pronta quando:

1. requisito aprovado;
2. implementação concluída;
3. validações implementadas;
4. permissões implementadas;
5. auditoria definida quando necessária;
6. testes aprovados;
7. integração validada;
8. documentação atualizada;
9. homologação aprovada;
10. deploy controlado.

---

# 29. ONBOARDING, IMPLANTAÇÃO E SUPORTE

Deverá existir:

- criação de tenant;
- configuração;
- importação;
- treinamento;
- homologação;
- ativação;
- checklist;
- suporte;
- chamados;
- SLA;
- base de conhecimento;
- gestão de incidentes.

---

# 30. PWA, OFFLINE, TEMPO REAL E IA

Esses recursos serão tratados como camadas de evolução, mas deverão respeitar o Core.

## PWA/Offline

- cache;
- IndexedDB;
- fila local;
- sincronização;
- resolução de conflitos.

## Tempo real

- SSE;
- notificações;
- atualização de dashboards;
- eventos.

## IA

- busca semântica;
- vetorização;
- recomendações;
- automação;
- assistentes.

---

# 31. MATRIZ DE DEPENDÊNCIAS

A ordem mínima recomendada é:

**Core → Identidade → Cadastros → Configurações → Comercial/Compras → Estoque → Financeiro → Fiscal → Serviços/Industrial → Corporativo → SaaS/Operação**

Nenhum módulo deverá duplicar cadastros fundamentais sem justificativa arquitetural.

---

# 32. CRITÉRIO GLOBAL DE 100%

O Scalle será 100% comercialmente pronto somente quando:

- produto especificado;
- arquitetura validada;
- Core estável;
- multitenant validado;
- identidade segura;
- cadastros completos;
- módulos operacionais;
- integrações funcionando;
- fiscal homologado conforme aplicabilidade;
- financeiro validado;
- testes críticos automatizados;
- segurança validada;
- LGPD documentada;
- backup testado;
- recuperação testada;
- observabilidade ativa;
- CI/CD operacional;
- documentação completa;
- onboarding definido;
- suporte estruturado;
- SaaS/Billing operacional;
- contratos e políticas definidos;
- produção pronta;
- operação comercial validada.

---

# 33. MATRIZ MESTRE DE EXECUÇÃO

| Domínio             | Especificação | Desenvolvimento | Testes | Homologação | Produção | Comercial |
| ------------------- | ------------- | --------------- | ------ | ----------- | -------- | --------- |
| Core                | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Identidade          | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Cadastros           | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Comercial           | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Compras             | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Estoque/WMS         | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Financeiro          | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Fiscal              | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Serviços/OS         | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| PCP/MRP             | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Frotas              | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Ativos              | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| RH/DP               | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Projetos            | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| GED                 | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Portal              | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| BI                  | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| API/Integrações     | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| SaaS/Billing        | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Segurança/LGPD      | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| DevOps              | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| QA                  | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |
| Implantação/Suporte | ⚪             | ⚪               | ⚪      | ⚪           | ⚪        | ⚪         |

---

# 34. REGRA FINAL

Este documento é uma especificação de construção.

Quando uma decisão não estiver definida, ela deverá ser registrada como requisito pendente antes da implementação, e não presumida pela equipe.

O objetivo é eliminar a necessidade de “adivinhar” como o ERP deve funcionar.

**SCALLE ERP — 0% → 100% COMERCIALMENTE PRONTO**

---

# ANEXO — DOCUMENTO MESTRE ORIGINAL

# DOCUMENTO MESTRE DO PROJETO — SCALLE ERP

## Master Project Document

**Versão:** 1.0  
**Marco de planejamento:** **0%**  
**Objetivo:** especificar o Scalle ERP completo, do Core à operação comercial, para empresas de todos os portes e segmentos.

---

# 1. PROPÓSITO

Este é o documento central de produto, engenharia, arquitetura e evolução do Scalle ERP.

Para fins de planejamento, **o projeto começa em 0%**. Os rótulos de “Entregue”, “Implementado”, “Arquitetado” ou equivalentes existentes no documento de origem não serão considerados como prova de conclusão.

O código existente poderá ser reaproveitado posteriormente, mas será comparado contra esta especificação.

O objetivo final é transformar o Scalle em um **ERP SaaS comercial completo, seguro, escalável, documentado, operacional e preparado para clientes reais**.

---

# 2. VISÃO DO PRODUTO

O Scalle deverá atender:

- MEI e profissionais;
- microempresas;
- pequenas empresas;
- médias empresas;
- grandes empresas;
- grupos empresariais;
- comércio;
- serviços;
- indústria;
- operações híbridas.

A plataforma deverá ser modular, multitenant, extensível e capaz de oferecer diferentes recursos por plano, tenant e add-on.

**Filosofia:** MVP Enxuto + Core Extensível + Feature Flags por Tenant + Add-ons Enterprise.

---

# 3. DEFINIÇÃO DE 0% → 100%

| Nível | Status                   | Critério                                                   |
| ----- | ------------------------ | ---------------------------------------------------------- |
| 0     | ⚪ Não iniciado           | Requisito definido, ainda não executado                    |
| 1     | 🔵 Arquitetado           | Arquitetura, contratos e fluxos definidos                  |
| 2     | 🟡 Em desenvolvimento    | Implementação em andamento                                 |
| 3     | 🟢 Homologado            | Validado nos cenários necessários                          |
| 4     | 🟣 Comercialmente pronto | Seguro, documentado, operacional e preparado para clientes |

**Regra:** código existente não equivale automaticamente a conclusão.

---

# 4. ARQUITETURA E CORE

O Core deverá concentrar:

- autenticação;
- isolamento multitenant;
- empresas;
- grupos empresariais;
- filiais e estabelecimentos;
- DTOs;
- usuários;
- perfis;
- ACL;
- permissões;
- feature flags;
- storage;
- configurações;
- auditoria;
- idempotência;
- logs;
- filas;
- cache;
- notificações;
- serviços compartilhados;
- integrações;
- parâmetros globais e por tenant.

O isolamento de tenant deverá ser arquitetural, com `GlobalScopeTenant` ou mecanismo equivalente, acompanhado de testes automatizados de isolamento cruzado.

---

# 5. CADASTROS MESTRES

## Pessoas

- pessoa física;
- pessoa jurídica;
- cliente;
- fornecedor;
- colaborador;
- contato;
- representante;
- prestador;
- transportador.

## Produtos e serviços

- produto;
- serviço;
- categoria;
- grupo;
- unidade;
- marca;
- modelo;
- códigos;
- parâmetros fiscais;
- preços;
- custos;
- composição;
- estoque mínimo/máximo.

---

# 6. CRM, COMERCIAL E VENDAS

Deverá contemplar:

- leads;
- oportunidades;
- clientes;
- contatos;
- funil;
- atividades;
- agenda;
- propostas;
- orçamentos;
- pedidos;
- vendas;
- contratos;
- tabelas de preço;
- condições comerciais;
- descontos;
- comissões;
- aprovações;
- conversões;
- pós-venda;
- histórico;
- indicadores.

## Motor de Alçadas

Deverá permitir regras parametrizáveis de aprovação, incluindo descontos acima de limites e compras acima de limites definidos, com possibilidade futura de workflows corporativos multinível.

---

# 7. SERVIÇOS E ORDENS DE SERVIÇO — CMMS

Deverá contemplar:

- abertura;
- classificação;
- prioridade;
- SLA;
- agenda;
- técnicos;
- equipes;
- ciclo de vida;
- deslocamento;
- execução;
- consumo de materiais;
- baixa e estorno;
- fotos antes/depois;
- evidências;
- laudos;
- assinatura;
- geolocalização;
- IP;
- timestamp;
- hash SHA-256;
- PDF;
- aprovação do cliente;
- manutenção preventiva;
- manutenção corretiva;
- histórico;
- contratos.

---

# 8. COMPRAS E SUPRIMENTOS

Deverá contemplar:

- requisições;
- fornecedores;
- cotações;
- mapa comparativo;
- aprovações;
- pedidos de compra;
- recebimentos;
- entradas;
- XML de NF-e;
- conferência;
- atualização de estoque;
- integração fiscal;
- integração financeira;
- histórico.

---

# 9. ESTOQUE E WMS

Deverá contemplar:

- estoque;
- depósitos;
- almoxarifados;
- transferências;
- transferência direta;
- transferência em trânsito;
- conferência;
- entradas;
- saídas;
- ajustes;
- inventário;
- lotes;
- séries;
- validade;
- localização;
- estoque mínimo/máximo;
- curva ABC;
- custo médio;
- reservas;
- rastreabilidade;
- histórico.

---

# 10. FINANCEIRO

Deverá contemplar:

- contas a pagar;
- contas a receber;
- lançamentos;
- baixas;
- estornos;
- juros;
- multas;
- descontos;
- recorrência;
- cobrança;
- inadimplência;
- renegociação;
- fluxo de caixa;
- caixa;
- bancos;
- transferências;
- conciliação;
- PIX;
- boletos;
- cartões;
- contas financeiras;
- centros de custo;
- plano de contas;
- DRE;
- extrato;
- fechamento;
- relatórios;
- exportação contábil/fiscal.

---

# 11. PIX E COBRANÇAS

Deverá contemplar:

- payload PIX EMV;
- Copia e Cola;
- QR Code;
- cobrança dinâmica;
- gateways;
- webhooks;
- confirmação;
- conciliação;
- baixa automática;
- estorno;
- histórico.

A arquitetura deverá permitir integração com Asaas e outros gateways.

---

# 12. ENGINE FISCAL

A arquitetura deverá utilizar drivers desacoplados, tendo `FiscalDriverInterface` como referência.

Deverá contemplar:

- NF-e;
- NFC-e;
- NFS-e;
- CT-e;
- MDF-e;
- emissão;
- cancelamento;
- CC-e;
- inutilização;
- contingência;
- EPEC/SVC;
- certificados A1/A3;
- XML;
- DANFE;
- eventos;
- rejeições;
- consultas;
- armazenamento;
- guarda;
- integração com estoque;
- integração financeira;
- integração comercial.

---

# 13. CONTABILIDADE E EXPORTAÇÃO

Deverá contemplar:

- plano de contas;
- centros de custo;
- classificação;
- exportação;
- SPED;
- CSV;
- formatos para softwares contábeis;
- integração com contadores;
- conciliação dos dados exportados.

A contabilidade formal de partidas dobradas permanece fora do core inicial conforme decisão registrada na fonte.

---

# 14. INDUSTRIAL / PCP / MRP

Deverá contemplar:

- ficha técnica/BOM;
- engenharia;
- versões;
- ordens de produção;
- planejamento;
- materiais;
- consumo;
- baixa;
- produto acabado;
- custos;
- mão de obra;
- CIF;
- perdas;
- refugo;
- apontamento;
- operadores;
- máquinas;
- tempos;
- capacidade;
- rastreabilidade;
- indicadores;
- evolução para MRP.

---

# 15. FROTAS E TRANSPORTES

Deverá contemplar:

- veículos;
- documentos;
- odômetro;
- abastecimento;
- KM/L;
- custos;
- manutenção;
- preventiva;
- pneus;
- óleo;
- correias;
- alertas;
- motoristas;
- viagens;
- transportes;
- CT-e;
- MDF-e;
- integração financeira.

---

# 16. ATIVOS E PATRIMÔNIO

Deverá contemplar:

- ativos;
- tombamento;
- localização;
- responsáveis;
- depreciação;
- transferências;
- baixa;
- cautela digital;
- QR Code;
- histórico;
- manutenção;
- vínculo com OS;
- auditoria.

---

# 17. RH E DEPARTAMENTO PESSOAL

## RH Estratégico

- recrutamento;
- seleção;
- Kanban;
- auto-admissão;
- avaliações;
- ciclos;
- PDI;
- treinamentos;
- competências;
- clima;
- eNPS;
- indicadores;
- Nine-Box.

## Departamento Pessoal

- colaboradores;
- ficha funcional;
- jornadas;
- escalas;
- ponto;
- banco de horas;
- certificações;
- holerites;
- férias;
- 13º;
- rescisão;
- retificação;
- espelho;
- integração financeira;
- requisitos aplicáveis ao REP-P.

---

# 18. PROJETOS

Deverá contemplar:

- projetos;
- clientes;
- contratos;
- tarefas;
- equipes;
- responsáveis;
- prazos;
- custos;
- horas;
- materiais;
- orçamento;
- execução;
- indicadores;
- faturamento.

---

# 19. GED / DOCUMENTOS

Deverá contemplar:

- armazenamento;
- categorização;
- versionamento;
- permissões;
- documentos por domínio;
- documentos fiscais;
- busca;
- compartilhamento controlado;
- retenção;
- auditoria.

---

# 20. PORTAL DO CLIENTE

Deverá contemplar:

- autenticação;
- OS;
- orçamentos;
- aprovação;
- laudos;
- evidências;
- assinatura;
- acompanhamento;
- pagamentos;
- PIX;
- documentos;
- histórico;
- notificações.

A fonte prevê tokens públicos temporários e restritos por OS.

---

# 21. PWA E OPERAÇÃO DE CAMPO

Deverá contemplar:

- interface responsiva;
- PWA;
- operação offline;
- IndexedDB;
- sincronização;
- vendas de balcão;
- técnicos de campo;
- evidências;
- assinatura;
- geolocalização;
- notificações.

---

# 22. BI, DASHBOARDS E RELATÓRIOS

Deverá contemplar indicadores e relatórios de:

- comercial;
- vendas;
- financeiro;
- fiscal;
- estoque;
- compras;
- serviços;
- industrial;
- RH;
- DP;
- frota;
- patrimônio;
- projetos;
- SaaS.

Deverá permitir filtros, permissões, exportação, dashboards executivos, dados por tenant e atualização em tempo real quando aplicável.

---

# 23. API E INTEGRAÇÕES

Deverá existir camada de API para:

- parceiros;
- gateways;
- bancos;
- serviços fiscais;
- contabilidade;
- comunicação;
- sistemas externos;
- importações;
- exportações;
- webhooks.

Requisitos:

- autenticação;
- autorização;
- versionamento;
- idempotência;
- rate limiting;
- logs;
- auditoria;
- documentação;
- tratamento de erros.

---

# 24. MENSAGERIA

Deverá contemplar:

- e-mail;
- WhatsApp;
- notificações internas;
- templates;
- filas;
- histórico;
- opt-in/opt-out quando aplicável;
- logs;
- reprocessamento.

---

# 25. AUTOMAÇÃO E IA

A evolução deverá contemplar:

- busca semântica;
- vetorização;
- histórico de defeitos;
- catálogos;
- busca por intenção;
- `pgvector`;
- automações;
- recomendações;
- análise de dados;
- assistentes internos.

---

# 26. SEGURANÇA

Deverá contemplar:

- isolamento multitenant;
- autenticação;
- autorização;
- ACL;
- MFA/2FA;
- TOTP;
- segurança de sessões;
- tokens;
- certificados;
- auditoria;
- logs;
- idempotência;
- proteção de APIs;
- rate limiting;
- proteção de arquivos;
- rastreabilidade;
- monitoramento de segurança.

---

# 27. LGPD E GOVERNANÇA

Deverá contemplar:

- LGPD;
- papéis de tratamento;
- DPA;
- controle de acesso;
- minimização;
- retenção;
- anonimização;
- exclusão quando juridicamente possível;
- auditoria;
- segurança;
- gestão de incidentes.

Para eNPS, a fonte estabelece anonimização por design e piso mínimo de 5 respondentes por departamento para relatórios segmentados.

---

# 28. INFRAESTRUTURA E DEVOPS

O produto comercial deverá possuir:

- desenvolvimento;
- homologação;
- produção;
- CI/CD;
- deploy;
- versionamento;
- migrações;
- secrets;
- filas;
- workers;
- cache;
- storage;
- banco;
- escalabilidade;
- monitoramento;
- logs;
- alertas;
- health checks;
- SSL/TLS;
- manutenção.

---

# 29. BACKUP E DISASTER RECOVERY

Deverá existir:

- backup de banco;
- backup de arquivos;
- retenção;
- cópias externas;
- testes de restauração;
- recuperação de desastre;
- RPO;
- RTO;
- plano de contingência;
- recuperação de falhas;
- recuperação de corrupção de dados.

---

# 30. OBSERVABILIDADE

Deverá contemplar:

- logs estruturados;
- métricas;
- monitoramento;
- filas;
- storage;
- APIs;
- alertas;
- health checks;
- rastreamento de erros;
- auditoria;
- indicadores de disponibilidade.

---

# 31. TESTES E QUALIDADE

Deverá contemplar:

- testes unitários;
- integração;
- API;
- banco;
- permissões;
- multitenant;
- segurança;
- regressão;
- fiscal;
- financeiro;
- concorrência;
- carga;
- recuperação;
- backup/restauração;
- frontend;
- fluxos críticos;
- homologação.

---

# 32. SAAS, PLANOS E BILLING

Deverá contemplar:

- planos;
- tenants;
- assinaturas;
- cobrança;
- limites;
- cotas;
- feature flags;
- upgrades;
- downgrades;
- inadimplência;
- soft-lock;
- storage;
- consumo;
- webhooks;
- faturamento da plataforma.

## Matriz de referência

| Recurso                      | MEI  | Pro      | Enterprise |
| ---------------------------- | ---- | -------- | ---------- |
| OS/CMMS                      | ✅    | ✅        | ✅          |
| Financeiro/DRE               | ✅    | ✅        | ✅          |
| Vendas/Orçamentos            | ✅    | ✅        | ✅          |
| PIX                          | ✅    | ✅        | ✅          |
| Storage                      | 3 GB | 20 GB    | 100 GB+    |
| Evidências/Assinatura        | —    | ✅        | ✅          |
| Portal do Cliente            | ✅    | ✅        | ✅          |
| Mensageria                   | —    | ✅        | ✅          |
| Fiscal                       | —    | ✅        | ✅          |
| Frotas/Ativos                | —    | ✅        | ✅          |
| DP/Ponto                     | —    | ✅        | ✅          |
| RH Estratégico               | —    | ✅        | ✅          |
| Exportação Contábil          | —    | ✅        | ✅          |
| MFA                          | —    | Opcional | ✅          |
| Multi-filial/Múltiplos CNPJs | —    | —        | ✅          |

Os planos deverão ser configuráveis por feature flags.

---

# 33. ONBOARDING E IMPLANTAÇÃO

Deverá contemplar:

- criação de tenant;
- configuração inicial;
- empresa;
- usuários;
- permissões;
- parâmetros;
- importação;
- treinamento;
- validação;
- ativação;
- checklist;
- homologação;
- produção.

---

# 34. SUPORTE E OPERAÇÃO

Deverá contemplar:

- chamados;
- prioridades;
- SLA;
- histórico;
- atendimento;
- base de conhecimento;
- documentação;
- incidentes;
- manutenção;
- atualizações;
- comunicação de indisponibilidade.

---

# 35. CONTRATOS E GOVERNANÇA SAAS

Deverão existir:

- termos de uso;
- contrato SaaS;
- política de privacidade;
- DPA;
- níveis de serviço;
- limites;
- cancelamento;
- retenção;
- exportação de dados;
- encerramento de tenant;
- responsabilidades;
- suporte;
- disponibilidade.

---

# 36. MATRIZ DE DEPENDÊNCIAS

Principais cadeias:

**Cadastros → Comercial → Financeiro → Fiscal**

**Cadastros → Compras → Estoque → Financeiro → Fiscal**

**Produtos → BOM → PCP → Estoque → Custos → Financeiro**

**Ativos → OS → Estoque → Financeiro**

**Colaboradores → Ponto → DP → Financeiro**

**Tenant → Usuários → Permissões → Todos os módulos**

---

# 37. REGRAS ARQUITETURAIS

1. Multi-tenant obrigatório.
2. Isolamento arquitetural dos dados.
3. Modularidade.
4. Feature flags por tenant/plano.
5. Drivers externos desacoplados.
6. Idempotência em operações sensíveis.
7. Auditoria de operações relevantes.
8. Downgrade sem destruição de dados.
9. Controle de cotas de storage.
10. APIs versionadas.
11. Tratamento de falhas e reprocessamento.
12. Testes automatizados para módulos críticos.

---

# 38. CONFORMIDADE

O projeto deverá considerar, conforme aplicabilidade:

- LGPD;
- requisitos fiscais;
- requisitos trabalhistas;
- REP-P;
- MP 2.200-2/2001 para o modelo de evidências e assinatura previsto;
- guarda documental;
- auditoria;
- rastreabilidade.

Validações jurídicas definitivas deverão ser realizadas conforme o contexto regulatório e contratual aplicável.

---

# 39. ITENS ARQUIVADOS / POSTERGADOS

## eSocial próprio

Postergado. A estratégia registrada na fonte é utilizar exportação padronizada e integração com software contábil parceiro.

## Contabilidade formal

Diário, Razão e Balanço de partidas dobradas permanecem fora do core inicial.

## Workflow corporativo multinível

Workflow de quatro alçadas permanece postergado para add-on Enterprise, mantendo-se Motor de Alçadas Simples parametrizável.

---

# 40. EVOLUÇÃO TECNOLÓGICA

A evolução de longo prazo deverá considerar:

- PWA;
- Offline First;
- IndexedDB;
- sincronização;
- SSE;
- notificações;
- WebAuthn/FIDO2;
- Passkeys;
- busca semântica;
- IA;
- `pgvector`;
- automações;
- BI avançado.

---

# 41. CRITÉRIO DE ERP COMERCIALMENTE COMPLETO

O Scalle somente deverá ser considerado **100% comercialmente pronto** quando, conforme aplicabilidade:

- Core estiver estabilizado;
- isolamento multitenant estiver validado;
- autenticação e autorização estiverem seguras;
- cadastros estiverem completos;
- comercial estiver integrado;
- compras estiverem integradas;
- estoque estiver integrado;
- financeiro estiver operacional;
- fiscal estiver homologado;
- serviços estiverem operacionais;
- PCP estiver operacional;
- RH/DP estiverem validados;
- SaaS/Billing estiver operacional;
- Portal do Cliente estiver disponível;
- APIs estiverem documentadas;
- backups estiverem testados;
- recuperação estiver validada;
- monitoramento estiver ativo;
- segurança estiver validada;
- LGPD estiver documentada;
- testes críticos estiverem automatizados;
- documentação estiver completa;
- onboarding estiver definido;
- suporte estiver estruturado;
- contratos e políticas estiverem definidos;
- produção estiver preparada;
- atualização e manutenção estiverem controladas.

---

# 42. CRITÉRIO DE CONCLUSÃO POR MÓDULO

Cada módulo deverá possuir:

1. objetivo;
2. usuários;
3. permissões;
4. cadastros;
5. processos;
6. regras de negócio;
7. integrações;
8. banco de dados;
9. APIs;
10. interface;
11. relatórios;
12. auditoria;
13. segurança;
14. testes;
15. documentação;
16. homologação;
17. produção.

Somente então poderá ser considerado comercialmente completo.

---

# 43. ROADMAP MACRO

## Fase 0 — Fundação

Arquitetura, Core, multitenant, usuários, permissões, segurança, auditoria, cadastros e infraestrutura.

## Fase 1 — ERP Operacional

CRM, vendas, compras, estoque, financeiro, serviços e fiscal.

## Fase 2 — ERP Corporativo

PCP, WMS, frotas, ativos, projetos, RH, DP, BI e GED.

## Fase 3 — Plataforma SaaS

Billing, planos, feature flags, Portal, mensageria, onboarding, suporte e gestão de tenants.

## Fase 4 — Enterprise

Multi-filial, múltiplos CNPJs, workflows, MFA obrigatório, integrações avançadas e governança.

## Fase 5 — Inovação

PWA, offline, tempo real, Passkeys, IA, busca semântica e automações.

---

# 44. REGRAS DE GESTÃO

Este documento será a referência para:

- definir escopo;
- definir requisitos;
- organizar desenvolvimento;
- determinar dependências;
- definir testes;
- homologar módulos;
- preparar produção;
- preparar comercialização;
- controlar evolução.

O estado do código deverá ser comparado posteriormente contra esta especificação.

**Os rótulos de release do documento original não determinam conclusão.**

---

# 45. ESTADO INICIAL

## SCALLE ERP — 0%

O produto começa, para fins deste planejamento, em **0%**.

Objetivo final:

> **100% — ERP SaaS comercial completo, seguro, escalável, documentado, operacional e preparado para empresas de diferentes portes e segmentos.**

---

# 46. PRÓXIMA ETAPA

Cada domínio deverá posteriormente ser transformado em uma especificação funcional detalhada contendo:

- requisitos;
- telas;
- fluxos;
- regras de negócio;
- entidades;
- tabelas;
- APIs;
- permissões;
- integrações;
- eventos;
- relatórios;
- testes;
- critérios de aceitação;
- dependências;
- critérios de conclusão.

---

# ANEXO A — CONTEÚDO DO DOCUMENTO DE ORIGEM

O conteúdo integral do `revisar.md` original é mantido ao final deste arquivo como referência documental, sem alterar sua redação.

---

A avaliação do auditor (**Manus**) é cirúrgica e traz o fechamento definitivo do ciclo de planejamento. Ele validou que o mapa atual atingiu **9,5/10** de precisão em relação ao código real (`consolidado.txt`), apontando apenas 4 ajustes documentais de precisão para atingir **10/10**:

1. **Separação de ACL e Alçadas:** Manter `CheckRole` como 🟡 (implementado) e `Motor de Alçadas` como ⚪ (planejado).

2. **Linhas dos Diferenciais na Matriz de Planos:** Explicitar `Evidências & Assinatura`, `Mensageria` e `Portal do Cliente` na tabela comercial.

3. **Formalização LGPD (DPA):** Registrar a exigência de *Data Processing Agreement* (Aditivo de Operador) contratual.

4. **Seção de Itens Adiados/Arquivados:** Deixar registrado formalmente o que foi postergado para evitar reaberturas de escopo desnecessárias.

Abaixo está o **`revisar.md` final consolidado (10/10)**:

---

# 🗺️ Mapa de Evolução Arquitetural — Scalle ERP

**Filosofia:** MVP Enxuto + Core Extensível + Feature Flags por Tenant + Add-ons Enterprise

```text
                                ┌────────────────────────────────────────┐
                                │        CAMADA CORE (MULTITENANT)       │
                                │ Auth | Global Scope Tenant | DTOs      │
                                │ Grupo Empresarial | Flags | Storage DB │
                                └───────────────────┬────────────────────┘
                                                    │
                ┌───────────────────────────────────┼───────────────────────────────────┐
                ▼                                   ▼                                   ▼
         🛠️ PRESTAÇÃO DE SERVIÇOS           🏬 COMÉRCIO & VENDAS               🏭 INDÚSTRIA (PCP)
         - Módulo de OS / CMMS 🟡*           - Módulo de Vendas Diretas 🟡*      - Estrutura de Produtos (BOM) 🟡
         - Ciclo de Vida da OS 🟡            - PDV / Pedidos de Balcão 🟡         - Ordens de Produção (OP) 🟡
         - Baixa/Estorno Estoque 🟡          - Orçamentos/Propostas 🟡           - Apontamento de Perdas/Refugo 🟡
         - Evidências & Assinatura MP ⚪     - Conversão em Venda/OS 🟡          - Custo Industrial Apurado 🟡
         - Impressão Layout/PDF 🟡           - Impressão Layout/PDF 🟡
                │                                   │                                   │
                └───────────────────────────────────┼───────────────────────────────────┘
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │      SUPRIMENTOS, GESTÃO, RH & SAAS    │
                                │ - Compras & XML de Notas 🟡            │
                                │ - Contas a Receber / Contas a Pagar 🟡 │
                                │ - DRE Gerencial & Extrato 🟡           │
                                │ - ACL / Perfis de Acesso (CheckRole) 🟡│
                                │ - Motor de Alçadas Simples ⚪          │
                                │ - Dashboard Executivo (On-Demand) 🟡   │
                                │ - Cobrança PIX Nativa (EMV/QR Code) 🟡 │
                                │ - Engine Fiscal (Driver Desacoplado) 🔵│
                                │ - WMS / Multi-Depósitos & Transf. 🟡   │
                                │ - Gestão de Frotas & Abastecimento 🟡* │
                                │ - Ativos, Cautela Digital & QR Code 🟡 │
                                │ - DP: Escalas, Ponto REP-P & Holerite 🟡│
                                │ - RH Estratégico (R&S, PDI, eNPS) 🟡   │
                                │ - Billing SaaS, Planos & Cotas Storage⚪│
                                │ - Exportação Fiscal/Contábil (SPED/CSV)⚪│
                                │ - Portal do Cliente (Self-Service OS) ⚪│
                                │ - Mensageria (WhatsApp / E-mail) ⚪    │
                                │ - MFA / 2FA & Segurança de Sessões ⚪  │
                                │ - Multi-Filial / Multi-Estabelecimento ⚪│
                                └────────────────────────────────────────┘

```

*( * ) Nota de Dependência: Módulos com asterisco possuem subfluxo fiscal desacoplado herdando o nível 🔵 do driver.*

---

# 🚦 Régua de Maturidade do Código (5 Níveis)

| Símbolo | Nível            | Significado Técnico                                       |
| ------- | ---------------- | --------------------------------------------------------- |
| ⚪       | **1. Planejado** | Arquitetura/modelagem definida; aguardando implementação. |

 |
| 🔵 | **2. Arquitetado** | Contratos, interfaces, DTOs e drivers mockados no código.

 |
| 🟡 | **3. Implementado** | Código funcional, migrado no banco e validado em testes locais manuais/API (*suíte automatizada pendente*).

 |
| 🟢 | **4. Homologado** | Validado em ambiente de homologação (SEFAZ/Bancos/Cenários de borda).

 |
| 🟣 | **5. Em Produção** | Operacional no servidor com clientes reais pagantes.

 |

---

# 🔍 Raio-X Atual dos Módulos (Status Real do Backend)

| Módulo / Domínio        | Status | Estado Atual do Código                                                                                  | Próximo Passo para Subir de Nível |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Auth & Multi-Tenant** | 🟡     | Multi-empresa isolado por `empresa_id` manual (84 filtros `where`), Sanctum, troca de contexto e roles. |                                   |

 | **[CRÍTICO]** Aplicar `GlobalScopeTenant` em todos os Models e criar testes automatizados de invasão cruzada (retorno 403/404).

 |
| **ACL & Governança** | 🟡 | Middleware `CheckRole`, logs de auditoria (`sis_auditoria_logs`) e idempotência.

 | Implementar suíte de testes de permissão por perfil de acesso. |
| **Motor de Alçadas** | ⚪ | Escopo desenhado (regras parametrizáveis por valor/desconto). | Implementar verificação de limites (desconto > 10% ou compra > R$ 5k exige aprovação).

 |
| **Pessoas & Contatos** | 🟡 | Cadastro unificado (`pes_pessoas`) com validação de formato.

 | Adicionar algoritmo local de dígito verificador com fallback para ReceitaWS.

 |
| **Produtos, Estoque & WMS** | 🟡 | Catálogo (`pro_itens`), parâmetros fiscais, multi-depósitos e transferências.

 | Rastreabilidade de lote/série, validade e curva ABC.

 |
| **Ordens de Serviço (CMMS)** | 🟡* | Ciclo de vida, consumo de peças, PDF e emissão mockada (🔵).

 | Coleta de fotos antes/depois e assinatura digital MP 2.200-2 (geo + IP + hash SHA-256).

 |
| **Comércio & Vendas** | 🟡* | Pedidos balcão, orçamentos, baixa atômica e NF-e mockada (🔵).

 | Integração com checkout transparente e link público de pagamento. |
| **Compras & Entradas** | 🟡 | Entrada manual e importador inteligente de XML de NF-e.

 | Mapa comparativo de cotações com múltiplos fornecedores. |
| **Financeiro & DRE** | 🟡 | Contas a pagar/receber, conciliação, DRE gerencial e extrato.

 | Rota de exportação contábil/fiscal para contadores externos (Domínio/SPED/CSV).

 |
| **PIX & Cobranças** | 🟡 | Gerador de payload PIX Copia e Cola (EMV) + QR Code dinâmico.

 | Webhook de confirmação instantânea via Gateway Asaas.

 |
| **Engine Fiscal** | 🔵 | `FiscalDriverInterface` com drivers mockados (`MockFiscalDriver` com `rand`).

 | **[CRÍTICO]** Driver real A1/A3, cancelamento, CCe, inutilização, contingência EPEC/SVC e guarda de XML por 5 anos.

 |
| **Módulo Industrial (PCP)** | 🟡 | Ficha técnica (BOM), ordens de produção, apropriação de custos e refugo.

 | Apontamento de tempos por operador/máquina em tempo real. |
| **Frotas & Transportes** | 🟡* | Veículos, odômetro, abastecimento com KM/L e CTe mockado (🔵).

 | Alertas automáticos de preventiva por odômetro (óleo, correia e pneus).

 |
| **Ativos & Patrimônio** | 🟡 | Tombamento de bens, depreciação linear, cautela digital e QR Code.

 | Histórico de manutenções preventivas/corretivas vinculadas à OS.

 |
| **Departamento Pessoal (DP)** | 🟡 | Ficha funcional, escalas, ponto georreferenciado e holerite gerencial.

 | Rota de retificação de ponto com registro espelho (Portaria 671) e módulo de rescisão/férias/13º.

 |
| **RH Estratégico & Gente** | 🟡 | R&S Kanban com auto-admissão, avaliação ponderada, PDI e eNPS anônimo.

 | Piso mínimo de respondentes por setor no eNPS e relatório Nine-Box.

 |
| **Billing SaaS & Planos** | ⚪ | Modelagem definida (planos, limites, cotas e soft-lock).

 | Execução da Release v6.0.0 com gateway Asaas e middleware de feature flags.

 |
| **Portal do Cliente** | ⚪ | Conceito validado (self-service para aprovação de OS e laudos).

 | Criação de tokens públicos temporários de visualização restrita por OS.

 |
| **Segurança Avançada (MFA)** | ⚪ | Escopo desenhado (autenticação de 2 fatores via TOTP/App).

 | Implementação do middleware 2FA para perfis `ADMIN` e `FINANCEIRO`.

 |

---

# 📌 Planejamento de Releases (Semantic Versioning)

### 🟢 Versão 1.x.x — Core Comercial, Operacional, Financeiro & Fiscal (Entregue)



* **v1.0.0 a v1.5.0:** Multi-tenant por `empresa_id`, Pessoas, Itens/Produtos, Módulo de Vendas, Orçamentos, Ordens de Serviço (CMMS), Compras, Contas a Pagar/Receber, DRE Gerencial, Extrato, ACL (`CheckRole`), Cobrança PIX EMV nativa e Engine Fiscal desacoplada (`FiscalDriverInterface`).
  
  

### 🏭 Versão 2.0.0 — Módulo Industrial (PCP & Custos - Entregue)



* **v2.0.0:** Estrutura de Produtos / Ficha Técnica (BOM), Ordens de Produção (OP) com baixa atômica de insumos, rateio de mão de obra/CIF, entrada de produto acabado com recálculo de custo médio e apontamento analítico de refugo/perdas.
  
  

### 🚚 Versão 3.0.0 — Logística & WMS (Entregue)



* **v3.0.0:** Gestão de Multi-Depósitos/Almoxarifados (`wms_depositos`), controle fracionado de estoque (`wms_estoque_deposito`) e Transferências Internas (`wms_transferencias`) nos modos `DIRETO` e `EM_TRANSITO` com conferência.
  
  

### 🛡️ Versão 4.x.x — Governança SaaS, Frotas & Ativos Patrimoniais (Entregue)



* **v4.0.0:** Gestão de Usuários da Equipe (`/empresa/usuarios`), Importador inteligente de XML de NF-e, Parâmetros operacionais por empresa, Trilha de Auditoria (`sis_auditoria_logs`) e Middleware de Idempotência (`Idempotency-Key`).

* **v4.1.0:** Gestão de Frotas (`fro_veiculos`), odômetro/KM atual, controle de abastecimentos (`fro_abastecimentos`) com consumo KM/L integrado ao Contas a Pagar e CTe/MDF-e mockados.

* **v4.2.0:** Gestão de Ativos & Patrimônio (`pat_ativos`), cálculo de depreciação linear em tempo real, Termo de Cautela Digital para técnicos (`pat_cautelas`) e gerador dinâmico de QR Code.
  
  

### 👥 Versão 5.x.x — Recursos Humanos Completo & Gente (Entregue)



* **v5.0.0 (DP & Ponto Eletrônico):** Ficha funcional (`rh_colaboradores`), jornadas/escalas customizáveis (`rh_escalas`), ponto georreferenciado com Lat/Long/IP (`rh_pontos`), banco de horas (`rh_banco_horas`), matriz de certificações (NR-10/NR-35/CNH) e espelho de holerite gerencial integrado ao Contas a Pagar (`rh_holerites`).

* **v5.1.0 (RH Estratégico & Gestão de Talentos):** Recrutamento & Seleção em funil Kanban (`rh_vagas`, `rh_candidatos`) com **auto-admissão imediata**, Avaliação de Desempenho ponderada (`rh_avaliacao_ciclos`), PDI/Treinamentos (`rh_treinamentos`) e Pesquisa de Clima Organizacional/eNPS 100% anônima (`rh_clima_respostas`).
  
  

### 💳 Versão 6.0.0 — Monetização SaaS, Billing, Governança & Diferenciais de Campo (Próxima Release)



* **Blindagem de Core Multi-Tenant:** `GlobalScopeTenant` forçado no Eloquent para isolamento total de queries e suíte automatizada de testes de invasão cruzada.

* **Motor de Billing & Planos SaaS:** Gestão de planos (`sis_planos`: MEI, Pro, Enterprise), controle ativo de cotas de storage (3GB, 20GB, 100GB+), soft-lock de downgrade (read-only em excedentes) e webhooks de pagamento (Asaas/Stripe).

* **Ponte de Exportação Contábil/Fiscal:** Endpoint padronizado (`/api/v1/exportacao-contabil`) gerando arquivos estruturados (SPED/CSV/Domínio) para contadores externos.

* **Evidências de OS & Assinatura Jurídica (MP 2.200-2):** Fotos de "Antes/Depois" na OS e coleta de assinatura na tela com captura de Lat/Long, IP, Timestamp e Hash SHA-256.

* **Motor de Alçadas Simples:** Aprovação obrigatória de `ADMIN` para descontos comerciais acima de 10% ou compras acima de limite parametrizado.

* **Portal do Cliente (Self-Service):** Token público temporário por OS para o cliente aprovar orçamento, ver laudo e pagar via PIX.

* **Segurança de Acesso (MFA/2FA):** Segundo fator de autenticação via TOTP para perfis administrativos e financeiros.
  
  

### ⚡ Versão 7.0.0 — Frontend PWA, Tempo Real & Inovação Tecnológica



* **Frontend SPA / PWA (PDV Offline First):** Interface responsiva com persistência local em IndexedDB e sincronização em lote para vendas de balcão e técnicos de campo.

* **Comunicação Reativa em Tempo Real (SSE):** Atualização dinâmica de dashboards executivos, status de OPs e notificações push via Server-Sent Events.

* **Autenticação Biométrica / Passkeys:** Suporte a WebAuthn/FIDO2 para login por biometria/dispositivo.

* **Busca Semântica & IA:** Vetorização de itens, histórico de defeitos em OS e catálogos via `pgvector` para busca por intenção.
  
  

---

# Matriz Comercial de Planos SaaS (Feature Flags)

| **Funcionalidade / Domínio**         | **MEI (Básico)** | **Pro (PMEs)** | **Enterprise (Grandes Contas)** |
| ------------------------------------ | ---------------- | -------------- | ------------------------------- |
| **Gestão de Assinatura & Billing**   | Automático       | Automático     | Painel Dedicado                 |
| **Ordens de Serviço & CMMS**         | ✅                | ✅              | ✅                               |
| **Gestão Financeira & DRE**          | ✅                | ✅              | ✅                               |
| **Vendas & Orçamentos**              | ✅                | ✅              | ✅                               |
| **Cobrança PIX Nativa**              | ✅                | ✅              | ✅                               |
| **Cota de Armazenamento (Storage)**  | **3 GB**         | **20 GB**      | **100 GB+**                     |
| **Evidências & Assinatura Jurídica** | —                | ✅              | ✅                               |
| **Portal do Cliente (Self-Service)** | ✅                | ✅              | ✅                               |
| **Mensageria (WhatsApp / E-mail)**   | —                | ✅              | ✅                               |
| **Emissão Fiscal (NFe/NFSe/CTe)**    | —                | ✅              | ✅                               |
| **Gestão de Frotas & Ativos**        | —                | ✅              | ✅                               |
| **Departamento Pessoal & Ponto**     | —                | ✅              | ✅                               |
| **RH Estratégico & eNPS**            | —                | ✅              | ✅                               |
| **Exportação Contábil (SPED/CSV)**   | —                | ✅              | ✅                               |
| **MFA / 2FA Obrigatório**            | —                | Opcional       | ✅                               |
| **Multi-Filial / Múltiplos CNPJs**   | —                | —              | ✅                               |

---

# ⚖️ Conformidade Legal, Governança & Segurança

1. **Isolamento de Dados Multi-Tenant:** Implementação de escopo global forçado no ORM (`GlobalScopeTenant`) em todas as entidades. Nenhuma consulta trafega sem amarra explícita de `empresa_id`, com suíte de testes automatizados de invasão cruzada.

2. **Portaria MTP nº 671/2021 (REP-P):** Ponto com captura de Data/Hora, IP e GPS. **Imutabilidade garantida por ausência de rota de sobrescrita direta** — ajustes manuais futuros criarão registros de retificação em espelho rastreáveis para auditoria trabalhista.

3. **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018):**
* O Scalle ERP atua formalmente como **Operador de Dados** do tenant com DPA padrão (*Data Processing Agreement*) anexo aos contratos dos planos.

* Anonimização total por design no eNPS (sem colunas de identificação de usuário) com piso mínimo de 5 respondentes por departamento para exibição de relatórios segmentados.

* Tratamento de conflito legal: solicitações de exclusão de dados respeitam o prazo de guarda fiscal e trabalhista de 5 anos antes do expurgo definitivo.
4. **Validade Jurídica de OS em Campo (MP 2.200-2/2001):** Assinatura colhida no dispositivo vinculada a IP, Geotag, Timestamp e Hash SHA-256 dos itens executados.

5. **Resiliência em Downgrades (Soft-Lock):** Ao reduzir o plano, dados excedentes ficam em modo `Read-Only`, impedindo novas adições sem corromper DTOs legadas ou executar migrações destrutivas.

6. **Controle Ativo de Cotas de Storage:** Interceptação em tempo de upload para barrar arquivos quando o limite for atingido.
   
   

---

# 📦 Itens Arquivados / Postergados (Decisões de Escopo)

* **Transmissor Governamental Próprio de eSocial (S-1000 a S-5013):** Postergado. Substituído por exportação padronizada (SPED Folha / Domínio) para software de contabilidade parceiro.

* **Contabilidade Formal de Partidas Dobradas (Diário / Razão / Balanço):** Arquivado do core inicial. Mantido DRE Gerencial, Centros de Custo e Plano de Contas com exportação contábil.

* **Workflow Corporativo Multinível (4 alçadas):** Postergado para add-on Enterprise. Adotado Motor de Alçadas Simples parametrizável.
  
  

---

### 🚀 Próximo Passo na Fila de Execução

Com o `revisar.md` 100% blindado e auditado, a primeira entrega da **Release v6.0.0** será:

1. **`GlobalScopeTenant` no Eloquent + Suíte de Testes Automatizados de Isolamento Cruzado (403/404)**.
   
   

Podemos dar o tiro de partida nessa implementação?
