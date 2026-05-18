# Feature Specification: Clube de Assinatura Multitenant

**Feature Branch**: `002-clube-assinatura`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "inicie a elaboração da spec para desenvolvimento completo do @escopo.md — Plataforma multitenant para gestão de clube de assinatura com gestão de unidades, planos, oportunidades, vendas, clientes, integração Asaas e preparação para autenticação futura de clientes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gestão de Tenants e Usuários da Plataforma (Priority: P1)

O Super Admin precisa criar e configurar unidades (tenants) na plataforma. Cada unidade opera de forma independente, com seus próprios usuários, clientes e dados financeiros. O Administrador da unidade, por sua vez, precisa montar sua equipe: criar usuários com papéis de Gerente e Representante, organizar times e definir quem pode acessar o quê.

**Why this priority**: Sem tenants e usuários, nada funciona. É a fundação sobre a qual toda a operação comercial se sustenta. Um Super Admin consegue criar a primeira unidade e esta já pode operar internamente.

**Independent Test**: Pode ser testado criando uma unidade via Super Admin, depois criando usuários (Admin, Gerente, Representante) dentro dela com times e verificando que cada um acessa apenas o seu escopo.

**Acceptance Scenarios**:

1. **Given** um Super Admin autenticado, **When** ele cria uma nova unidade com nome e slug, **Then** a unidade é registrada e fica disponível para configuração.
2. **Given** um Administrador de unidade autenticado, **When** ele cria um novo usuário com papel de Representante e o associa a um time, **Then** o Representante consegue acessar o sistema com escopo limitado à sua unidade e time.
3. **Given** um Gerente autenticado, **When** ele tenta acessar dados de uma unidade que não é a sua, **Then** o sistema bloqueia o acesso e exibe mensagem de permissão negada.
4. **Given** um Representante autenticado, **When** ele tenta criar um novo usuário na unidade, **Then** o sistema bloqueia a ação pois o papel não possui essa permissão.

---

### User Story 2 — Gestão Centralizada de Planos pelo Super Admin (Priority: P1)

O Super Admin define quais planos estarão disponíveis para venda nas unidades. Ele cria planos como rascunho, configura valores, regras de dependentes (quantidade inclusa, valor por dependente extra, faixas de preço), publica para venda e, quando necessário, inativa ou cria novas versões. As unidades apenas vendem os planos disponibilizados; não podem criá-los nem alterar regras.

**Why this priority**: Sem planos publicados, não há produto para vender. É o segundo pilar mais crítico após a criação de tenants.

**Independent Test**: Pode ser testado criando um plano (PF ou PJ) como Super Admin, publicando, e verificando que unidades conseguem visualizá-lo. Criar nova versão, verificar que vendas antigas mantêm a versão contratada.

**Acceptance Scenarios**:

1. **Given** Super Admin autenticado, **When** ele cria um plano "Família PF" com valor base de R$ 99,90, 2 dependentes inclusos e R$ 20,00 por dependente extra, **Then** o plano fica em rascunho e não aparece para unidades.
2. **Given** um plano em rascunho, **When** Super Admin publica o plano, **Then** o plano aparece como disponível para todas as unidades.
3. **Given** um plano publicado com clientes ativos, **When** Super Admin tenta editar o valor diretamente, **Then** o sistema bloqueia e orienta a criação de uma nova versão.
4. **Given** Super Admin cria nova versão do plano com valor maior, **When** a nova versão é publicada, **Then** novos checkouts usam a nova versão; clientes existentes permanecem na versão contratada originalmente.
5. **Given** um plano inativado, **When** um Representante tenta selecionar planos para uma oportunidade, **Then** o plano inativado não aparece na listagem.

---

### User Story 3 — Ciclo de Venda: Oportunidade → Checkout → Pagamento → Cliente (Priority: P1)

Um Representante cadastra uma oportunidade com nome e CPF/CNPJ. O sistema valida unicidade do documento na unidade. O Representante complementa dados cadastrais (telefone, e-mail, endereço via CEP), adiciona dependentes se o plano permitir, seleciona o plano e a forma de pagamento (cartão ou boleto). Ao gerar o checkout/fatura, o sistema cria o cliente no gateway de pagamento e gera a cobrança. Quando o pagamento é confirmado, o sistema automaticamente converte a oportunidade: cria o cliente titular e os dependentes locais, confirma a venda e ativa a assinatura.

**Why this priority**: É o fluxo de receita do negócio. Sem ele, a plataforma não gera valor financeiro. Representa o core loop: prospecção → fechamento → recebimento → ativação.

**Independent Test**: Pode ser testado criando uma oportunidade, preenchendo dados, gerando checkout, simulando pagamento confirmado e verificando que o cliente titular e dependentes são criados corretamente com vínculo à oportunidade de origem.

**Acceptance Scenarios**:

1. **Given** um Representante autenticado, **When** ele cadastra uma oportunidade com nome e CPF já existentes na unidade, **Then** o sistema bloqueia e exibe o registro duplicado para reaproveitamento.
2. **Given** uma oportunidade com todos os dados obrigatórios preenchidos e plano selecionado, **When** o Representante clica em "Gerar checkout", **Then** o sistema cria cliente no gateway, gera checkout/fatura, muda status da oportunidade para "checkout_gerado" e cria venda como "pending_payment".
3. **Given** uma venda pendente, **When** o sistema recebe a confirmação de pagamento, **Then** a venda muda para "confirmed", a oportunidade para "convertida", o cliente titular é criado como "ativo" e os dependentes também.
4. **Given** uma oportunidade em "checkout_gerado", **When** o Representante cancela a oportunidade com justificativa de no mínimo 20 caracteres, **Then** a oportunidade vai para "cancelada", a venda para "cancelled_before_payment" e o sistema tenta cancelar o cliente no gateway.
5. **Given** uma oportunidade "aberta", **When** o Representante a cancela antes de gerar checkout, **Then** a oportunidade vai para "cancelada" sem afetar outras entidades.

---

### User Story 4 — Gestão de Clientes e Acompanhamento Financeiro (Priority: P2)

Após a conversão, o sistema oferece uma listagem completa de clientes da unidade (titulares e dependentes), com filtros por status, tipo, vendedor e documento. Cada cliente titular possui uma rota interna exibindo dados pessoais, assinatura, dependentes vinculados e dados financeiros (valores recebidos, débitos, histórico de faturas). O Administrador ou Gerente pode cancelar planos, quitar débitos e visualizar o histórico completo.

**Why this priority**: Essencial para a operação pós-venda — retenção, cobrança, cancelamento e suporte. Sem isso, a unidade não consegue gerir sua base de clientes ativos.

**Independent Test**: Pode ser testado acessando a listagem de clientes após conversões, verificando filtros, acessando a rota do titular com dados financeiros, e realizando um cancelamento de plano com propagação para dependentes.

**Acceptance Scenarios**:

1. **Given** clientes convertidos na unidade, **When** o Administrador acessa a listagem de clientes, **Then** visualiza titulares e dependentes com status, vendedor e pode filtrar por qualquer critério.
2. **Given** um cliente titular ativo, **When** o Administrador acessa sua rota interna, **Then** visualiza dados pessoais, assinatura, lista de dependentes e dados financeiros consolidados.
3. **Given** um titular ativo, **When** o Administrador solicita o cancelamento do plano com justificativa, **Then** o titular vai para "inativo", dependentes para "vinculado_a_titular_inativo", e a assinatura é cancelada no gateway.
4. **Given** um titular inadimplente, **When** o Administrador clica em "Quitar débitos", **Then** o sistema consolida os débitos e gera uma cobrança de regularização no gateway.

---

### User Story 5 — Relatórios e Indicadores Comerciais (Priority: P3)

O sistema oferece dashboards e relatórios com indicadores operacionais e comerciais por unidade: conversão de oportunidades, vendas pendentes/confirmadas/canceladas, inadimplência, vidas ativas, performance por vendedor, ticket médio por plano, churn, e valores recebidos. O Super Admin visualiza indicadores globais consolidados de todas as unidades.

**Why this priority**: Essencial para gestão estratégica e tomada de decisão, mas o negócio pode operar sem dashboards sofisticados no lançamento. Relatórios básicos de clientes e vendas já são cobertos pelas listagens.

**Independent Test**: Pode ser testado gerando dados de vendas e verificando que os indicadores da dashboard refletem corretamente os números das entidades (oportunidades, vendas, clientes).

**Acceptance Scenarios**:

1. **Given** dados de vendas e clientes na unidade, **When** o Administrador acessa o dashboard, **Then** visualiza indicadores de conversão, inadimplência, vidas ativas e performance por vendedor.
2. **Given** múltiplas unidades com operação ativa, **When** o Super Admin acessa o dashboard global, **Then** visualiza indicadores consolidados de todas as unidades.

---

### User Story 6 — Preparação para Autenticação Futura de Clientes (Priority: P3)

O modelo de dados e a arquitetura devem prever que, futuramente, titulares e dependentes poderão autenticar-se em um aplicativo externo (mobile) para acessar benefícios do clube. Esta camada de identidade é separada dos usuários administrativos da plataforma. Um cliente pode existir sem conta de acesso; a conta pode ser criada posteriormente sem afetar o histórico.

**Why this priority**: Não é necessário para o MVP operacional, mas decisões de modelagem tomadas agora evitam retrabalho estrutural futuro. O escopo atual é de preparação, não de implementação completa da autenticação de clientes.

**Independent Test**: Pode ser testado verificando que a estrutura de dados permite vincular uma conta de autenticação a qualquer cliente (titular ou dependente) sem conflitar com a tabela de usuários administrativos.

**Acceptance Scenarios**:

1. **Given** um cliente titular ativo, **When** futuramente o app estiver disponível, **Then** é possível criar uma conta de autenticação vinculada a esse cliente sem afetar o acesso administrativo.
2. **Given** um dependente ativo, **When** futuramente o app estiver disponível, **Then** é possível criar uma conta de autenticação vinculada a esse dependente.
3. **Given** um cliente com conta de autenticação ativa, **When** o cliente tenta acessar o painel administrativo com essas credenciais, **Then** o sistema rejeita — credenciais de cliente não concedem acesso administrativo.

---

### Edge Cases

- **Duplicidade de CPF/CNPJ**: O que acontece quando dois Representantes tentam cadastrar o mesmo documento simultaneamente? O sistema deve usar controle transacional para garantir que apenas um cadastro seja aceito.
- **Webhook duplicado**: O que acontece quando o gateway de pagamento envia a mesma confirmação de pagamento duas vezes? O sistema deve processar de forma idempotente, ignorando eventos já processados e evitando duplicação de clientes ou transições incorretas de status.
- **Falha na comunicação com o gateway**: Quando o sistema tenta criar um cliente no gateway e a API está indisponível, o Representante recebe um erro claro e pode tentar novamente; a oportunidade não muda de status até que a operação seja bem-sucedida.
- **Cancelamento com falha no gateway**: Se o sistema não conseguir cancelar a assinatura no gateway, o status interno vai para "cancelamento_pendente" e o erro é registrado para intervenção manual, sem deixar o sistema em estado inconsistente.
- **Conversão sem dados completos do dependente**: Dependentes podem ser criados apenas com nome e CPF. Se futuramente precisarem de mais dados para autenticação no app, a complementação é feita sob demanda, sem bloquear a conversão.
- **Cliente com múltiplas oportunidades**: O CPF/CNPJ é único na unidade. Se um cliente cancelado quiser contratar novamente, o cadastro existente deve ser reaproveitado, não duplicado.
- **Plano inativado com clientes ativos**: Clientes que contrataram um plano antes da inativação permanecem com a versão contratada. O plano inativado continua visível em modo consulta, vinculado a esses clientes.

## Requirements *(mandatory)*

### Functional Requirements

**Tenants e Usuários**

- **FR-001**: O sistema DEVE permitir que o Super Admin crie, edite e inative unidades (tenants), cada uma com seus próprios dados isolados.
- **FR-002**: O sistema DEVE permitir que o Super Admin configure a chave de API do gateway de pagamento por unidade.
- **FR-003**: O sistema DEVE permitir que o Super Admin cadastre webhooks do gateway por unidade, usando a chave configurada.
- **FR-004**: O sistema DEVE permitir que o Administrador da unidade crie, edite, inative e reative usuários administrativos dentro da sua unidade.
- **FR-005**: O sistema DEVE permitir que o Administrador crie times e associe Gerentes e Representantes a eles.
- **FR-006**: O sistema DEVE implementar controle de acesso baseado em papéis (Super Admin, Administrador, Gerente, Representante), com permissões distintas para cada papel.
- **FR-007**: O sistema DEVE isolar todos os dados por tenant — um usuário de uma unidade não pode acessar dados de outra unidade.

**Planos**

- **FR-008**: O sistema DEVE permitir que o Super Admin crie planos como rascunho, configure-os e publique-os para venda.
- **FR-009**: O sistema DEVE permitir que o Super Admin inative ou arquive planos, preservando o vínculo com clientes que já contrataram.
- **FR-010**: O sistema DEVE impedir a edição direta de planos publicados; qualquer alteração comercial exige a criação de uma nova versão do plano.
- **FR-011**: O sistema DEVE suportar versionamento de planos, onde cada versão representa uma configuração específica (valores, regras de dependentes) válida para um período.
- **FR-012**: O sistema DEVE suportar planos do tipo Pessoa Física e Pessoa Jurídica.
- **FR-013**: O sistema DEVE permitir configurar regras de dependentes por plano: quantidade inclusa, valor por dependente extra, limite máximo, faixas de preço, e regras progressivas/regressivas/fixas.
- **FR-014**: O sistema DEVE possuir um motor de cálculo que determine o valor final da venda com base na versão do plano, quantidade de dependentes e taxa de adesão.
- **FR-015**: O sistema DEVE exibir apenas planos publicados e disponíveis para venda no momento da seleção em uma oportunidade.

**Oportunidades**

- **FR-016**: O sistema DEVE permitir que Representantes criem oportunidades informando apenas nome e CPF/CNPJ.
- **FR-017**: O sistema DEVE normalizar o CPF/CNPJ e validar unicidade do documento em todos os registros da unidade (oportunidades, clientes, dependentes) antes de permitir a criação.
- **FR-018**: O sistema DEVE vincular automaticamente a oportunidade ao Representante que a criou como vendedor responsável.
- **FR-019**: O sistema DEVE oferecer uma rota interna para cada oportunidade, onde o Representante pode complementar dados cadastrais (telefone, e-mail, endereço), adicionar dependentes e consultar CEP.
- **FR-020**: O sistema DEVE integrar-se com o ViaCEP para preenchimento automático de endereço a partir do CEP, permitindo edição manual dos campos número e complemento.
- **FR-021**: O sistema DEVE liberar o botão "Gerar checkout" somente quando todos os dados obrigatórios estiverem preenchidos (nome, CPF/CNPJ, telefone, e-mail, data de nascimento, endereço completo, plano selecionado e forma de pagamento).
- **FR-022**: O sistema DEVE permitir o cancelamento de oportunidade, exigindo justificativa obrigatória de no mínimo 20 caracteres, alterando o status para "cancelada" sem excluir o registro.
- **FR-023**: O sistema DEVE tentar cancelar/excluir o cliente no gateway de pagamento quando uma oportunidade for cancelada após a geração do checkout.

**Vendas e Integração com Gateway de Pagamento**

- **FR-024**: O sistema DEVE criar uma entidade de venda no momento da geração do checkout/fatura, com status inicial "pending_payment".
- **FR-025**: O sistema DEVE suportar duas formas de pagamento iniciais: cartão de crédito (via checkout) e boleto (via fatura/cobrança).
- **FR-026**: O sistema DEVE criar ou localizar o cliente no gateway de pagamento antes de gerar a cobrança, armazenando o ID externo.
- **FR-027**: O sistema DEVE armazenar na venda a fotografia completa do plano no momento da contratação: versão, valor base, regras de dependentes, valor calculado e memória de cálculo.
- **FR-028**: O sistema DEVE processar webhooks de confirmação de pagamento de forma idempotente, evitando duplicação de transições.
- **FR-029**: O sistema DEVE, ao confirmar pagamento, mudar a venda para "confirmed", a oportunidade para "convertida", criar o cliente titular e dependentes locais como "ativo", e ativar a assinatura.

**Clientes**

- **FR-030**: O sistema DEVE criar cliente local (titular e dependentes) somente após confirmação de pagamento — nunca antes.
- **FR-031**: O sistema DEVE manter vínculo entre cliente e sua oportunidade de origem, preservando o vendedor responsável.
- **FR-032**: O sistema DEVE reaproveitar os dados pessoais preenchidos na oportunidade ao criar o cliente titular.
- **FR-033**: O sistema DEVE reaproveitar os dependentes cadastrados na oportunidade como clientes dependentes vinculados ao titular.
- **FR-034**: O sistema DEVE oferecer listagem de clientes com filtros por tipo (titular/dependente), status, vendedor, unidade, documento e nome.
- **FR-035**: O sistema DEVE oferecer rota interna para cada titular exibindo: dados pessoais, assinatura, IDs do gateway, dependentes vinculados e dados financeiros.
- **FR-036**: O sistema DEVE oferecer rota interna para cada dependente exibindo: dados pessoais, titular vinculado e status.
- **FR-037**: O sistema DEVE consultar o histórico detalhado de faturas/cobranças em tempo real no gateway de pagamento na rota do titular, usando os IDs externos armazenados.

**Financeiro e Cancelamento**

- **FR-038**: O sistema DEVE permitir o cancelamento de plano de um titular ativo, exigindo justificativa e registrando o usuário que cancelou.
- **FR-039**: O sistema DEVE, ao cancelar um plano, alterar o titular para "inativo", os dependentes para "vinculado_a_titular_inativo" ou "inativo", e solicitar o cancelamento da assinatura no gateway.
- **FR-040**: O sistema DEVE usar o status "cancelamento_pendente" quando a comunicação com o gateway falhar durante o cancelamento, registrando o erro para intervenção.
- **FR-041**: O sistema DEVE permitir a quitação de débitos de um titular inadimplente, consolidando os valores devidos e gerando uma cobrança de regularização no gateway.
- **FR-042**: O sistema DEVE calcular indicadores financeiros (totais recebidos, débitos em aberto) a partir de dados locais persistidos via snapshots e webhooks, sem depender exclusivamente de consultas em tempo real ao gateway.

**Preservação de Histórico e Auditoria**

- **FR-043**: O sistema NÃO DEVE excluir oportunidades após conversão ou cancelamento — apenas alterar status.
- **FR-044**: O sistema NÃO DEVE excluir clientes por cancelamento de plano — apenas alterar status.
- **FR-045**: O sistema NÃO DEVE excluir planos — apenas inativar ou arquivar.
- **FR-046**: O sistema DEVE registrar logs de todas as transições críticas de status (oportunidade, venda, cliente, assinatura).
- **FR-047**: O sistema DEVE armazenar IDs externos do gateway de pagamento nas entidades apropriadas (oportunidade, venda, cliente, assinatura) conforme o momento do fluxo.

**Preparação para Autenticação Futura de Clientes**

- **FR-048**: O sistema DEVE prever uma camada de identidade separada para clientes (client_auth_accounts), distinta da tabela de usuários administrativos.
- **FR-049**: O sistema DEVE permitir que um cliente (titular ou dependente) exista sem uma conta de autenticação — a conta pode ser criada posteriormente.
- **FR-050**: O sistema DEVE garantir que credenciais de autenticação de clientes não concedam acesso ao painel administrativo da plataforma.

### Key Entities

- **Tenant (Unidade)**: Representa uma unidade operacional independente. Possui slug único, chave de API do gateway de pagamento e configurações próprias. Contém usuários, times, oportunidades, clientes e vendas.
- **User (Usuário)**: Operador administrativo da plataforma. Possui papel (Super Admin, Administrador, Gerente, Representante), pertence a um tenant (exceto Super Admin) e pode pertencer a times. Autentica-se para acessar o painel administrativo.
- **Team (Time)**: Agrupamento de usuários dentro de uma unidade, com um Gerente responsável e Representantes vinculados. Usado para controle de acesso e indicadores de performance.
- **Plan (Plano)**: Produto comercial definido pelo Super Admin. Possui nome, tipo (PF/PJ), status (rascunho/publicado/inativo/arquivado) e é versionado — cada versão contém valores, regras de dependentes e configurações comerciais vigentes.
- **PlanVersion (Versão do Plano)**: Configuração específica de um plano em determinado período. Contém valor base, regra de cobrança de dependentes, limites e faixas de preço. É imutável após publicação.
- **Opportunity (Oportunidade)**: Registro de um potencial cliente. Contém nome, CPF/CNPJ normalizado, dados cadastrais complementares, dependentes vinculados, vendedor responsável, plano selecionado e status (aberta/checkout_gerado/convertida/cancelada). Nunca é excluída.
- **Sale (Venda)**: Fotografia comercial do fechamento. Vincula unidade, oportunidade, plano/versão contratados, valor calculado, forma de pagamento, IDs do gateway e status (pending_payment/confirmed/cancelled_before_payment/failed/refunded).
- **Client (Cliente)**: Pessoa convertida após pagamento confirmado. Pode ser titular (responsável pela assinatura) ou dependente (vinculado a um titular). Contém dados pessoais, IDs do gateway, status e vínculo com a oportunidade de origem.
- **Subscription (Assinatura)**: Representa a recorrência ativa do plano contratado. Vinculada ao cliente titular, contém IDs do gateway de pagamento e reflete o status da subscription externa (ativa/inadimplente/inativa/cancelamento_pendente).
- **ClientAuthAccount (Conta de Autenticação do Cliente)**: Entidade futura para autenticação de clientes em aplicativo externo. Separada dos usuários administrativos. Vinculada a um cliente (titular ou dependente), com credenciais próprias e sem permissões administrativas.
- **Payment (Pagamento/Cobrança)**: Dados resumidos de eventos financeiros recebidos via webhook do gateway de pagamento. Status de referência: pending/confirmed/overdue/cancelled/refunded/failed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um Representante consegue cadastrar uma oportunidade em menos de 30 segundos, informando apenas nome e CPF/CNPJ, incluindo a validação de unicidade do documento.
- **SC-002**: O fluxo completo de venda (oportunidade → preenchimento de dados → geração de checkout) é concluído em menos de 3 minutos por um Representante treinado.
- **SC-003**: A confirmação de pagamento via webhook converte a oportunidade e cria os clientes locais em menos de 5 segundos após o recebimento do evento.
- **SC-004**: 100% das transições de status das entidades principais (oportunidade, venda, cliente, assinatura) seguem exatamente a máquina de estados definida, sem estados inválidos.
- **SC-005**: Nenhum dado de uma unidade é acessível por usuários de outra unidade (isolamento total de tenants).
- **SC-006**: O sistema suporta a operação simultânea de pelo menos 50 unidades com tempo de resposta p95 abaixo de 2 segundos para endpoints de listagem e abaixo de 500ms para endpoints de detalhe.
- **SC-007**: O cancelamento de um plano propaga corretamente o status para o titular e todos os seus dependentes em uma única operação atômica.
- **SC-008**: 100% dos webhooks de pagamento duplicados são detectados e processados de forma idempotente, sem criar registros duplicados ou transições incorretas.
- **SC-009**: O Super Admin consegue criar, configurar e publicar um novo plano (incluindo regras de dependentes) em menos de 5 minutos.
- **SC-010**: O Administrador da unidade consegue visualizar a lista completa de clientes com filtros aplicados e acessar a rota interna de qualquer titular em menos de 10 segundos.

## Assumptions

- O gateway de pagamento utilizado é o Asaas, com suporte a checkouts (cartão de crédito) e cobranças avulsas (boleto), além de subscriptions para recorrência.
- Cada unidade terá sua própria conta no Asaas, com chave de API independente. Em ambiente de desenvolvimento, uma chave sandbox global será usada.
- O roteamento de webhooks do Asaas será feito por URL única por unidade, garantindo que eventos cheguem ao tenant correto.
- O MVP não inclui funcionalidades de CRM complexo (Kanban, múltiplos funis, automações).
- A migração de clientes entre planos (upgrade/downgrade) não faz parte do escopo inicial, mas o modelo de dados deve prever essa possibilidade futura.
- A autenticação de clientes em aplicativo externo é apenas uma preparação estrutural neste escopo — a implementação completa (OTP, sessões, dispositivos) será feita em fase posterior.
- O sistema é web-based para o painel administrativo; o aplicativo mobile para clientes é futuro e não faz parte deste escopo.
- O banco de dados utiliza isolamento lógico por tenant (coluna tenant_id), não isolamento físico (schemas ou bancos separados).
- Os usuários administrativos são criados exclusivamente por Administradores ou Super Admin — não há auto-cadastro.
- Todos os horários e datas são armazenados e exibidos no fuso horário de Brasília (GMT-3).
