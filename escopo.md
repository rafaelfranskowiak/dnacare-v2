# Lousas Consolidadas — Escopo Clube de Assinatura

Versão revisada após análise de completude, inclusão da preparação para autenticação futura de clientes, detalhamento completo do módulo de Planos e incorporação das sugestões aceitas após revisão dos gaps do projeto.

Este arquivo consolida a versão atual das lousas de trabalho do escopo, já incorporando as decisões sobre máquina de estados, criação do cliente local somente após pagamento confirmado, planos geridos e versionados pelo Super Admin, webhooks por unidade, quitação de débitos tratada como renegociação/consolidação, preparação para autenticação futura de titulares e dependentes em aplicativo externo, matriz de permissões, snapshots de dashboard, regras operacionais de inadimplência/cancelamento, normalização de documentos, eventos de negócio, onboarding de unidade e processamento assíncrono.



---

# Escopo Geral — Clube de Assinatura Multitenant

## 1. Visão geral

O sistema será uma plataforma **multitenant** para gestão de um clube de assinatura.

Cada **unidade** representa um tenant independente, com isolamento lógico dos dados.

A plataforma deverá permitir:

- Gestão de unidades/tenants;
- Gestão de usuários, times e permissões;
- Gestão centralizada de planos pelo Super Admin;
- Cadastro simples de oportunidades;
- Geração de venda a partir de checkout/fatura;
- Criação de cliente local somente após pagamento confirmado;
- Conversão de oportunidades em clientes;
- Gestão de titulares e dependentes;
- Preparação para autenticação futura de titulares e dependentes em aplicativo externo;
- Integração com Asaas para cobranças recorrentes;
- Consulta de dados financeiros;
- Cancelamento de planos;
- Quitação de débitos;
- Relatórios operacionais e comerciais.

---

## 2. Conceitos centrais

### Unidade / Tenant

Cada unidade terá sua própria operação, incluindo:

- Usuários;
- Times;
- Oportunidades;
- Clientes;
- Titulares;
- Dependentes;
- Configuração Asaas;
- Relatórios;
- Regras operacionais.

### Plano

Os planos serão geridos pelo **Super Admin**.

As unidades não criarão seus próprios planos no MVP.

As unidades venderão os planos disponibilizados pela administração central da plataforma.

Os valores, regras comerciais e disponibilidade dos planos serão definidos pelo Super Admin.

### Assinatura

A assinatura será controlada pelo Asaas via **subscriptions**.

No sistema interno, a assinatura estará vinculada ao **cliente titular**.

Dependentes não possuem assinatura própria, mas herdam a elegibilidade da assinatura do titular.

### Cliente

Quando uma oportunidade é convertida, ela passa a gerar clientes:

- Cliente titular;
- Clientes dependentes, quando existirem.

O cliente local **só será criado após confirmação de pagamento**.

Antes do pagamento confirmado, existirão apenas:

- Oportunidade;
- Venda pendente;
- Cliente criado no Asaas, se o checkout/fatura já tiver sido gerado;
- Dependentes ainda vinculados à oportunidade.

Todos os clientes locais criados após a confirmação devem manter referência à oportunidade de origem.

### Autenticação futura de clientes

Todos os clientes, sejam titulares ou dependentes, deverão estar preparados para autenticação futura em um aplicativo externo integrado ao mesmo banco de dados.

Essa autenticação não será usada para acesso ao painel administrativo do sistema.

O acesso administrativo continuará sendo feito por usuários internos da plataforma, como Super Admin, administrador da unidade, gerente e representante.

Clientes autenticáveis devem ser tratados como uma camada separada de identidade, vinculada ao cadastro do cliente.

### Venda

A venda será uma entidade própria no sistema.

Ela representa a fotografia comercial do fechamento, conectando:

- Unidade;
- Oportunidade;
- Cliente titular;
- Dependentes incluídos;
- Vendedor responsável;
- Time, quando aplicável;
- Plano contratado;
- Versão do plano contratada;
- Fotografia das regras do plano;
- Forma de pagamento;
- Valor vendido;
- IDs externos do Asaas.

A venda será criada quando o checkout ou fatura for gerado, inicialmente com status de pagamento pendente.

Quando o pagamento for confirmado pelo webhook do Asaas, a venda será confirmada, a oportunidade será convertida e os clientes locais serão criados.

---

## 3. Decisões já definidas

- O gateway de pagamento será o **Asaas**;
- Cada unidade terá sua própria conta independente no Asaas;
- A chave de API do Asaas será configurada por unidade;
- O Super Admin poderá cadastrar webhooks e eventos do Asaas via API, usando a chave da unidade;
- O roteamento de webhooks será feito preferencialmente com URL por unidade;
- Em desenvolvimento, o sistema usará uma chave sandbox global via variável de ambiente;
- Em produção, o sistema usará a chave real configurada na unidade;
- O sistema deve ser o dono da regra de negócio;
- O Asaas será tratado como motor de cobrança;
- Os planos, valores e regras comerciais serão administrados pelo Super Admin;
- Oportunidades serão simples, sem CRM complexo, Kanban ou funil avançado;
- Oportunidades não serão apagadas após conversão;
- Oportunidades permanecerão como origem comercial dos clientes e vendas;
- Vendas terão entidade própria para preservar a fotografia comercial do fechamento;
- Cliente local só nasce após pagamento confirmado;
- Antes do pagamento, o sistema mantém oportunidade, venda pendente e cliente no Asaas;
- Em cancelamento de oportunidade antes do pagamento, o sistema deverá tentar excluir/cancelar o cliente criado no Asaas, quando houver ID armazenado;
- Clientes não serão excluídos em cancelamentos de plano;
- Cancelamentos alteram status e preservam histórico;
- Titulares e dependentes devem estar preparados para futura autenticação em aplicativo externo;
- A autenticação dos clientes não deve ser misturada com a autenticação dos usuários administrativos da plataforma.

---

## 4. Módulos principais

### 4.1 Super Admin e Tenants

Área administrativa global para criação e gestão das unidades.

### 4.2 Usuários, Times e Permissões

Área única dentro da unidade para gerir usuários, cargos, gerentes, representantes e times.

### 4.3 Planos

Planos, valores e regras comerciais administrados pelo Super Admin.

As unidades venderão os planos disponibilizados pela plataforma.

### 4.4 Oportunidades

Cadastro simples de interessados, com nome e CPF/CNPJ, vinculado ao usuário vendedor.

A oportunidade deve permanecer no sistema mesmo após a conversão, com status `convertida`, preservando a origem comercial.

### 4.5 Vendas

Registro comercial do fechamento.

A venda será criada quando o checkout ou fatura for gerado e confirmada após pagamento confirmado pelo Asaas.

### 4.6 Clientes

Listagem e rota interna de titulares e dependentes.

Os clientes devem ser modelados de forma compatível com autenticação futura em aplicativo externo, sem misturar suas credenciais e permissões com os usuários administrativos da plataforma.

### 4.7 Autenticação futura de clientes

Camada futura de identidade para titulares e dependentes acessarem um aplicativo externo, vinculada ao cadastro de cliente e separada da autenticação administrativa do painel.

### 4.8 Financeiro e Asaas

Criação de cliente no Asaas, geração de checkout/fatura, subscriptions, quitação de débitos, cancelamento de plano e consulta de faturas.

### 4.9 Banco de Dados e Integrações

Estrutura técnica, entidades, relacionamentos, logs, auditoria, webhooks e integrações externas.

---

## 5. Roles gerais

### Super Admin

Usuário da plataforma com acesso global.

Pode:

- Criar e gerir unidades;
- Configurar integração Asaas por unidade;
- Acessar logs globais;
- Prestar suporte;
- Visualizar indicadores globais.

### Administrador da unidade

Gerencia a própria unidade.

Pode:

- Gerenciar equipe;
- Criar usuários;
- Criar times;
- Associar gerentes e representantes;
- Visualizar clientes e oportunidades da unidade;
- Acompanhar dados financeiros e relatórios da unidade.

### Gerente

Atua sobre um ou mais times.

Pode:

- Acompanhar representantes;
- Ver oportunidades e clientes sob sua gestão;
- Acompanhar indicadores do time.

### Representante

Atua como vendedor.

Pode:

- Criar oportunidades;
- Complementar dados;
- Gerar checkout/fatura;
- Acompanhar seus clientes e oportunidades conforme regra de acesso.

---

## 6. Regras gerais de status

As entidades principais terão uma máquina de estados formalizada.

A regra completa está documentada na lousa **Escopo Detalhado — Máquina de Estados e Transições**.

Resumo inicial:

### Oportunidade

- `aberta`;
- `checkout_gerado`;
- `convertida`;
- `cancelada`.

A oportunidade não deve ser excluída após conversão ou cancelamento.

Ela permanece como registro histórico da origem comercial.

### Venda

- `pending_payment`;
- `confirmed`;
- `cancelled_before_payment`;
- `failed`;
- `refunded`.

### Cliente titular

- `ativo`;
- `inativo`;
- `inadimplente`;
- `cancelamento_pendente`.

### Dependente

- `ativo`;
- `inativo`;
- `vinculado_a_titular_inativo`;
- `removido`, se essa função existir futuramente.

### Assinatura

- `ativa`;
- `inativa`;
- `inadimplente`;
- `cancelamento_pendente`.

---

## 7. Princípios arquiteturais

- O sistema deve preservar histórico;
- Não excluir oportunidades após conversão ou cancelamento;
- Criar cliente local somente após pagamento confirmado;
- Não excluir clientes por cancelamento de plano;
- Não migrar clientes cancelados para outra tabela;
- Separar autenticação administrativa de autenticação futura de clientes;
- Registrar logs de ações críticas;
- Processar webhooks com idempotência;
- Isolar dados por tenant;
- Armazenar IDs externos do Asaas em oportunidade, venda, assinatura e cliente, conforme o momento do fluxo;
- Consultar em tempo real no Asaas apenas o histórico detalhado de faturas/cobranças na página interna do titular; os demais indicadores devem ser calculados a partir de dados locais e snapshots;
- Evitar excesso de menus e interfaces fragmentadas.

---

## 8. Relatórios e inteligência futura

O sistema deve preservar dados para permitir indicadores futuros, como:

- Conversão de oportunidades;
- Checkouts gerados;
- Vendas pendentes;
- Vendas confirmadas;
- Vendas canceladas antes do pagamento;
- Origem dos clientes;
- Performance por vendedor;
- Cancelamentos por motivo;
- Inadimplência;
- Valores recebidos;
- Débitos em aberto;
- Vidas ativas;
- Titulares ativos;
- Dependentes ativos;
- Clientes com acesso ao app ativado;
- Clientes sem acesso ao app ativado;
- Performance por unidade;
- Performance por time.


---

# Escopo Detalhado — Máquina de Estados e Transições

## 1. Objetivo

Esta lousa formaliza os status e transições das principais entidades do sistema.

O objetivo é evitar inconsistências como:

- Venda confirmada sem pagamento confirmado;
- Cliente local criado antes da confirmação financeira;
- Oportunidade convertida sem venda confirmada;
- Assinatura ativa sem cliente ativo;
- Subscription cancelada no Asaas e ativa no sistema;
- Webhook duplicado causando alteração incorreta de status.

---

## 2. Princípio central

O sistema deve tratar cada entidade com responsabilidade própria:

- Oportunidade representa a origem comercial;
- Venda representa a tentativa/fechamento comercial;
- Cliente local representa pessoa efetivamente convertida após pagamento;
- Assinatura representa a recorrência ativa/inativa;
- Pagamento representa evento financeiro;
- Asaas representa o motor externo de cobrança.

---

## 3. Oportunidade — Status e transições

### Status permitidos

```txt
aberta
checkout_gerado
convertida
cancelada
```

### Transições permitidas

```txt
aberta -> checkout_gerado
aberta -> cancelada
checkout_gerado -> convertida
checkout_gerado -> cancelada
```

### Regras

- A oportunidade nasce como `aberta`;
- Ao gerar checkout/fatura, muda para `checkout_gerado`;
- Ao receber pagamento confirmado, muda para `convertida`;
- Se for interrompida antes da conversão, muda para `cancelada`;
- Oportunidade nunca deve ser excluída;
- Oportunidade convertida permanece como origem comercial do cliente e da venda;
- Oportunidade cancelada deve manter motivo, usuário responsável, data e dados preenchidos.

### Cancelamento de oportunidade com cliente no Asaas

Se a oportunidade já tiver gerado checkout/fatura, é possível que já exista um cliente criado no Asaas.

Nesse caso, ao cancelar a oportunidade:

1. O usuário deve informar justificativa obrigatória;
2. O sistema altera a oportunidade para `cancelada`;
3. Se houver venda pendente vinculada, a venda muda para `cancelled_before_payment`;
4. Se houver `asaas_customer_id` vinculado à oportunidade ou à venda, o sistema deverá tentar excluir/cancelar esse cliente no Asaas, quando permitido pela API;
5. O retorno da API do Asaas deve ser registrado;
6. Se a exclusão/cancelamento no Asaas falhar, o erro deve ser registrado sem apagar a oportunidade.

---

## 4. Venda — Status e transições

### Status permitidos

```txt
pending_payment
confirmed
cancelled_before_payment
failed
refunded
```

### Transições permitidas

```txt
pending_payment -> confirmed
pending_payment -> cancelled_before_payment
pending_payment -> failed
confirmed -> refunded
```

### Regras

- Venda nasce ao gerar checkout/fatura;
- Venda nasce como `pending_payment`;
- Venda só vira `confirmed` após webhook de pagamento confirmado pelo Asaas;
- Venda `confirmed` não deve voltar para `pending_payment`;
- Cancelamento futuro do cliente não cancela a venda original;
- Se a oportunidade for cancelada antes do pagamento, a venda vira `cancelled_before_payment`;
- `refunded` representa evento financeiro posterior de estorno/reembolso, não desfaz a origem comercial.

---

## 5. Cliente local — Status e transições

### Decisão adotada

O cliente local só será criado após pagamento confirmado.

Antes do pagamento, não haverá cliente local.

Antes do pagamento existirão:

- Oportunidade;
- Venda pendente;
- Cliente no Asaas, quando checkout/fatura já tiver sido gerado;
- Dependentes vinculados à oportunidade.

### Status permitidos do titular

```txt
ativo
inadimplente
inativo
cancelamento_pendente
```

### Transições permitidas do titular

```txt
ativo -> inadimplente
inadimplente -> ativo
ativo -> cancelamento_pendente
cancelamento_pendente -> inativo
ativo -> inativo
inadimplente -> inativo
```

### Regras

- Cliente titular local nasce como `ativo` após pagamento confirmado;
- Dependentes locais também nascem após pagamento confirmado;
- O cliente local deve manter vínculo com a oportunidade de origem;
- Cancelamento de plano não exclui cliente;
- Cliente cancelado muda para `inativo`;
- Se o cancelamento no Asaas falhar, pode usar `cancelamento_pendente`.

---

## 6. Dependente — Status e transições

### Status permitidos

```txt
ativo
inativo
vinculado_a_titular_inativo
removido
```

### Transições permitidas

```txt
ativo -> vinculado_a_titular_inativo
ativo -> removido
vinculado_a_titular_inativo -> ativo
removido -> ativo
```

### Regras

- Dependente local só nasce após pagamento confirmado;
- Antes disso, fica apenas como dependente da oportunidade;
- Dependente herda elegibilidade do titular;
- Se titular fica inativo, dependente perde elegibilidade;
- Dependente não precisa ter dados completos, apenas nome e CPF.

---

## 7. Assinatura — Status e transições

### Status permitidos

```txt
ativa
inadimplente
inativa
cancelamento_pendente
```

### Transições permitidas

```txt
ativa -> inadimplente
inadimplente -> ativa
ativa -> cancelamento_pendente
cancelamento_pendente -> inativa
ativa -> inativa
inadimplente -> inativa
```

### Regras

- Assinatura interna deve refletir a subscription no Asaas;
- Ativação ocorre após pagamento confirmado;
- Inadimplência pode ser definida por webhook de fatura vencida ou rotina de sincronização;
- Cancelamento deve notificar o Asaas para inativar/cancelar a subscription;
- Se a chamada ao Asaas falhar, usar `cancelamento_pendente` e registrar erro.

---

## 8. Pagamento/Cobrança — Status de referência

Os pagamentos/faturas são controlados pelo Asaas, mas o sistema pode armazenar dados resumidos.

Status de referência:

```txt
pending
confirmed
overdue
cancelled
refunded
failed
```

Regras:

- Pagamento confirmado aciona confirmação de venda;
- Fatura vencida pode acionar inadimplência;
- Cobrança cancelada por renegociação deve manter vínculo histórico local;
- Webhooks duplicados devem ser ignorados ou tratados de forma idempotente.

---

## 9. Eventos que disparam transições

### Usuário cria oportunidade

```txt
opportunity: aberta
```

### Usuário gera checkout/fatura

```txt
opportunity: checkout_gerado
sale: pending_payment
asaas_customer_id armazenado na oportunidade/venda
```

### Webhook confirma pagamento

```txt
sale: confirmed
opportunity: convertida
client_holder: criado como ativo
client_dependents: criados como ativos
subscription: ativa
```

### Usuário cancela oportunidade antes do pagamento

```txt
opportunity: cancelada
sale: cancelled_before_payment, se existir
asaas_customer: tentar excluir/cancelar, se existir ID
```

### Usuário cancela plano ativo

```txt
client_holder: cancelamento_pendente ou inativo
subscription: cancelamento_pendente ou inativa
asaas_subscription: inativada/cancelada
```

### Asaas confirma cancelamento da subscription

```txt
client_holder: inativo
subscription: inativa
dependents: vinculado_a_titular_inativo ou inativo
```

---

## 10. Regras de consistência

- Não criar cliente local antes de pagamento confirmado;
- Não converter oportunidade sem venda confirmada;
- Não confirmar venda sem evento de pagamento confirmado;
- Não excluir oportunidade convertida ou cancelada;
- Não excluir cliente cancelado;
- Não cancelar venda confirmada por cancelamento futuro do cliente;
- Registrar todas as transições críticas em logs/auditoria;
- Processar webhooks com idempotência.


---

# Escopo Detalhado — Oportunidades

## 1. Objetivo do módulo

O módulo de oportunidades será simples e objetivo.

Ele não deve funcionar como uma ferramenta CRM completa, não terá Kanban, múltiplas etapas de funil ou automações comerciais complexas.

A oportunidade representa uma pessoa ou empresa interessada que poderá futuramente ser convertida em cliente titular.

---

## 2. Cadastro inicial da oportunidade

Para cadastrar uma oportunidade, o usuário deve informar apenas:

- Nome;
- CPF ou CNPJ.

Antes de concluir o cadastro, o sistema deve:

- Normalizar o CPF/CNPJ informado;
- Verificar se o documento já existe em qualquer registro da unidade;
- Bloquear a criação caso encontre coincidência;
- Exibir ao usuário o registro existente e seu tipo, para reaproveitamento do cadastro.

Ao criar a oportunidade, o sistema deve registrar automaticamente:

- Unidade;
- Usuário que cadastrou;
- Vendedor responsável;
- Data de criação;
- Status inicial.

---

## 3. Vínculo com vendedor

A oportunidade deve ficar vinculada automaticamente ao usuário que realizou o cadastro.

Esse usuário será considerado o **vendedor responsável** pela oportunidade.

Esse vínculo será utilizado futuramente para:

- Controle de responsabilidade;
- Indicadores de vendas;
- Conversão por vendedor;
- Inteligência comercial;
- Relatórios de performance.

---

## 4. Regra global de unicidade de CPF/CNPJ

O CPF ou CNPJ deve ser único dentro da unidade, considerando todas as entidades que armazenam documento.

Regra prática:

- Antes de criar uma oportunidade, o sistema deve normalizar o documento e consultar todos os registros da unidade que possam possuir CPF/CNPJ;
- Se o documento já existir em qualquer oportunidade, cliente, dependente ou conta de autenticação futura, o cadastro deve ser bloqueado;
- O usuário deve ser orientado a abrir o registro existente, em vez de criar um duplicado;
- A conversão de oportunidade em cliente deve reutilizar o mesmo documento normalizado já validado na criação;
- A regra vale também para edição de oportunidade e para criação de dependentes e futuras contas de autenticação.

Para tornar essa regra robusta e prática, o sistema deve manter um controle canônico de documentos por unidade, com `document_normalized` e bloqueio transacional/índice único equivalente, evitando corrida entre cadastros simultâneos.

---

## 5. Rota interna da oportunidade

Depois de criada, cada oportunidade terá uma rota/tela interna própria.

Nessa tela, o usuário poderá:

- Visualizar os dados da oportunidade;
- Editar e complementar dados cadastrais;
- Consultar endereço via CEP;
- Adicionar dependentes;
- Gerar checkout/fatura;
- Cancelar a oportunidade;
- Visualizar status e histórico básico.

---

## 6. Edição e complementação de dados

No cadastro inicial, somente nome e CPF/CNPJ são obrigatórios.

Na rota interna, o usuário poderá complementar os seguintes dados da oportunidade:

- Nome;
- CPF ou CNPJ, respeitando unicidade;
- Telefone;
- E-mail;
- Data de nascimento;
- CEP;
- Endereço;
- Número;
- Complemento;
- Bairro;
- Cidade;
- UF.

---

## 7. Integração ViaCEP

Ao preencher o CEP, o sistema deverá consultar a API do ViaCEP em tempo real.

A consulta deverá preencher automaticamente, quando disponíveis:

- Endereço;
- Bairro;
- Cidade;
- UF.

Regras:

- Número e complemento devem permanecer editáveis manualmente;
- Se o CEP não for encontrado, permitir preenchimento manual;
- Se a API falhar, permitir preenchimento manual;
- O erro de consulta não deve impedir o usuário de continuar o cadastro.

---

## 8. Dependentes na oportunidade

Dentro da rota interna da oportunidade, o usuário poderá adicionar dependentes.

Para adicionar um dependente, devem ser informados apenas:

- Nome;
- CPF.

Regras:

- Os dependentes ficam vinculados à oportunidade enquanto ela não for convertida;
- Ao converter a oportunidade, os dependentes serão reaproveitados e vinculados ao titular gerado;
- Não permitir o mesmo CPF de dependente mais de uma vez na mesma oportunidade;
- Não permitir cadastrar como dependente o mesmo CPF/CNPJ da oportunidade/titular;
- A duplicidade de dependente entre titulares diferentes não é permitida na unidade.

---

## 9. Liberação do botão Gerar checkout

Com todos os dados obrigatórios preenchidos, o sistema deverá liberar o botão **Gerar checkout**.

Dados mínimos para liberação:

- Nome;
- CPF ou CNPJ;
- Telefone;
- E-mail;
- Data de nascimento;
- CEP;
- Endereço;
- Número;
- Bairro;
- Cidade;
- UF;
- Plano selecionado;
- Forma de pagamento selecionada.

Dependentes poderão existir, mas a obrigatoriedade dependerá da regra do plano.

---

## 10. Forma de pagamento

A forma de pagamento define o fluxo financeiro no Asaas.

Formas previstas inicialmente:

- Cartão de crédito;
- Boleto.

### Cartão de crédito

Quando a forma for cartão de crédito, o sistema utilizará o checkout do Asaas.

Fluxo:

1. Validar dados obrigatórios;
2. Criar ou localizar cliente no Asaas;
3. Salvar o ID do cliente Asaas;
4. Gerar checkout no Asaas usando o ID do cliente;
5. Salvar ID e URL do checkout;
6. Disponibilizar link ao cliente;
7. Aguardar confirmação via webhook.

### Boleto

Quando a forma for boleto, o sistema utilizará a fatura/cobrança normal do Asaas.

Fluxo:

1. Validar dados obrigatórios;
2. Criar ou localizar cliente no Asaas;
3. Salvar o ID do cliente Asaas;
4. Gerar fatura/cobrança no Asaas;
5. Salvar ID e link da cobrança;
6. Disponibilizar boleto/link de pagamento;
7. Aguardar confirmação via webhook.

---

## 11. Cancelamento da oportunidade

A oportunidade poderá ser cancelada, mas nunca excluída.

Para cancelar, o usuário deverá informar uma justificativa obrigatória com no mínimo **20 caracteres**.

Ao cancelar:

- O status muda para `cancelada`;
- A justificativa é salva;
- A data do cancelamento é registrada;
- O usuário que cancelou é registrado;
- Os dados da oportunidade permanecem preservados;
- O histórico do cancelamento fica disponível para controle e inteligência comercial;
- Se houver venda pendente vinculada, a venda deverá mudar para `cancelled_before_payment`;
- Se já houver `asaas_customer_id` vinculado à oportunidade ou à venda, o sistema deverá tentar excluir/cancelar esse cliente no Asaas, quando permitido pela API;
- O retorno ou erro da API do Asaas deverá ser registrado para auditoria.

---

## 12. Conversão em cliente

Uma oportunidade poderá ser convertida em cliente somente após confirmação de pagamento.

Decisão adotada:

- Cliente local não nasce no momento da geração do checkout;
- Antes do pagamento, existem apenas oportunidade, venda pendente e cliente no Asaas;
- A pessoa principal da oportunidade só vira cliente titular local após webhook de pagamento confirmado;
- Os dependentes da oportunidade só viram clientes dependentes locais após webhook de pagamento confirmado.

Na conversão:

- A pessoa principal vira cliente titular;
- Os dependentes viram clientes dependentes;
- Os dados pessoais preenchidos são reaproveitados;
- A oportunidade permanece registrada como origem do cliente;
- O vendedor responsável é preservado no vínculo histórico.

Dados reaproveitados:

- Nome;
- CPF/CNPJ;
- Telefone;
- E-mail;
- Data de nascimento;
- Endereço;
- Dependentes.

---

## 13. Fluxo resumido

1. Usuário cria oportunidade com nome e CPF/CNPJ;
2. Sistema valida unicidade do documento;
3. Sistema vincula oportunidade ao usuário criador;
4. Usuário complementa dados na rota interna;
5. Sistema consulta ViaCEP ao informar CEP;
6. Usuário adiciona dependentes, se houver;
7. Usuário seleciona plano e forma de pagamento;
8. Sistema libera botão Gerar checkout;
9. Sistema cria/localiza cliente no Asaas;
10. Sistema gera checkout ou fatura;
11. Cliente paga;
12. Webhook confirma pagamento;
13. Oportunidade é convertida em cliente titular e dependentes.


---

# Escopo Detalhado — Clientes, Titulares e Dependentes

## 1. Objetivo do módulo

O módulo de clientes será responsável por listar, consultar e gerenciar os clientes gerados a partir da conversão de oportunidades.

Quando uma oportunidade for convertida após pagamento confirmado, ela passará a representar um cliente titular e, quando existirem dependentes, também clientes dependentes.

---

## 2. Conceito de cliente

No sistema, tanto titulares quanto dependentes serão tratados como clientes.

A diferença estará no papel de cada um dentro da assinatura:

- **Titular**: cliente principal responsável pelo plano e pela assinatura;
- **Dependente**: cliente vinculado ao titular e dependente da elegibilidade da assinatura do titular.

Deve ser possível diferenciar claramente quem é titular e quem é dependente.

---

## 2.1 Preparação para autenticação futura

Todos os clientes, titulares e dependentes, deverão estar preparados para autenticação futura em um aplicativo externo integrado ao mesmo banco de dados.

Essa autenticação será exclusiva do aplicativo do cliente e não dará acesso ao painel administrativo da plataforma.

A autenticação dos clientes deve ser tratada em uma camada separada, vinculada ao cadastro do cliente.

Regras principais:

- Titulares e dependentes podem futuramente ter conta de acesso ao app;
- O cliente pode existir sem conta de acesso ao app;
- A criação da conta de acesso pode ocorrer posteriormente, quando o app for desenvolvido;
- As credenciais do cliente não devem ser misturadas com os usuários administrativos;
- A autenticação do cliente deve validar também elegibilidade de uso, não apenas login.

Exemplo de modelagem futura:

```txt
clients
client_auth_accounts
client_sessions
client_login_codes
client_devices
```

---

## 3. Origem do cliente

Todo cliente criado a partir de uma oportunidade deve manter referência à oportunidade de origem.

Essa informação será usada futuramente para:

- Indicadores de conversão;
- Inteligência de mercado;
- Origem comercial;
- Performance de vendedores;
- Relatórios de clientes gerados por oportunidade;
- Análise de cancelamento por origem.

Também deve ser possível rastrear o vendedor responsável pela oportunidade que originou o cliente.

---

## 4. Conversão de oportunidade em cliente

O cliente local só será criado após confirmação de pagamento pelo Asaas.

Antes dessa confirmação, o sistema mantém:

- Oportunidade;
- Venda pendente;
- Cliente no Asaas, se checkout/fatura já tiver sido gerado;
- Dependentes vinculados à oportunidade.

Ao converter uma oportunidade:

1. A venda deve estar confirmada;
2. A pessoa principal da oportunidade vira cliente titular local;
3. Os dependentes cadastrados na oportunidade viram clientes dependentes locais;
4. Os dados pessoais preenchidos na oportunidade são reaproveitados;
5. O mesmo `document_normalized` já validado na oportunidade deve ser reutilizado no cliente local;
6. O vínculo com a oportunidade de origem é preservado;
7. O vínculo com o usuário/vendedor responsável é preservado;
8. Os IDs do Asaas devem ser vinculados ao titular/assinatura quando gerados.

---

## 5. Dados do cliente titular

O cliente titular utilizará os dados pessoais já preenchidos na oportunidade.

Campos previstos:

- Nome;
- CPF ou CNPJ;
- Telefone;
- E-mail;
- Data de nascimento;
- CEP;
- Endereço;
- Número;
- Complemento;
- Bairro;
- Cidade;
- UF;
- Unidade;
- Oportunidade de origem;
- Vendedor responsável;
- Tipo de cliente: titular;
- Status;
- ID do cliente no Asaas;
- ID da assinatura/subscription no Asaas;
- Data de criação;
- Data de atualização.

---

## 6. Dados do cliente dependente

O dependente também será um cliente, mas com preenchimento mais simples.

Dados obrigatórios iniciais:

- Nome;
- CPF.

Dados opcionais/complementares:

- Telefone;
- E-mail;
- Data de nascimento;
- CEP;
- Endereço;
- Número;
- Complemento;
- Bairro;
- Cidade;
- UF.

O dependente não precisa ter os dados pessoais complementares preenchidos obrigatoriamente.

Apenas nome e CPF já são suficientes para cadastro inicial.

---

## 7. Vínculo entre titular e dependente

Todo dependente deve estar vinculado a um titular.

Regras:

- Titular pode possuir um ou mais dependentes;
- Dependente deve possuir referência ao titular responsável;
- Dependente herda a elegibilidade da assinatura do titular;
- Se o titular ficar inativo, cancelado ou inelegível, o dependente também perde elegibilidade;
- Dependente pode ter rota interna própria.

---

## 8. IDs do Asaas

É importante armazenar corretamente os identificadores externos do Asaas.

Para o titular:

- ID do cliente no Asaas;
- ID da assinatura/subscription no Asaas.

Para o dependente:

- Referência ao titular;
- Referência ao ID do cliente Asaas do titular, quando aplicável;
- Referência ao ID da assinatura/subscription do titular, quando aplicável.

Esses vínculos são importantes para:

- Consulta financeira;
- Histórico de faturas;
- Cancelamento de plano;
- Quitação de débitos;
- Validação de elegibilidade;
- Auditoria.

---

## 9. Listagem de clientes

O sistema deverá possuir uma página que lista todos os clientes da unidade.

A listagem deve permitir identificar:

- Nome;
- CPF/CNPJ;
- Tipo: titular ou dependente;
- Titular vinculado, se for dependente;
- Quantidade de dependentes, se for titular;
- Status;
- Oportunidade de origem;
- Vendedor responsável;
- Data de criação;
- Status da assinatura, quando aplicável.

Filtros úteis:

- Titulares;
- Dependentes;
- Ativos;
- Inativos;
- Inadimplentes;
- Por vendedor;
- Por unidade;
- Por documento;
- Por nome.

---

## 10. Rota interna do titular

Cada titular deve possuir uma rota/tela interna própria.

Essa tela deve exibir:

- Dados pessoais do titular;
- Oportunidade de origem;
- Vendedor responsável;
- Dados da assinatura;
- ID do cliente no Asaas;
- ID da subscription no Asaas;
- Relação de dependentes vinculados;
- Dados financeiros consultados no Asaas;
- Histórico de faturas;
- Botão Quitar débitos;
- Botão Cancelar plano, quando ativo.

---

## 11. Relação de dependentes na rota do titular

Na rota interna do titular, deve ser exibida a lista de dependentes vinculados.

Cada dependente listado deve exibir:

- Nome;
- CPF;
- Status;
- Link/ação para acessar rota interna do dependente.

---

## 12. Rota interna do dependente

Cada dependente também terá uma rota/tela interna própria.

Essa tela deve exibir:

- Nome;
- CPF;
- Titular vinculado;
- Oportunidade de origem;
- Status;
- Dados pessoais complementares, se preenchidos.

Nessa tela será possível complementar os dados pessoais do dependente, mas isso não será obrigatório.

---

## 13. Status do cliente

Status iniciais possíveis:

### Titular

- Ativo;
- Inativo;
- Inadimplente;
- Cancelamento pendente.

### Dependente

- Ativo;
- Inativo;
- Vinculado a titular inativo;
- Removido, se essa funcionalidade for criada futuramente.

---

## 14. Cancelamento de titular

Quando o plano de um titular for cancelado:

- O titular muda de status `ativo` para `inativo`;
- O titular não é excluído;
- O titular não é movido para outra tabela;
- Os dependentes perdem elegibilidade;
- O histórico permanece preservado;
- O motivo do cancelamento fica armazenado;
- O usuário que cancelou fica registrado;
- A subscription no Asaas deve ser inativada/cancelada.

---

## 15. Dados financeiros na rota do titular

Na rota interna do titular, serão exibidos dados financeiros como:

- Valor total já recebido;
- Valores devidos;
- Histórico de faturas;
- Status das faturas;
- Links de pagamento, quando disponíveis.

A listagem detalhada de faturas/cobranças pode ser consultada em tempo real na API do Asaas, mas os totais e indicadores devem vir de dados locais persistidos a partir de webhooks e snapshots.

O histórico detalhado deve ser consultado em tempo real na API do Asaas usando:

- ID do cliente no Asaas;
- ID da subscription no Asaas.

---

## 16. Regras importantes

- Cliente cancelado permanece no sistema;
- Cliente não deve ser excluído por alteração de status;
- Cliente deve manter vínculo com oportunidade de origem;
- Dependente deve manter vínculo com titular;
- Dependente não precisa ter dados completos;
- Titular deve ter dados completos para viabilizar cobrança;
- IDs externos do Asaas são obrigatórios para rotinas financeiras;
- Status operacional interno e status financeiro externo devem ser controlados com cuidado.


---


# Escopo Detalhado — Autenticação Futura de Clientes

## 1. Objetivo

Este escopo prepara o sistema para que, futuramente, todos os clientes possam autenticar em um aplicativo externo integrado ao mesmo banco de dados.

A autenticação futura será aplicável tanto a:

- Clientes titulares;
- Clientes dependentes.

Essa autenticação não será utilizada para acesso ao painel administrativo do sistema.

---

## 2. Separação entre usuários administrativos e clientes autenticáveis

O sistema deverá manter duas camadas de identidade separadas.

### Usuários administrativos

São usuários que acessam e operam o painel web:

- Super Admin;
- Administrador da unidade;
- Gerente;
- Representante.

Esses usuários continuam usando a estrutura administrativa de autenticação, permissões, roles e vínculo com unidade.

### Clientes autenticáveis

São titulares e dependentes que futuramente poderão acessar um aplicativo externo.

Esses clientes não devem ser tratados como usuários administrativos da tenant.

Eles devem possuir uma camada própria de autenticação, vinculada ao registro de cliente.

---

## 3. Princípio central

Cliente é cadastro de pessoa.

Usuário administrativo é operador do sistema.

Conta de autenticação do cliente é uma camada separada, vinculada ao cliente.

A existência de um cliente não obriga a existência imediata de uma conta de acesso ao app.

---

## 4. Entidade sugerida: client_auth_accounts

Tabela sugerida:

```txt
client_auth_accounts
```

Campos sugeridos:

```txt
id
client_id
unit_id
email
phone
document
password_hash
auth_provider
is_active
last_login_at
email_verified_at
phone_verified_at
created_at
updated_at
```

O campo `client_id` aponta para um cliente titular ou dependente.

---

## 5. Cliente pode existir sem acesso ao app

Nem todo cliente precisa ter uma conta de autenticação criada imediatamente.

Exemplo:

```txt
client.status = ativo
client_auth_account = null
```

Quando o app for desenvolvido, o sistema poderá permitir ativar o acesso:

```txt
client_auth_account criado
is_active = true
```

---

## 6. Titular e dependente podem autenticar

A autenticação futura deve aceitar clientes dos dois tipos:

```txt
client_type = holder
client_type = dependent
```

Não deve haver restrição para apenas titulares.

Dependentes também poderão ter conta de acesso ao app.

---

## 7. Dados necessários para autenticação futura

Hoje o dependente pode existir apenas com:

- Nome;
- CPF.

Para autenticação futura, poderá ser necessário complementar dados como:

- Telefone;
- E-mail;
- Data de nascimento;
- Senha;
- Verificação por código;
- Dispositivo autorizado.

Por isso, a rota interna do dependente deve permitir complementação posterior de dados pessoais.

---

## 8. Estratégias possíveis de login

Opções futuras:

- Telefone + OTP;
- E-mail + senha;
- CPF + data de nascimento + criação de senha;
- CPF + OTP no telefone cadastrado.

Recomendação preliminar:

- Para aplicativo mobile, telefone + OTP tende a ser uma experiência simples para público amplo.

---

## 9. Entidades futuras possíveis

Além de `client_auth_accounts`, o app poderá exigir:

```txt
client_sessions
client_password_resets
client_login_codes
client_devices
```

### client_sessions

Registra sessões ativas de clientes.

### client_login_codes

Registra códigos temporários de autenticação, se for usado OTP.

### client_devices

Registra dispositivos vinculados ao cliente, útil para app mobile.

---

## 10. Elegibilidade no app

O app não deve apenas autenticar o cliente.

Ele também precisa validar se o cliente está elegível para usar os benefícios.

Exemplos:

```txt
cliente autenticado + assinatura ativa = elegível
```

```txt
cliente autenticado + titular inadimplente = não elegível
```

Para dependente:

```txt
dependente ativo + titular ativo + assinatura ativa = elegível
```

```txt
dependente ativo + titular inativo = não elegível
```

---

## 11. Permissões do cliente no app

O cliente autenticado no app deverá ter escopo limitado.

Possíveis permissões futuras:

- Ver própria carteirinha;
- Ver status do plano;
- Ver dados pessoais;
- Atualizar dados permitidos;
- Ver dependentes, se for titular;
- Ver titular vinculado, se for dependente;
- Consultar rede credenciada, se existir;
- Solicitar suporte, se existir.

O cliente nunca deve ter acesso a permissões administrativas da unidade.

---

## 12. Regras importantes

- Não misturar clientes autenticáveis com usuários administrativos;
- Titulares e dependentes podem ter acesso futuro ao app;
- Cliente pode existir sem login criado;
- Login do app deve estar vinculado ao cliente;
- Autenticação deve ser separada de elegibilidade;
- Dependente pode precisar complementar dados antes de ativar acesso;
- Cliente cancelado/inativo pode continuar autenticando, mas pode não estar elegível para uso de benefícios, conforme regra futura do app.


# Escopo Detalhado — Planos

## 1. Objetivo do módulo

O módulo de planos será responsável por permitir que o **Super Admin** crie, configure, publique, inative e versione os planos disponíveis para venda nas unidades.

As unidades não criarão seus próprios planos.

As unidades venderão os planos disponibilizados pelo Super Admin.

O plano é uma peça central do sistema, pois influencia:

- Oportunidades;
- Vendas;
- Clientes titulares;
- Dependentes;
- Assinaturas;
- Valor da cobrança;
- Quantidade de vidas;
- Regras de dependentes;
- Indicadores financeiros;
- Histórico comercial.

---

## 2. Gestão pelo Super Admin

Somente o Super Admin poderá gerir planos.

O Super Admin poderá:

- Criar plano;
- Editar rascunho do plano; planos publicados exigem nova versão;
- Publicar plano;
- Inativar plano;
- Duplicar plano para criar nova versão;
- Definir valores;
- Definir regras de dependentes;
- Definir se o plano é pessoa física ou pessoa jurídica;
- Definir se o plano está disponível para venda;
- Consultar clientes/vendas vinculados a versões anteriores do plano.

---

## 3. Tipos iniciais de plano

Inicialmente existirão dois grandes tipos de plano:

- Plano Pessoa Física;
- Plano Pessoa Jurídica.

### 3.1 Plano Pessoa Física

Plano contratado por uma pessoa física.

O titular será uma pessoa física com CPF.

Pode possuir dependentes vinculados, conforme regras configuradas no plano.

### 3.2 Plano Pessoa Jurídica

Plano contratado por uma pessoa jurídica.

O titular poderá ser uma empresa com CNPJ.

A pessoa jurídica também poderá possuir dependentes vinculados.

Nesse contexto, os dependentes representam vidas/pessoas físicas associadas ao titular pessoa jurídica.

---

## 4. Dependentes em planos PF e PJ

Tanto planos pessoa física quanto pessoa jurídica poderão ter dependentes.

O Super Admin poderá configurar regras como:

- Limite de dependentes;
- Quantidade de dependentes inclusos;
- Valor por dependente adicional;
- Cobrança progressiva por dependente;
- Cobrança regressiva por dependente;
- Faixas de preço por quantidade de dependentes;
- Valor fixo por grupo de dependentes;
- Permitir ou não dependentes;
- Quantidade mínima de dependentes, se aplicável;
- Quantidade máxima de dependentes, se aplicável.

---

## 5. Configurações principais do plano

Campos sugeridos para o plano:

- Nome do plano;
- Descrição;
- Tipo do plano: pessoa física ou pessoa jurídica;
- Status;
- Disponível para venda;
- Valor base;
- Ciclo de cobrança;
- Quantidade de dependentes inclusos;
- Limite máximo de dependentes;
- Regra de cobrança de dependentes;
- Valor padrão por dependente;
- Configuração de faixas de dependentes;
- Taxa de adesão, se houver;
- Observações internas;
- Data de criação;
- Data de publicação;
- Data de inativação.

---

## 6. Status do plano

Planos não devem ser excluídos.

Planos devem ser mantidos para histórico.

Status sugeridos:

```txt
rascunho
publicado
inativo
arquivado
```

### rascunho

Plano criado, mas ainda não disponível para venda.

### publicado

Plano ativo e disponível para venda pelas unidades.

### inativo

Plano não está mais disponível para novas vendas, mas permanece vinculado a clientes, vendas e assinaturas antigas.

### arquivado

Plano antigo, não disponível para venda, mantido apenas para histórico e consulta administrativa.

---

## 7. Regra central de histórico

Planos não devem ser alterados retroativamente para clientes que já contrataram.

Quando um cliente contrata um plano, o sistema deve preservar a fotografia da configuração vigente naquele momento.

Se o Super Admin alterar preço, limite de dependentes ou qualquer regra comercial, a alteração deverá valer apenas para novas vendas dali em diante.

Clientes já ativos devem permanecer com as regras e valores contratados originalmente, salvo processo futuro específico de migração de plano.

---

## 8. Versionamento de planos

Como planos podem mudar ao longo do tempo, o sistema deve possuir estratégia de versionamento.

Recomendação:

- Separar o conceito de plano comercial do conceito de versão do plano.

Exemplo:

```txt
plans
plan_versions
```

### plans

Representa o produto comercial em sentido amplo.

Exemplo:

- Plano Família PF;
- Plano Empresarial PJ.

### plan_versions

Representa uma configuração específica daquele plano em determinado período.

Exemplo:

- Plano Família PF v1 — R$ 99,90, até 3 dependentes;
- Plano Família PF v2 — R$ 119,90, até 4 dependentes;
- Plano Família PF v3 — R$ 129,90, dependentes por faixa progressiva.

---

## 9. Regra de alteração de plano publicado

Planos publicados não devem ser editados diretamente.

Qualquer alteração comercial em um plano publicado deve ser feita por nova versão, preservando o histórico dos contratos já firmados.

Fluxo recomendado:

1. Super Admin acessa o plano publicado;
2. Solicita alteração de preço/regra;
3. Sistema bloqueia a edição direta do registro atual;
4. Sistema orienta a criação de uma nova versão do plano;
5. Nova versão é publicada para novas vendas;
6. A versão anterior é inativada para novas vendas, sem afetar clientes, vendas e assinaturas já existentes.

---

## 10. Inativação de planos

Planos não devem ser excluídos.

Ao inativar um plano:

- O plano deixa de aparecer para novas vendas;
- O plano permanece visível para consulta administrativa;
- Vendas antigas continuam apontando para o plano/versão contratada;
- Assinaturas antigas continuam com a versão contratada;
- Clientes antigos continuam vinculados à configuração histórica;
- Relatórios permanecem consistentes.

---

## 11. Fotografia do plano na venda

Além de vincular a venda ao plano e à versão do plano, a venda deve armazenar uma fotografia dos valores e regras aplicadas no momento da contratação.

Isso evita inconsistência caso o plano seja alterado no futuro.

A venda deve guardar, por exemplo:

- Nome do plano contratado;
- Tipo do plano;
- Versão do plano;
- Valor base no momento da venda;
- Quantidade de dependentes inclusos;
- Regra de cobrança de dependentes usada;
- Valor por dependente, se aplicável;
- Quantidade de dependentes contratados;
- Valor total calculado;
- Taxa de adesão, se houver;
- Descontos, se houver.

---

## 12. Fotografia do plano na assinatura

A assinatura também deve guardar a versão do plano contratada.

Campos importantes:

- ID do plano;
- ID da versão do plano;
- Nome do plano no momento da contratação;
- Valor recorrente contratado;
- Regra de dependentes contratada;
- Quantidade de dependentes contratados;
- Data de início;
- Status;
- ID da subscription no Asaas.

A assinatura não deve depender dinamicamente do valor atual do plano publicado.

---

## 13. Regras de precificação de dependentes

O sistema deve suportar diferentes modelos de precificação para dependentes.

### 13.1 Sem dependentes

Plano não permite dependentes.

### 13.2 Dependentes inclusos

Plano permite uma quantidade de dependentes inclusos no valor base.

Exemplo:

```txt
Valor base: R$ 99,90
Dependentes inclusos: 2
Dependente extra: R$ 20,00
```

### 13.3 Valor fixo por dependente

Cada dependente adicional possui o mesmo valor.

Exemplo:

```txt
Cada dependente adicional: R$ 25,00
```

### 13.4 Valor progressivo

O valor aumenta conforme a quantidade de dependentes.

Exemplo:

```txt
1º dependente extra: R$ 20,00
2º dependente extra: R$ 25,00
3º dependente extra: R$ 30,00
```

### 13.5 Valor regressivo

O valor diminui conforme a quantidade de dependentes.

Exemplo:

```txt
1º dependente extra: R$ 30,00
2º dependente extra: R$ 25,00
3º dependente extra: R$ 20,00
```

### 13.6 Faixas de quantidade

Preço definido por faixas.

Exemplo:

```txt
1 a 5 dependentes: R$ 20,00 cada
6 a 10 dependentes: R$ 15,00 cada
11 ou mais: R$ 12,00 cada
```

---

## 14. Motor de cálculo do plano

O sistema deve possuir uma função/motor de cálculo para calcular o valor final da venda e da assinatura com base nas regras do plano.

Entradas do cálculo:

- Tipo do plano;
- Versão do plano;
- Valor base;
- Quantidade de dependentes;
- Dependentes inclusos;
- Regra de cobrança de dependentes;
- Faixas de preço;
- Taxa de adesão;
- Desconto, se futuramente existir.

Saídas do cálculo:

- Valor base;
- Valor dos dependentes;
- Valor de adesão;
- Subtotal;
- Desconto;
- Valor final;
- Memória de cálculo.

A memória de cálculo deve poder ser armazenada na venda para auditoria.

---

## 15. Relação com oportunidade

Na oportunidade, o usuário deverá selecionar um plano disponível para venda.

O sistema deve exibir apenas planos publicados e disponíveis para novas vendas.

Ao selecionar o plano e informar dependentes, o sistema poderá calcular o valor previsto da venda.

Quando o checkout/fatura for gerado:

- A venda será criada;
- A versão do plano usada será congelada na venda;
- O valor calculado será preservado;
- A oportunidade muda para `checkout_gerado`.

---

## 16. Relação com venda

A venda deve armazenar:

- ID do plano;
- ID da versão do plano;
- Fotografia do plano;
- Quantidade de dependentes;
- Total de vidas;
- Valor calculado;
- Memória de cálculo;
- Forma de pagamento;
- Status da venda.

---

## 17. Relação com assinatura

Quando o pagamento for confirmado e a assinatura for ativada, a assinatura interna deverá apontar para a mesma versão de plano usada na venda.

A assinatura deve preservar:

- Valor recorrente contratado;
- Plano contratado;
- Versão contratada;
- Quantidade de dependentes contratada;
- Regras vigentes no momento da contratação.

---

## 18. Relação com Asaas

O sistema deve calcular o valor internamente com base na versão do plano selecionada.

Ao criar checkout, cobrança ou subscription no Asaas, o valor enviado deve ser o valor calculado pelo sistema.

O Asaas será o motor de cobrança, mas a regra comercial do plano pertence ao sistema.

---

## 19. Migração futura de plano

A mudança de um cliente ativo para outro plano não faz parte do escopo inicial, mas deve ser prevista como possibilidade futura.

Quando existir, a migração de plano deverá ser um evento explícito, auditável e não deve ocorrer automaticamente apenas porque o Super Admin alterou um plano publicado.

Possíveis cenários futuros:

- Upgrade;
- Downgrade;
- Migração para nova versão;
- Reprecificação manual;
- Alteração de limite de dependentes;
- Troca de pessoa física para pessoa jurídica, se permitido.

---

## 20. Relatórios relacionados a planos

O sistema poderá gerar indicadores como:

- Vendas por plano;
- Vendas por versão de plano;
- Receita recorrente por plano;
- Cancelamentos por plano;
- Cancelamentos por versão;
- Churn por plano;
- Inadimplência por plano;
- Ticket médio por plano;
- Quantidade média de dependentes por plano;
- Vidas ativas por plano;
- Planos mais vendidos;
- Planos inativos com clientes ativos vinculados.

---

## 21. Regras importantes

- Planos são geridos pelo Super Admin;
- Unidades não criam planos;
- Unidades vendem planos disponibilizados pelo Super Admin;
- Planos podem ser pessoa física ou pessoa jurídica;
- Pessoa jurídica pode ter dependentes;
- Planos não devem ser excluídos;
- Planos devem ser inativados quando não forem mais vendidos;
- Planos publicados não devem ser editados diretamente; mudanças comerciais exigem nova versão;
- Clientes antigos preservam a versão contratada;
- Vendas preservam a fotografia do plano no momento do fechamento;
- Assinaturas preservam a versão contratada;
- O valor da assinatura ativa não deve mudar automaticamente quando o plano for alterado para novas vendas;
- O motor de cálculo do plano deve ser determinístico, auditável e armazenar memória de cálculo.

---

## 22. Pendências para definição posterior

- Existirá taxa de adesão no MVP?
- Existirá desconto no MVP?
- Existirá plano anual no MVP?
- Existirá cupom promocional no MVP?
- O plano poderá ter vigência de início/fim para venda?
- Planos poderão ser vendidos apenas por algumas unidades ou todos os planos serão globais para todas as unidades?
- A pessoa jurídica titular exigirá dados de responsável legal?
- A pessoa jurídica poderá ter limite mínimo de dependentes?
- Haverá preço por faixa em pacote fechado ou preço por dependente dentro da faixa?


# Escopo Detalhado — Financeiro e Asaas

## 1. Objetivo do módulo

O módulo financeiro será responsável pela integração com o Asaas e pelas rotinas relacionadas a cobrança, assinatura, checkout, faturas, quitação de débitos, cancelamento de plano e consulta financeira.

O Asaas será o motor de cobrança.

O sistema interno será o dono da regra de negócio.

---

## 2. Conta Asaas por unidade

Cada unidade terá sua própria conta independente no Asaas.

A chave de API do Asaas será configurada por unidade no painel Super Admin.

Isso significa que cada tenant terá sua própria operação financeira.

O Super Admin também deverá conseguir configurar webhooks da conta Asaas da unidade via API, usando a chave cadastrada para aquela tenant.

---

## 3. Ambientes Asaas

O sistema deve estar preparado para operar em:

- Desenvolvimento/sandbox;
- Produção.

### Desenvolvimento

Em ambiente de desenvolvimento, o sistema deverá utilizar:

- URL sandbox do Asaas;
- Chave sandbox global definida via variável de ambiente.

Nesse ambiente, o sistema deve ignorar as chaves reais das unidades.

Exemplo conceitual:

```env
APP_ENV=development
ASAAS_ENV=sandbox
ASAAS_SANDBOX_API_KEY=chave_sandbox_global
ASAAS_SANDBOX_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_PRODUCTION_BASE_URL=https://api.asaas.com/v3
```

### Produção

Em produção, o sistema deverá utilizar:

- URL oficial do Asaas;
- Chave de API configurada na unidade.

Exemplo conceitual:

```env
APP_ENV=production
ASAAS_ENV=production
ASAAS_PRODUCTION_BASE_URL=https://api.asaas.com/v3
```

---

## 4. Resolução da chave Asaas

Fluxo recomendado:

1. Sistema identifica a unidade da operação;
2. Sistema identifica o ambiente atual;
3. Se for sandbox/desenvolvimento:
   - usa chave sandbox global;
   - usa URL sandbox;
4. Se for produção:
   - busca chave configurada na unidade;
   - usa URL de produção;
5. Se a unidade não tiver chave configurada em produção:
   - bloquear operação financeira;
   - exibir erro administrativo;
   - registrar log.

---

## 5. Armazenamento seguro da chave

A chave de API do Asaas deve ser armazenada com segurança.

Regras:

- Não salvar em texto puro, se possível;
- Criptografar no banco;
- Não exibir integralmente na interface após salva;
- Permitir substituição da chave;
- Registrar data da última alteração;
- Registrar usuário que alterou;
- Permitir teste de conexão.

---

## 6. Criação/localização de cliente no Asaas

Antes de gerar checkout, fatura ou assinatura, o sistema deve criar ou localizar o cliente no Asaas.

Essa criação no Asaas ocorre antes da criação do cliente local.

Decisão adotada:

- Antes do pagamento confirmado, não haverá cliente local;
- A oportunidade/venda poderá ter um `asaas_customer_id` armazenado;
- Esse ID será usado para gerar checkout/fatura;
- Em caso de cancelamento da oportunidade antes do pagamento, o sistema deverá tentar excluir/cancelar esse cliente no Asaas, quando permitido pela API.

Dados usados:

- Nome;
- CPF/CNPJ;
- E-mail;
- Telefone;
- Endereço, quando necessário;
- Unidade/tenant.

Após criar/localizar, o sistema deve salvar:

- ID do cliente no Asaas;
- Payload resumido ou retorno técnico, se necessário;
- Data da criação/sincronização.

---

## 7. Fluxo cartão de crédito — Checkout Asaas

Quando a forma de pagamento for cartão de crédito recorrente, o sistema utilizará o checkout do Asaas.

Durante o desenvolvimento, a documentação do Asaas deverá ser validada com apoio do MCP/documentação oficial do Asaas.

Fluxo:

1. Validar dados obrigatórios da oportunidade;
2. Criar ou localizar cliente no Asaas usando os dados do futuro cliente preenchidos na oportunidade;
3. Salvar ID do cliente Asaas na oportunidade/venda;
4. Gerar checkout no Asaas passando o ID do cliente;
5. Como o checkout estará vinculado ao cliente Asaas, os dados cadastrais deverão vir pré-preenchidos para facilitar a finalização pelo cliente;
6. Salvar ID do checkout;
7. Salvar URL do checkout;
8. Criar venda com status `pending_payment`;
9. Atualizar oportunidade para `checkout_gerado`;
10. Disponibilizar link ao cliente;
11. Aguardar confirmação por webhook;
12. Confirmado o pagamento, confirmar venda, converter oportunidade e criar cliente local.

---

## 8. Fluxo boleto — Fatura/cobrança normal

Quando a forma de pagamento for boleto, o sistema utilizará o fluxo normal de fatura/cobrança do Asaas.

Fluxo:

1. Validar dados obrigatórios;
2. Criar ou localizar cliente no Asaas;
3. Salvar ID do cliente Asaas;
4. Gerar fatura/cobrança no Asaas;
5. Salvar ID da cobrança;
6. Salvar link da cobrança/boleto;
7. Disponibilizar ao cliente;
8. Aguardar confirmação de pagamento por webhook;
9. Confirmado o pagamento, ativar assinatura/cliente.

---

## 9. Pix

Pix será utilizado inicialmente na funcionalidade de quitação de débitos.

Pode futuramente ser considerado como forma de pagamento também no fluxo inicial de venda, se desejado.

---

## 10. Subscriptions

O sistema utilizará subscriptions do Asaas para cobranças recorrentes.

A subscription deve ficar vinculada ao cliente titular.

O sistema deve armazenar:

- ID interno da assinatura;
- ID da subscription no Asaas;
- ID do cliente no Asaas;
- Unidade;
- Titular;
- Plano;
- Status;
- Valor;
- Ciclo;
- Próximo vencimento, quando disponível;
- Data de criação;
- Data de cancelamento, quando houver.

---

## 11. Histórico financeiro na rota do titular

Na rota interna do titular, o sistema deverá exibir o histórico detalhado de faturas/cobranças com consulta em tempo real ao Asaas apenas para essa listagem. Os totais e indicadores financeiros devem vir de dados locais persistidos a partir de webhooks e snapshots.

Informações previstas:

- Valor total já recebido;
- Valores vencidos;
- Valores em aberto;
- Histórico de faturas/cobranças;
- Status das faturas;
- Vencimentos;
- Links de pagamento, quando disponíveis.

O histórico completo das faturas pode permanecer no Asaas; localmente, o sistema deve manter apenas os resumos necessários para indicadores, auditoria e reconciliação.

O histórico detalhado deve ser consultado em tempo real usando:

- ID do cliente no Asaas;
- ID da subscription no Asaas.

---

## 12. Quitação de débitos / renegociação de débitos

Na rota interna do cliente titular, junto ao histórico de faturas, haverá o botão **Quitar débitos**.

Essa funcionalidade deve ser tratada como **renegociação/consolidação de débitos**, e não como simples eliminação de faturas.

O objetivo é consolidar faturas vencidas e/ou em aberto em uma nova cobrança de regularização, preservando localmente o histórico da composição da dívida.

### 12.1 Modal de quitação

Ao clicar no botão, abrirá um modal com três inputs:

- Valor;
- Data de vencimento;
- Forma de pagamento.

### 12.2 Regras do modal

- O valor virá preenchido automaticamente com a soma de todas as faturas vencidas e/ou em aberto;
- O valor poderá ser editado manualmente;
- A data de vencimento virá preenchida com o dia atual;
- A data poderá ser editada manualmente;
- As formas de pagamento disponíveis serão:
  - Boleto;
  - Pix;
  - Cartão de crédito.

### 12.3 Composição da dívida

Antes de criar a nova cobrança, o sistema deverá montar uma composição da dívida com:

- IDs das faturas/cobranças vencidas e/ou em aberto;
- Valor individual de cada fatura;
- Data de vencimento de cada fatura;
- Status de cada fatura;
- Valor total original;
- Valor final informado pelo usuário;
- Diferença entre valor original e valor final, se houver edição manual.

Essa composição deve ser armazenada localmente, mesmo que as faturas antigas sejam canceladas/substituídas no Asaas.

### 12.4 Confirmação da quitação

Ao enviar:

1. O sistema identifica faturas vencidas e/ou em aberto do cliente;
2. O sistema calcula o valor consolidado;
3. O sistema permite edição manual do valor final;
4. O sistema cria uma nova fatura/cobrança no Asaas vinculada ao cliente;
5. A nova cobrança usa valor, vencimento e forma de pagamento informados;
6. A cobrança fica vinculada ao ID do cliente no Asaas;
7. As faturas antigas devem ser canceladas, excluídas ou substituídas no Asaas **somente quando permitido pela API e pelo status da cobrança**;
8. Se o Asaas não permitir cancelar alguma fatura, o sistema deve registrar essa limitação e manter o vínculo histórico local;
9. O sistema registra a operação como renegociação/consolidação;
10. A tela atualiza o histórico financeiro em tempo real.

### 12.5 Regras de segurança e consistência

- Não assumir que toda fatura pode ser eliminada no Asaas;
- Não perder o histórico das faturas originais;
- Não gerar nova cobrança duplicada se o usuário clicar mais de uma vez;
- Usar bloqueio de processamento ou chave de idempotência interna;
- Registrar usuário responsável pela renegociação;
- Registrar retorno da API do Asaas;
- Registrar falhas parciais, como nova cobrança criada, mas fatura antiga não cancelada;
- Atualizar status financeiro do cliente apenas conforme retorno/webhook de pagamento.

### 12.6 Auditoria da quitação

Registrar:

- Cliente;
- Unidade;
- Usuário que realizou a operação;
- Valor original consolidado;
- Valor final informado;
- Forma de pagamento;
- Data de vencimento escolhida;
- Faturas antigas contempladas;
- Status original das faturas antigas;
- Nova cobrança criada;
- Retorno da API do Asaas;
- Faturas antigas canceladas/substituídas com sucesso;
- Faturas antigas que não puderam ser canceladas/substituídas;
- Data/hora da operação.

### 12.7 Status sugeridos para renegociação

```txt
pending
created
partially_replaced
completed
failed
cancelled
```

- `pending`: operação iniciada;
- `created`: nova cobrança criada;
- `partially_replaced`: algumas faturas antigas foram canceladas/substituídas e outras não;
- `completed`: nova cobrança criada e faturas antigas tratadas conforme regra possível;
- `failed`: falha antes da criação da nova cobrança;
- `cancelled`: renegociação cancelada manualmente, se essa função existir.

## 13. Cancelamento de plano

Na rota interna de um cliente titular ativo, haverá o botão **Cancelar plano**.

Ao clicar, abrirá um modal para selecionar o motivo do cancelamento.

### Motivos disponíveis

- Cancelamento voluntário;
- Inadimplência;
- Preço;
- Problema operacional;
- Migração para concorrente;
- Ausência de uso;
- Falha na cobrança.

### Fluxo do cancelamento

1. Usuário clica em Cancelar plano;
2. Sistema abre modal;
3. Usuário seleciona motivo;
4. Sistema registra motivo;
5. Sistema registra usuário responsável;
6. Sistema registra cliente e assinatura;
7. Sistema notifica o Asaas para interromper a cobrança recorrente;
8. No Asaas, a subscription é alterada para inativa/cancelada;
9. No sistema interno, o cliente titular muda de `ativo` para `inativo`;
10. Dependentes perdem elegibilidade;
11. Histórico permanece preservado.

### Dados mínimos do cancelamento

- Cliente titular cancelado;
- Unidade;
- ID da assinatura interna;
- ID da subscription no Asaas;
- Motivo;
- Usuário que cancelou;
- Data e hora;
- Status anterior;
- Status novo;
- Retorno da API do Asaas;
- Erro de integração, se houver.

### Regra importante

Cancelamento não exclui cliente e não move cliente para outra tabela.

O cancelamento apenas altera status e interrompe a cobrança recorrente.

---

## 14. Falha no cancelamento

Se a chamada ao Asaas falhar:

- Registrar erro;
- Não marcar cancelamento como concluído sem confirmação externa, ou usar status intermediário;
- Status sugerido: `cancelamento_pendente`;
- Permitir reprocessamento administrativo;
- Preservar tentativa e retorno técnico.

---

## 15. Webhooks Asaas

O sistema deverá receber e processar webhooks do Asaas.

Decisão adotada:

- O roteamento será preferencialmente feito por URL de webhook por unidade;
- O Super Admin deverá conseguir cadastrar/configurar os webhooks da conta Asaas da unidade através do painel;
- Como o Super Admin terá a chave de API da conta Asaas da tenant, o sistema poderá cadastrar o webhook e os eventos via API;
- A URL de webhook deve conter identificação da unidade ou chave pública segura que permita mapear o tenant;
- Mesmo com URL por unidade, o sistema deve validar IDs externos recebidos no payload para aumentar a segurança e consistência.

Eventos importantes:

- Pagamento confirmado;
- Pagamento vencido;
- Pagamento cancelado;
- Pagamento estornado;
- Cobrança criada;
- Assinatura criada;
- Assinatura cancelada/inativada;
- Falha de pagamento;
- Cliente atualizado.

Regras:

- Todo webhook deve ser armazenado;
- Processamento deve ser idempotente;
- Duplicidade de webhook não pode duplicar efeitos;
- Erros devem ser registrados;
- Deve existir possibilidade de reprocessamento.

---

## 16. Tabela/log de webhooks

Campos sugeridos:

- Unidade identificada;
- Tipo do evento;
- ID externo do evento;
- Payload completo;
- Status de processamento;
- Erro, se houver;
- Data de recebimento;
- Data de processamento;
- Cliente vinculado;
- Assinatura vinculada;
- Cobrança vinculada.

---

## 17. Responsabilidades

### Sistema interno

- Cadastro de clientes;
- Regras comerciais;
- Status operacional;
- Elegibilidade;
- Cancelamento interno;
- Preservação de histórico;
- Relatórios;
- Auditoria.

### Asaas

- Cliente financeiro;
- Checkout;
- Faturas/cobranças;
- Subscriptions;
- Confirmação de pagamentos;
- Status financeiro;
- Webhooks.


---

# Escopo Detalhado — Usuários, Times e Permissões

## 1. Objetivo do módulo

O módulo de usuários, times e permissões será responsável por controlar quem acessa o sistema, em qual unidade atua, qual papel possui e qual equipe integra.

A gestão de usuários e times deve ficar em uma única interface administrativa dentro da unidade, evitando poluir o painel com vários menus separados.

---

## 2. Interface única de gestão de equipe

A unidade deverá possuir uma área única para gerenciar:

- Usuários;
- Roles/cargos;
- Gerentes;
- Representantes;
- Times;
- Associação de usuários a times.

Sugestões de nome para a área:

- Equipe;
- Gestão de equipe;
- Usuários e times.

Objetivo:

- Reduzir quantidade de menus;
- Facilitar a administração;
- Evitar separar artificialmente usuários e times;
- Centralizar a gestão operacional da unidade.

---

## 3. Conceito de usuário

Usuário é qualquer pessoa que acessa o sistema.

Um usuário pode estar vinculado a uma ou mais unidades, caso essa possibilidade seja necessária.

A permissão do usuário deve ser contextualizada pela unidade.

Exemplo:

- Um usuário pode ser gerente em uma unidade;
- E representante em outra, se futuramente isso for permitido.

---

## 4. Vínculo usuário-unidade

Como o sistema é multitenant, o acesso do usuário deve ser controlado por vínculo com a unidade.

Campos sugeridos:

- Usuário;
- Unidade;
- Role na unidade;
- Status;
- Data de entrada;
- Data de saída;
- Usuário que criou o vínculo;
- Data de criação.

Regras:

- Usuário sem vínculo com a unidade não acessa dados da unidade;
- Role deve ser avaliada dentro do contexto da unidade;
- Super Admin é exceção e possui acesso global.

---

## 5. Roles iniciais

### 5.1 Super Admin

Usuário da plataforma com acesso global.

Pode:

- Ver todas as unidades;
- Criar unidades;
- Editar unidades;
- Inativar unidades;
- Configurar integração Asaas por unidade;
- Acessar logs globais;
- Acessar suporte administrativo;
- Visualizar indicadores globais;
- Gerenciar administradores das unidades.

### 5.2 Administrador da unidade

Usuário responsável pela administração da unidade.

Pode:

- Gerenciar usuários da unidade;
- Criar e editar times;
- Associar gerentes aos times;
- Associar representantes aos times;
- Visualizar oportunidades da unidade;
- Visualizar clientes da unidade;
- Acompanhar assinaturas e dados financeiros;
- Acessar relatórios da unidade;
- Gerenciar configurações permitidas da unidade.

### 5.3 Gerente

Usuário que atua sobre um ou mais times.

Pode:

- Ver oportunidades dos times sob sua gestão;
- Acompanhar representantes;
- Visualizar clientes gerados pelos representantes do time;
- Ver indicadores do time;
- Redistribuir oportunidades, se essa regra for permitida;
- Acompanhar conversões.

### 5.4 Representante

Usuário vendedor.

Pode:

- Criar oportunidades;
- Editar oportunidades sob sua responsabilidade;
- Complementar dados cadastrais;
- Adicionar dependentes à oportunidade;
- Gerar checkout/fatura;
- Acompanhar oportunidades vinculadas a ele;
- Visualizar clientes originados de suas oportunidades, se essa regra for adotada.

---

## 6. Times

A unidade poderá criar times.

Cada time pode ter:

- Um ou mais gerentes;
- Nenhum, um ou vários representantes;
- Oportunidades vinculadas indiretamente pelos vendedores;
- Indicadores próprios;
- Status ativo/inativo.

Campos sugeridos:

- Nome do time;
- Unidade;
- Descrição;
- Status;
- Data de criação;
- Data de atualização.

---

## 7. Associação de usuários a times

Um time poderá ter múltiplos usuários associados.

Tipos de associação:

- Gerente do time;
- Representante do time.

Pontos a definir:

- Um gerente poderá gerenciar mais de um time?
- Um representante poderá participar de mais de um time?
- Uma oportunidade ficará vinculada diretamente ao time ou apenas ao vendedor?

Sugestão inicial:

- Permitir gerente em mais de um time;
- Manter representante em um time principal inicialmente;
- Identificar time da oportunidade com base no vendedor responsável no momento do cadastro.

---

## 8. Responsabilidade por oportunidade

Toda oportunidade criada deve ficar vinculada ao usuário que a cadastrou.

Esse usuário será o vendedor responsável.

Esse vínculo será usado para:

- Controle comercial;
- Relatórios;
- Conversão por vendedor;
- Indicadores por time;
- Inteligência de mercado.

Se futuramente houver transferência de oportunidade, o sistema deve preservar histórico de responsabilidade.

---

## 9. Permissões por escopo

A permissão deve considerar:

- Escopo global;
- Escopo da unidade;
- Escopo do time;
- Escopo do próprio usuário.

Exemplos:

- Super Admin: global;
- Administrador da unidade: unidade inteira;
- Gerente: times sob sua gestão;
- Representante: registros sob sua responsabilidade.

---

## 10. Gestão de usuários na interface única

Dentro da tela de gestão de equipe, o administrador poderá:

- Listar usuários;
- Criar usuário;
- Editar usuário;
- Ativar/inativar usuário;
- Definir role;
- Associar usuário a time;
- Definir gerente(s) do time;
- Definir representantes do time;
- Remover usuário de time;
- Visualizar status do usuário.

---

## 11. Gestão de times na interface única

Na mesma tela, o administrador poderá:

- Criar time;
- Editar time;
- Inativar time;
- Visualizar membros do time;
- Adicionar gerente;
- Remover gerente;
- Adicionar representante;
- Remover representante.

---

## 12. Inativação de usuário

Ao inativar um usuário:

- O usuário não deve ser excluído;
- O acesso deve ser bloqueado;
- O histórico de oportunidades/clientes deve permanecer vinculado ao usuário;
- O sistema deve preservar relatórios históricos;
- Pode ser necessário permitir redistribuição de oportunidades ativas.

---

## 13. Inativação de time

Ao inativar um time:

- O time não deve ser excluído;
- Histórico deve ser preservado;
- Usuários podem ser removidos ou realocados;
- Oportunidades/clientes históricos continuam apontando para o time anterior, se houver vínculo histórico;
- Relatórios históricos não devem ser perdidos.

---

## 14. Auditoria

Ações que devem gerar log:

- Criação de usuário;
- Alteração de role;
- Inativação de usuário;
- Reativação de usuário;
- Criação de time;
- Alteração de time;
- Inativação de time;
- Associação de usuário a time;
- Remoção de usuário de time;
- Alteração de gerente;
- Alteração de representante.

Dados mínimos do log:

- Unidade;
- Usuário executor;
- Usuário afetado, se houver;
- Time afetado, se houver;
- Ação realizada;
- Dados anteriores;
- Dados novos;
- Data/hora.

---

## 15. Regras importantes

- Usuários e times devem ser geridos em uma única interface;
- Usuário pode ter permissões diferentes por unidade, se multiunidade for permitido;
- Representante criador da oportunidade será o vendedor responsável;
- Histórico de vínculos deve ser preservado;
- Inativação não deve excluir dados;
- Permissões devem sempre respeitar o isolamento por tenant.


---

# Escopo Técnico — Banco de Dados e Integrações

## 1. Objetivo

Este documento concentra a visão técnica inicial do sistema, incluindo entidades, relacionamentos, integrações, logs, auditoria, webhooks e regras estruturais.

O objetivo é servir como base para modelagem de banco, APIs e decisões arquiteturais.

---

## 2. Princípios técnicos

- Sistema multitenant com isolamento lógico por unidade;
- Cada registro operacional deve pertencer a uma unidade;
- Super Admin pode acessar múltiplas unidades;
- Usuários comuns acessam apenas dados da própria unidade;
- O sistema é o dono da regra de negócio;
- Asaas é o motor de cobrança;
- Dados históricos devem ser preservados;
- Cancelamentos não excluem registros;
- Inativações não excluem registros;
- Webhooks devem ser armazenados e processados com idempotência;
- Chaves de API devem ser armazenadas com segurança;
- Autenticação de clientes deve ser separada da autenticação administrativa;
- Planos devem ser versionados e não alterados retroativamente.

---

## 3. Entidades principais sugeridas

### 3.1 Tenants / Units

Representa a unidade/tenant.

Campos sugeridos:

- `id`;
- `name`;
- `legal_name`;
- `document`;
- `email`;
- `phone`;
- `status`;
- `created_at`;
- `updated_at`.

---

### 3.2 Users

Representa os usuários que acessam o sistema.

Campos sugeridos:

- `id`;
- `name`;
- `email`;
- `password_hash`;
- `status`;
- `is_super_admin`;
- `last_login_at`;
- `created_at`;
- `updated_at`.

---

### 3.3 User Units

Representa o vínculo do usuário com uma unidade.

Campos sugeridos:

- `id`;
- `user_id`;
- `unit_id`;
- `role`;
- `status`;
- `joined_at`;
- `left_at`;
- `created_at`;
- `updated_at`.

---

### 3.4 Teams

Representa times dentro de uma unidade.

Campos sugeridos:

- `id`;
- `unit_id`;
- `name`;
- `description`;
- `status`;
- `created_at`;
- `updated_at`.

---

### 3.5 Team Members

Representa associação de usuários aos times.

Campos sugeridos:

- `id`;
- `team_id`;
- `user_id`;
- `member_role`;
- `status`;
- `created_at`;
- `updated_at`.

Possíveis `member_role`:

- `manager`;
- `representative`.

---

### 3.6 Opportunities

Representa oportunidades cadastradas antes da conversão em cliente.

Campos sugeridos:

- `id`;
- `unit_id`;
- `created_by_user_id`;
- `seller_user_id`;
- `name`;
- `document`;
- `document_type`;
- `document_normalized`;
- `phone`;
- `email`;
- `birth_date`;
- `zip_code`;
- `street`;
- `number`;
- `complement`;
- `neighborhood`;
- `city`;
- `state`;
- `status`;
- `selected_plan_id`;
- `selected_plan_version_id`;
- `selected_payment_method`;
- `asaas_customer_id`;
- `asaas_checkout_id`;
- `asaas_checkout_url`;
- `asaas_payment_id`;
- `asaas_subscription_id`;
- `converted_client_id`;
- `converted_sale_id`;
- `converted_at`;
- `cancel_reason`;
- `cancelled_by_user_id`;
- `cancelled_at`;
- `created_at`;
- `updated_at`.

Índice/regra importante:

- Documento único por unidade para oportunidades/clientes, validado pelo `Document Registry` ou estrutura equivalente de controle canônico.

---

### 3.7 Opportunity Dependents

Dependentes cadastrados antes da conversão da oportunidade.

Campos sugeridos:

- `id`;
- `opportunity_id`;
- `name`;
- `cpf`;
- `cpf_normalized`;
- `created_at`;
- `updated_at`.

Regras:

- CPF único dentro da mesma oportunidade;
- CPF do dependente não pode ser igual ao documento da oportunidade/titular;
- CPF do dependente não pode existir em outro registro documental da unidade.

---

### 3.8 Clients

Representa titulares e dependentes.

Campos sugeridos:

- `id`;
- `unit_id`;
- `origin_opportunity_id`;
- `seller_user_id`;
- `client_type`;
- `holder_client_id`;
- `name`;
- `document`;
- `document_type`;
- `document_normalized`;
- `phone`;
- `email`;
- `birth_date`;
- `zip_code`;
- `street`;
- `number`;
- `complement`;
- `neighborhood`;
- `city`;
- `state`;
- `status`;
- `asaas_customer_id`;
- `asaas_subscription_id`;
- `created_at`;
- `updated_at`.

Observação:

- A autenticação futura do cliente deve ser modelada em tabela separada, como `client_auth_accounts`, e não diretamente na tabela de usuários administrativos.

Possíveis `client_type`:

- `holder`;
- `dependent`.

---

### 3.9 Client Auth Accounts

Representa a futura conta de autenticação de um cliente no aplicativo externo.

Essa tabela é separada de `users`, que representa usuários administrativos.

Campos sugeridos:

- `id`;
- `client_id`;
- `unit_id`;
- `email`;
- `phone`;
- `document`;
- `document_normalized`;
- `password_hash`;
- `auth_provider`;
- `is_active`;
- `last_login_at`;
- `email_verified_at`;
- `phone_verified_at`;
- `created_at`;
- `updated_at`.

Regras:

- Um titular pode ter conta de acesso ao app;
- Um dependente pode ter conta de acesso ao app;
- Cliente pode existir sem conta de acesso;
- Conta do cliente não concede acesso ao painel administrativo;
- Elegibilidade de uso do benefício deve ser validada separadamente da autenticação.

---

### 3.10 Client Sessions / Login Codes / Devices

Entidades futuras possíveis para o app:

- `client_sessions`;
- `client_login_codes`;
- `client_password_resets`;
- `client_devices`.

Essas tabelas poderão ser utilizadas conforme a estratégia de autenticação escolhida, como telefone + OTP, e-mail + senha ou outro fluxo.

---

### 3.11 Plans

Representa o plano comercial em sentido amplo.

Decisão adotada:

- Planos serão geridos pelo Super Admin;
- Planos não serão criados pelas unidades no MVP;
- Unidades venderão os planos disponibilizados pela plataforma;
- Planos não devem ser excluídos;
- Planos publicados não devem ser editados diretamente; qualquer mudança comercial exige nova versão e inativação da anterior para novas vendas.

Campos sugeridos:

- `id`;
- `name`;
- `description`;
- `plan_type`, exemplo: `individual` ou `company`;
- `status`, exemplo: `draft`, `published`, `inactive`, `archived`;
- `is_available_for_sale`;
- `created_by_user_id`;
- `updated_by_user_id`;
- `published_at`;
- `inactivated_at`;
- `created_at`;
- `updated_at`.

---

### 3.12 Plan Versions

Representa uma configuração específica de um plano em determinado período.

Campos sugeridos:

- `id`;
- `plan_id`;
- `version_number`;
- `name_snapshot`;
- `description_snapshot`;
- `plan_type`;
- `base_price`;
- `billing_cycle`;
- `included_dependents`;
- `max_dependents`;
- `dependent_pricing_type`;
- `default_dependent_price`;
- `dependent_pricing_rules`;
- `adhesion_fee`;
- `status`;
- `is_current`;
- `available_from`;
- `available_until`;
- `created_by_user_id`;
- `created_at`;
- `updated_at`.

Possíveis valores para `dependent_pricing_type`:

- `none`;
- `included_only`;
- `fixed_per_dependent`;
- `progressive`;
- `regressive`;
- `tiered`.

O campo `dependent_pricing_rules` pode ser JSON para armazenar faixas, progressões, regressões e memória de regra da versão.

---

### 3.13 Subscriptions

Representa assinatura interna vinculada ao titular.

Campos sugeridos:

- `id`;
- `unit_id`;
- `holder_client_id`;
- `plan_id`;
- `plan_version_id`;
- `plan_name_snapshot`;
- `contracted_amount`;
- `dependent_pricing_snapshot`;
- `asaas_customer_id`;
- `asaas_subscription_id`;
- `status`;
- `amount`;
- `billing_cycle`;
- `next_due_date`;
- `started_at`;
- `cancelled_at`;
- `created_at`;
- `updated_at`.

---

### 3.14 Sales

Representa a venda comercial gerada a partir de uma oportunidade.

A venda nasce quando o checkout/fatura é gerado e só é confirmada após pagamento confirmado pelo Asaas.

Campos sugeridos:

- `id`;
- `unit_id`;
- `opportunity_id`;
- `holder_client_id`, preenchido após pagamento confirmado e criação do cliente local;
- `seller_user_id`;
- `team_id`;
- `plan_id`;
- `plan_version_id`;
- `plan_snapshot`;
- `pricing_calculation_snapshot`;
- `asaas_customer_id`;
- `asaas_subscription_id`;
- `asaas_checkout_id`;
- `asaas_payment_id`;
- `payment_method`;
- `sale_amount`;
- `discount_amount`;
- `final_amount`;
- `dependents_count`;
- `total_lives`;
- `status`;
- `sold_at`;
- `confirmed_at`;
- `cancelled_at`;
- `metadata`;
- `created_at`;
- `updated_at`.

---

### 3.15 Sale Items

Representa itens que compõem a venda.

Campos sugeridos:

- `id`;
- `sale_id`;
- `item_type`;
- `description`;
- `quantity`;
- `unit_amount`;
- `total_amount`;
- `created_at`;
- `updated_at`.

Tipos possíveis:

- `plan`;
- `dependent_extra`;
- `adhesion_fee`;
- `discount`;
- `adjustment`.


### 3.16 Payments / Charges

Representa o espelho local resumido das cobranças e pagamentos relevantes, alimentado por webhooks e rotinas de sincronização.

Nem todo histórico detalhado de fatura precisa ser armazenado localmente, mas o sistema deve manter os resumos necessários para dashboard, auditoria e reconciliação. O detalhamento completo permanece consultável no Asaas na rota interna do titular.

Campos sugeridos:

- `id`;
- `unit_id`;
- `client_id`;
- `subscription_id`;
- `asaas_payment_id`;
- `type`;
- `status`;
- `amount`;
- `due_date`;
- `payment_method`;
- `invoice_url`;
- `created_at`;
- `updated_at`.

Tipos possíveis:

- `initial_charge`;
- `subscription_charge`;
- `debt_settlement`.

---

### 3.17 Asaas Integrations

Representa configuração Asaas por unidade.

Campos sugeridos:

- `id`;
- `unit_id`;
- `environment`;
- `api_key_encrypted`;
- `status`;
- `last_validated_at`;
- `last_error`;
- `created_at`;
- `updated_at`;
- `updated_by_user_id`.

Regras:

- Chave deve ser criptografada;
- Interface não deve exibir chave integral;
- Produção usa chave da unidade;
- Sandbox usa variável global.

---

### 3.18 Asaas Webhooks

Armazena eventos recebidos do Asaas.

Campos sugeridos:

- `id`;
- `unit_id`;
- `event_type`;
- `external_event_id`;
- `external_payment_id`;
- `external_subscription_id`;
- `external_customer_id`;
- `payload`;
- `processing_status`;
- `processed_at`;
- `error_message`;
- `created_at`.

Possíveis `processing_status`:

- `pending`;
- `processed`;
- `failed`;
- `ignored`.

---

### 3.19 Cancellation Logs

Registra cancelamentos de plano.

Campos sugeridos:

- `id`;
- `unit_id`;
- `client_id`;
- `subscription_id`;
- `asaas_subscription_id`;
- `reason`;
- `cancelled_by_user_id`;
- `previous_status`;
- `new_status`;
- `asaas_response`;
- `error_message`;
- `created_at`.

Motivos padronizados:

- `voluntary_cancellation`;
- `delinquency`;
- `price`;
- `operational_problem`;
- `competitor_migration`;
- `no_usage`;
- `billing_failure`.

---

### 3.20 Debt Settlements

Registra operações de quitação de débitos.

Campos sugeridos:

- `id`;
- `unit_id`;
- `client_id`;
- `subscription_id`;
- `created_by_user_id`;
- `original_amount`;
- `final_amount`;
- `due_date`;
- `payment_method`;
- `asaas_new_payment_id`;
- `old_payments_payload`;
- `asaas_response`;
- `status`;
- `created_at`;
- `updated_at`.

---

### 3.21 Audit Logs

Registra ações sensíveis no sistema.

Campos sugeridos:

- `id`;
- `unit_id`;
- `user_id`;
- `entity_type`;
- `entity_id`;
- `action`;
- `old_values`;
- `new_values`;
- `metadata`;
- `created_at`.

---

### 3.22 Document Registry

Registra o controle canônico de CPF/CNPJ por unidade.

Campos sugeridos:

- `id`;
- `unit_id`;
- `document_type`;
- `document_raw`;
- `document_normalized`;
- `owner_entity_type`;
- `owner_entity_id`;
- `origin_opportunity_id`;
- `status`;
- `locked_at`;
- `released_at`;
- `created_at`;
- `updated_at`.

Regras:

- Deve existir uma única linha por `unit_id` + `document_normalized`;
- O registro deve bloquear duplicidade entre oportunidades, clientes, dependentes e contas de autenticação futura;
- O registro deve ser atualizado na conversão da oportunidade, mantendo a origem comercial;
- O bloqueio deve ser transacional para evitar corrida entre cadastros simultâneos.

---

## 4. Regras de unicidade

### 4.1 Oportunidade

- CPF/CNPJ único dentro da unidade, considerando todas as entidades que armazenam documento;
- Não permitir nova oportunidade se o documento já existir em qualquer oportunidade, cliente, dependente ou conta de autenticação futura da unidade;
- Documento deve ser normalizado sem máscara e persistido em forma canônica;
- Ao cancelar oportunidade com `asaas_customer_id`, tentar excluir/cancelar cliente no Asaas quando permitido.

### 4.2 Cliente titular

- Não permitir dois titulares com o mesmo CPF/CNPJ dentro da mesma unidade;
- Se o documento já estiver associado a outro registro histórico da unidade, a criação do novo cliente deve ser bloqueada.

### 4.3 Dependente

- Não permitir mesmo CPF duplicado dentro da mesma oportunidade;
- Não permitir CPF do dependente igual ao CPF/CNPJ do titular;
- Não permitir CPF do dependente caso já exista em outro registro documental da unidade;

---

## 5. Status sugeridos

### Opportunity status

- `aberta`;
- `checkout_gerado`;
- `convertida`;
- `cancelada`.

### Client status

- `ativo`;
- `inativo`;
- `inadimplente`;
- `cancelamento_pendente`.

### Subscription status

- `ativa`;
- `inativa`;
- `inadimplente`;
- `cancelamento_pendente`.

### Sale status

- `pending_payment`;
- `confirmed`;
- `cancelled_before_payment`;
- `failed`;
- `refunded`.

### Webhook processing status

- `pending`;
- `processed`;
- `failed`;
- `ignored`.

---

## 6. Integrações externas

### 6.1 Asaas

Usado para:

- Criar/localizar cliente;
- Criar checkout;
- Criar fatura/cobrança;
- Criar subscription;
- Consultar histórico financeiro;
- Quitar débitos;
- Cancelar/inativar subscription;
- Receber webhooks;
- Cadastrar/configurar webhooks por unidade via API através do painel Super Admin.

### 6.2 ViaCEP

Usado para:

- Consultar CEP;
- Preencher endereço automaticamente;
- Permitir fallback manual se falhar.

---

## 7. Idempotência

Operações sensíveis devem considerar idempotência.

Casos importantes:

- Webhook duplicado do Asaas;
- Clique duplo em gerar checkout;
- Clique duplo em quitar débitos;
- Tentativa repetida de cancelamento;
- Reprocessamento de webhook.

Estratégias possíveis:

- Chaves de idempotência internas;
- Controle por ID externo do Asaas;
- Status intermediários;
- Bloqueio temporário de ação enquanto processa;
- Logs de tentativa.

---

## 8. Auditoria obrigatória

Devem gerar log:

- Criação de unidade;
- Alteração de chave Asaas;
- Teste de conexão Asaas;
- Criação de usuário;
- Alteração de role;
- Criação/alteração de time;
- Criação de oportunidade;
- Cancelamento de oportunidade;
- Conversão de oportunidade em cliente;
- Criação de cobrança/fatura;
- Quitação de débitos;
- Cancelamento/substituição de faturas;
- Cancelamento de plano;
- Inativação/cancelamento de subscription no Asaas;
- Alteração de status de cliente.

---

## 9. Segurança

Regras importantes:

- Isolamento por tenant em todas as queries;
- Chaves Asaas criptografadas;
- Não retornar chave Asaas completa ao frontend;
- Logs sem expor dados sensíveis desnecessariamente;
- Controle de permissão por role;
- Super Admin separado de usuários de unidade;
- CPF/CNPJ tratado como dado sensível;
- Auditoria em ações críticas.

---

## 10. Pendências técnicas para decisão

- Nome final da entidade `units` ou `tenants`;
- Se representante pode pertencer a mais de um time;
- Se gerente pode gerenciar múltiplos times;
- Se o mesmo CPF pode existir em unidades diferentes;
- Se dependente pode estar vinculado a mais de um titular;
- Quais tipos/status de faturas o Asaas permitirá cancelar/substituir na renegociação de débitos;
- Como tratar cancelamento quando a API do Asaas falhar;
- Qual política de criptografia será usada para API keys;
- Quais webhooks do Asaas serão obrigatórios no MVP.


---

# Escopo Detalhado — Vendas

## 1. Objetivo do módulo

O módulo de vendas será responsável por registrar o fechamento comercial gerado a partir de uma oportunidade.

A venda não deve ser confundida com:

- Oportunidade;
- Cliente;
- Assinatura;
- Pagamento.

A venda representa a **fotografia comercial do momento do fechamento**.

Ela responde perguntas como:

- Quem vendeu?
- Para qual cliente?
- Qual oportunidade originou a venda?
- Qual plano foi contratado?
- Qual valor foi vendido?
- Quantas vidas foram incluídas?
- Qual foi a forma de pagamento?
- Quando a venda foi gerada?
- Quando a venda foi confirmada?

---

## 2. Diferença entre oportunidade, venda, cliente, assinatura e pagamento

### Oportunidade

Representa o interesse antes da venda.

Responde:

> Essa pessoa ou empresa entrou como potencial cliente? Quem cadastrou? Foi convertida ou cancelada?

### Venda

Representa o fechamento comercial.

Responde:

> Qual plano foi vendido, por qual valor, por quem, quando e com quantas vidas?

### Cliente

Representa a pessoa cadastrada no sistema.

Responde:

> Quem é o titular ou dependente dentro da base de clientes?

### Assinatura

Representa o contrato recorrente.

Responde:

> Esse cliente possui plano ativo, inativo ou inadimplente?

### Pagamento

Representa uma cobrança/fatura.

Responde:

> O que foi pago, está vencido ou está em aberto?

---

## 3. Criação da venda

A venda deve ser criada quando o usuário clicar em **Gerar checkout** ou gerar uma fatura/cobrança para pagamento.

Nesse momento, ainda não existe cliente local.

Antes da confirmação do pagamento, existem apenas:

- Oportunidade;
- Venda pendente;
- Cliente no Asaas, quando criado para gerar checkout/fatura.

A venda nasce com status inicial:

```txt
pending_payment
```

Ou, em português na interface:

```txt
Pagamento pendente
```

---

## 4. Confirmação da venda

A venda só deve ser considerada confirmada após confirmação de pagamento pelo webhook do Asaas.

Quando o pagamento for confirmado:

- Venda muda para `confirmed`;
- Oportunidade muda para `convertida`;
- Cliente titular local é criado como ativo;
- Dependentes locais são criados como ativos;
- Assinatura é criada/ativada;
- Indicadores comerciais são atualizados.

---

## 5. Cancelamento antes do pagamento

Se uma oportunidade com checkout/fatura gerada for cancelada antes do pagamento:

- Oportunidade muda para `cancelada`;
- Venda muda para `cancelled_before_payment`;
- Cliente local não é criado;
- Assinatura local não é ativada;
- Se houver cliente criado no Asaas, o sistema tenta excluir/cancelar esse cliente no Asaas quando permitido pela API;
- Histórico é preservado.

Esse status representa venda que foi iniciada, mas não confirmada financeiramente.

---

## 6. Cancelamento posterior do cliente

Se o cliente pagar, virar cliente ativo e cancelar meses depois, a venda original não deve ser cancelada.

Nesse caso:

- Venda permanece `confirmed`;
- Oportunidade permanece `convertida`;
- Cliente muda para `inativo`;
- Subscription no Asaas é inativada/cancelada;
- Motivo de cancelamento é registrado em log próprio.

Regra central:

> Cancelamento futuro do cliente não desfaz a venda original.

---

## 7. Status da venda

Status sugeridos:

```txt
pending_payment
confirmed
cancelled_before_payment
failed
refunded
```

### pending_payment

Venda gerada, mas ainda sem confirmação de pagamento.

### confirmed

Pagamento confirmado e venda efetivada.

### cancelled_before_payment

Venda cancelada antes do pagamento ser confirmado.

### failed

Venda com falha técnica ou financeira antes da confirmação.

### refunded

Venda confirmada que teve estorno/reembolso posterior.

O status `refunded` deve ser usado com cuidado, pois representa evento financeiro posterior, não necessariamente erro na venda original.

---

## 8. Campos principais da venda

Campos sugeridos para `sales`:

```txt
id
unit_id
opportunity_id
holder_client_id
seller_user_id
team_id
plan_id
plan_version_id
plan_snapshot
pricing_calculation_snapshot
asaas_customer_id
asaas_subscription_id
asaas_checkout_id
asaas_payment_id
payment_method
sale_amount
discount_amount
final_amount
dependents_count
total_lives
status
sold_at
confirmed_at
cancelled_at
metadata
created_at
updated_at
```

---

## 9. Vínculos da venda

A venda deve se vincular a:

- Unidade;
- Oportunidade de origem;
- Cliente titular, quando criado;
- Vendedor responsável;
- Time, quando aplicável;
- Plano contratado;
- Assinatura interna;
- Subscription do Asaas;
- Checkout/fatura/cobrança do Asaas.

---

## 10. Itens da venda

Recomenda-se preparar uma estrutura de itens da venda, mesmo que no MVP ela seja usada de forma simples.

Tabela sugerida: `sale_items`.

Campos sugeridos:

```txt
id
sale_id
item_type
description
quantity
unit_amount
total_amount
created_at
updated_at
```

Tipos possíveis de item:

```txt
plan
dependent_extra
adhesion_fee
discount
adjustment
```

Exemplos:

| item_type | descrição | quantidade | valor |
|---|---:|---:|---:|
| plan | Plano familiar mensal | 1 | 99,90 |
| dependent_extra | Dependente extra | 2 | 20,00 |
| adhesion_fee | Taxa de adesão | 1 | 30,00 |

---

## 11. Por que ter venda separada

A venda deve existir separada porque preserva a fotografia do fechamento.

Mesmo que depois:

- O cliente cancele;
- O plano mude;
- O valor da assinatura seja alterado;
- O vendedor saia da unidade;
- Dependentes sejam adicionados ou removidos;
- A assinatura fique inadimplente;

A venda original continua preservada.

Isso garante relatórios comerciais mais confiáveis.

---

## 12. Indicadores possíveis

Com uma entidade própria de vendas, será possível medir:

- Vendas por unidade;
- Vendas por vendedor;
- Vendas por time;
- Vendas por plano;
- Vendas por período;
- Valor vendido;
- Valor confirmado;
- Vendas pendentes;
- Vendas canceladas antes do pagamento;
- Vendas com falha;
- Vendas estornadas;
- Total de vidas vendidas;
- Dependentes por venda;
- Conversão de oportunidade em venda;
- Ticket médio;
- Cancelamentos posteriores cruzados por plano, vendedor ou origem.

---

## 13. Fluxo recomendado

### 13.1 Oportunidade criada

- Oportunidade criada com nome e CPF/CNPJ;
- Status da oportunidade: `aberta`;
- Ainda não existe venda.

### 13.2 Dados preenchidos e checkout/fatura gerado

- Usuário complementa dados;
- Usuário seleciona plano e forma de pagamento;
- Sistema libera botão Gerar checkout;
- Usuário gera checkout/fatura;
- Sistema cria venda com status `pending_payment`;
- Oportunidade muda para `checkout_gerado`.

### 13.3 Pagamento confirmado

- Webhook do Asaas confirma pagamento;
- Venda muda para `confirmed`;
- Oportunidade muda para `convertida`;
- Cliente titular local é criado como ativo;
- Dependentes locais são criados como ativos;
- Assinatura é ativada.

### 13.4 Cancelamento antes do pagamento

- Usuário cancela oportunidade;
- Oportunidade muda para `cancelada`;
- Venda pendente muda para `cancelled_before_payment`;
- Histórico é preservado.

### 13.5 Cancelamento posterior do cliente

- Cliente já está ativo;
- Venda permanece `confirmed`;
- Oportunidade permanece `convertida`;
- Cliente muda para `inativo`;
- Subscription no Asaas é inativada/cancelada;
- Motivo do cancelamento é registrado.

---

## 14. Regras importantes

- Venda não substitui oportunidade;
- Venda não substitui cliente;
- Venda não substitui assinatura;
- Venda não substitui pagamento;
- Venda deve preservar a fotografia comercial original;
- Venda deve ser criada ao gerar checkout/fatura;
- Venda só é confirmada com pagamento confirmado;
- Cancelamento futuro do cliente não cancela a venda original;
- Oportunidade não deve ser excluída após conversão;
- Oportunidade convertida deve manter vínculo com a venda confirmada.


---

# Escopo Detalhado — Dashboard e Indicadores

## 1. Objetivo da dashboard

A dashboard será a rota inicial dentro de uma tenant/unidade.

Ela deverá apresentar uma visão executiva e operacional da unidade, reunindo indicadores comerciais, financeiros, operacionais e de retenção.

A dashboard deve ajudar o administrador, gerente ou representante a entender rapidamente:

- Tamanho da base ativa;
- Crescimento da unidade;
- Volume de vendas;
- Receita esperada;
- Receita em risco;
- Inadimplência;
- Churn;
- Performance comercial;
- Oportunidades abertas;
- Checkouts gerados;
- Clientes cancelados;
- Indicadores por período.

---

## 2. Escopo por perfil de usuário

A dashboard deve respeitar permissões.

### Administrador da unidade

Visualiza indicadores gerais da unidade inteira.

Pode ver:

- Toda a base de clientes;
- Todas as vendas;
- Todas as oportunidades;
- Todos os vendedores;
- Dados financeiros da unidade;
- Indicadores por time e representante.

### Gerente

Visualiza indicadores dos times sob sua gestão.

Pode ver:

- Oportunidades dos seus times;
- Vendas dos seus times;
- Clientes originados pelos representantes dos seus times;
- Indicadores dos representantes sob sua gestão.

### Representante

Visualiza indicadores próprios.

Pode ver:

- Suas oportunidades;
- Suas vendas;
- Seus clientes originados;
- Seus checkouts gerados;
- Sua conversão.

---

## 3. Filtros da dashboard

A dashboard deve possuir filtros básicos para análise.

Filtros sugeridos:

- Período;
- Time;
- Representante;
- Plano;
- Status do cliente;
- Forma de pagamento;
- Status da venda;
- Status da oportunidade.

Períodos úteis:

- Hoje;
- Últimos 7 dias;
- Mês atual;
- Mês anterior;
- Últimos 3 meses;
- Últimos 6 meses;
- Ano atual;
- Personalizado.

---

## 4. Indicadores principais — cards de topo

A parte superior da dashboard deve conter cards resumidos com os principais números da unidade.

### 4.1 Base ativa de titulares

Quantidade de clientes titulares com status ativo.

Cálculo:

- Contar clientes do tipo titular;
- Considerar apenas status `ativo`;
- Filtrar pela unidade atual.

### 4.2 Base ativa de vidas

Quantidade total de vidas ativas, considerando titulares e dependentes.

Cálculo:

- Titulares ativos;
- Dependentes ativos vinculados a titulares ativos;
- Somar ambos.

Esse indicador é importante porque o clube de assinatura não mede apenas contratos, mas também pessoas cobertas.

### 4.3 Dependentes ativos

Quantidade de dependentes ativos na unidade.

Cálculo:

- Clientes do tipo dependente;
- Status ativo;
- Titular vinculado também ativo.

### 4.4 Receita mensal esperada

Receita recorrente mensal esperada com base nas assinaturas ativas.

Cálculo sugerido:

- Somar o valor recorrente das assinaturas internas ativas;
- Considerar apenas titulares ativos;
- Excluir assinaturas inativas/canceladas.

Observação:

Esse indicador representa expectativa de receita recorrente, não necessariamente caixa recebido.

### 4.5 Receita recebida no mês

Valor efetivamente recebido no mês.

Fonte preferencial:

- Pagamentos confirmados via webhook do Asaas;
- Registros locais de pagamentos/cobranças persistidos a partir dos webhooks;
- Snapshots financeiros da unidade, quando aplicável.

Cálculo:

- Somar cobranças pagas no período;
- Considerar unidade atual;
- Considerar pagamentos vinculados aos clientes/assinaturas da unidade.

### 4.6 Receita em risco

Valor financeiro associado a clientes inadimplentes ou cobranças vencidas/em aberto.

Cálculo sugerido:

- Somar faturas vencidas persistidas localmente;
- Somar faturas em aberto de clientes inadimplentes persistidas localmente;
- Considerar apenas clientes titulares com assinatura ativa, inadimplente ou em risco.

Observação:

A receita em risco deve ser calculada a partir das cobranças persistidas localmente, alimentadas por webhooks e snapshots; a consulta em tempo real ao Asaas fica restrita ao histórico detalhado de faturas/cobranças e a casos de reconciliação.

### 4.7 Inadimplência

Quantidade e percentual de clientes titulares inadimplentes.

Cálculo em quantidade:

- Contar titulares com status `inadimplente`;
- Ou titulares com faturas vencidas persistidas localmente.

Cálculo percentual:

```txt
clientes_inadimplentes / titulares_ativos_ou_em_cobranca * 100
```

### 4.8 Churn mensal

Percentual de cancelamentos em relação à base ativa do início do período.

Cálculo sugerido:

```txt
clientes_cancelados_no_periodo / clientes_ativos_no_inicio_do_periodo * 100
```

Esse indicador deve considerar cancelamentos de titulares, não dependentes.

### 4.9 Novas vendas confirmadas

Quantidade de vendas confirmadas no período.

Cálculo:

- Contar registros de vendas com status `confirmed`;
- Filtrar por data de confirmação;
- Filtrar pela unidade.

### 4.10 Vidas vendidas no período

Quantidade de vidas incluídas em vendas confirmadas no período.

Cálculo:

- Somar `total_lives` das vendas confirmadas;
- Considerar titulares + dependentes incluídos na venda.

### 4.11 Checkouts/faturas gerados

Quantidade de vendas iniciadas com checkout/fatura gerada.

Cálculo:

- Contar vendas com status `pending_payment`, `confirmed`, `cancelled_before_payment`, `failed` ou `refunded`;
- Ou contar oportunidades com status `checkout_gerado` e vendas vinculadas.

### 4.12 Vendas pendentes de pagamento

Quantidade de vendas com status `pending_payment`.

Esse indicador mostra potenciais conversões aguardando pagamento.

---

## 5. Indicadores comerciais

### 5.1 Oportunidades abertas

Quantidade de oportunidades com status `aberta`.

### 5.2 Oportunidades com checkout gerado

Quantidade de oportunidades com status `checkout_gerado`.

### 5.3 Oportunidades convertidas

Quantidade de oportunidades com status `convertida`.

### 5.4 Oportunidades canceladas

Quantidade de oportunidades com status `cancelada`.

### 5.5 Taxa de conversão de oportunidade em venda

Cálculo sugerido:

```txt
oportunidades_convertidas / oportunidades_criadas_no_periodo * 100
```

Também pode ser calculada por vendedor ou time.

### 5.6 Taxa de pagamento de checkout

Mostra quantos checkouts/faturas gerados foram efetivamente pagos.

Cálculo:

```txt
vendas_confirmadas / vendas_geradas * 100
```

### 5.7 Vendas por vendedor

Ranking de vendedores por quantidade de vendas confirmadas.

Campos úteis:

- Vendedor;
- Vendas confirmadas;
- Valor vendido;
- Vidas vendidas;
- Ticket médio;
- Taxa de conversão.

### 5.8 Vendas por time

Ranking ou gráfico por time.

Campos úteis:

- Time;
- Vendas confirmadas;
- Valor vendido;
- Vidas vendidas;
- Receita esperada originada;
- Conversão.

### 5.9 Ticket médio

Valor médio das vendas confirmadas.

Cálculo:

```txt
valor_total_das_vendas_confirmadas / quantidade_de_vendas_confirmadas
```

---

## 6. Indicadores financeiros

### 6.1 Receita recorrente mensal esperada — MRR

Indicador de recorrência mensal da unidade.

Cálculo:

- Somar valor mensal das assinaturas ativas;
- Normalizar planos anuais para valor mensal, se planos anuais existirem futuramente.

### 6.2 Receita confirmada no período

Total de pagamentos confirmados no período.

Fonte:

- Webhooks do Asaas;
- Payments locais, se armazenados;
- Snapshots financeiros da unidade, quando aplicável.

### 6.3 Receita pendente

Soma de faturas em aberto ainda não vencidas.

### 6.4 Receita vencida

Soma de faturas vencidas.

### 6.5 Receita em risco

Pode ser calculada como:

```txt
receita_vencida + receita_em_aberto_de_clientes_inadimplentes
```

Ou, em versão mais simples:

```txt
soma_das_faturas_vencidas
```

Recomendação para MVP:

Começar com a soma das faturas vencidas e evoluir depois para uma regra mais sofisticada.

### 6.6 Recuperação de débitos

Valor recuperado por meio da funcionalidade **Quitar débitos**.

Cálculo:

- Somar cobranças de quitação pagas;
- Considerar período filtrado;
- Considerar unidade atual.

### 6.7 Débitos consolidados em quitação

Valor total de débitos que foram renegociados/consolidados em novas cobranças.

Esse indicador é útil para entender volume de inadimplência tratada manualmente.

---

## 7. Indicadores de churn e cancelamento

### 7.1 Churn de titulares

Quantidade e percentual de titulares cancelados no período.

Cálculo:

```txt
titulares_cancelados_no_periodo / titulares_ativos_no_inicio_do_periodo * 100
```

### 7.2 Cancelamentos por motivo

Gráfico mostrando distribuição dos motivos de cancelamento.

Motivos disponíveis:

- Cancelamento voluntário;
- Inadimplência;
- Preço;
- Problema operacional;
- Migração para concorrente;
- Ausência de uso;
- Falha na cobrança.

### 7.3 Churn de vidas

Quantidade de vidas perdidas por cancelamento de titulares.

Cálculo:

- Para cada titular cancelado, contar titular + dependentes vinculados;
- Somar as vidas perdidas no período.

### 7.4 Receita perdida por churn

Valor mensal recorrente perdido em razão de cancelamentos.

Cálculo:

- Somar valor mensal das assinaturas canceladas no período.

### 7.5 Gráfico de churn ao longo do tempo

Gráfico mensal exibindo:

- Quantidade de titulares cancelados;
- Percentual de churn;
- Receita perdida;
- Vidas perdidas.

---

## 8. Indicadores de inadimplência

### 8.1 Clientes inadimplentes

Quantidade de titulares inadimplentes.

### 8.2 Percentual de inadimplência

Cálculo:

```txt
titulares_inadimplentes / titulares_ativos_ou_em_cobranca * 100
```

### 8.3 Valor vencido

Soma das faturas vencidas.

### 8.4 Inadimplência por faixa de atraso

Faixas sugeridas:

- 1 a 7 dias;
- 8 a 15 dias;
- 16 a 30 dias;
- Acima de 30 dias.

### 8.5 Gráfico de inadimplência ao longo do tempo

Gráfico mensal exibindo:

- Clientes inadimplentes;
- Valor vencido;
- Percentual de inadimplência.

---

## 9. Indicadores de crescimento

### 9.1 Crescimento da base ativa

Gráfico mensal da quantidade de titulares ativos.

### 9.2 Crescimento de vidas ativas

Gráfico mensal da quantidade total de vidas ativas.

### 9.3 Novos clientes por mês

Quantidade de novos titulares convertidos por mês.

### 9.4 Novas vidas por mês

Quantidade de titulares + dependentes gerados por vendas confirmadas no mês.

### 9.5 Receita recorrente esperada ao longo do tempo

Evolução mensal da receita mensal esperada.

---

## 10. Gráficos sugeridos

### 10.1 Linha — crescimento de vidas ativas

Mostra evolução da base total de vidas.

### 10.2 Linha — crescimento de titulares ativos

Mostra evolução da base de contratos/titulares.

### 10.3 Barras — vendas confirmadas por mês

Mostra performance comercial mensal.

### 10.4 Barras — receita confirmada por mês

Mostra valores recebidos por mês.

### 10.5 Linha ou área — inadimplência ao longo do tempo

Mostra evolução de clientes inadimplentes e valor vencido.

### 10.6 Linha — churn mensal

Mostra evolução de cancelamentos.

### 10.7 Pizza ou barras — cancelamentos por motivo

Mostra principais causas de cancelamento.

### 10.8 Ranking — vendedores

Mostra vendedores com maior volume de vendas, vidas vendidas e conversão.

### 10.9 Ranking — times

Mostra performance por time.

---

## 11. Fontes de dados

### Dados internos

Usados para:

- Clientes;
- Titulares;
- Dependentes;
- Oportunidades;
- Vendas;
- Assinaturas internas;
- Cancelamentos;
- Times;
- Usuários;
- Motivos de cancelamento;
- Histórico de quitação de débitos.

### Dados do Asaas

Usados para:

- Faturas;
- Cobranças vencidas;
- Cobranças em aberto;
- Pagamentos confirmados;
- Histórico financeiro;
- Status externo da subscription.

### Estratégia recomendada

Para indicadores da dashboard, o banco interno e os snapshots devem ser a fonte principal.

Consultas em tempo real ao Asaas ficam restritas ao histórico detalhado de faturas/cobranças na página interna do titular e a casos de reconciliação operacional.

Para dashboard e relatórios, o ideal é manter dados financeiros resumidos localmente a partir dos webhooks e snapshots, e consultar o Asaas em tempo real apenas quando realmente necessário fora desses indicadores.

---

## 12. Indicadores que dependem de histórico/snapshots

Alguns indicadores exigem histórico, e não apenas o estado atual.

Exemplos:

- Churn mensal;
- Base ativa no início do mês;
- Crescimento da base;
- Receita recorrente esperada ao longo do tempo;
- Vidas ativas ao longo do tempo.

Para isso, o sistema pode precisar de uma tabela de snapshots periódicos.

Sugestão:

- Criar snapshots diários ou mensais por unidade;
- Registrar titulares ativos;
- Registrar dependentes ativos;
- Registrar vidas ativas;
- Registrar MRR;
- Registrar inadimplentes;
- Registrar receita em risco.

Tabela sugerida:

```txt
dashboard_snapshots
```

Campos sugeridos:

```txt
id
unit_id
snapshot_date
active_holders
active_dependents
active_lives
mrr
expected_monthly_revenue
delinquent_holders
overdue_amount
revenue_at_risk
created_at
```

---

## 13. Cards recomendados para o MVP

Para o MVP, recomenda-se começar com os seguintes cards:

1. Titulares ativos;
2. Vidas ativas;
3. Dependentes ativos;
4. Receita mensal esperada;
5. Receita recebida no mês;
6. Receita em risco;
7. Clientes inadimplentes;
8. Churn mensal;
9. Vendas confirmadas no mês;
10. Vendas pendentes de pagamento;
11. Oportunidades abertas;
12. Checkouts/faturas gerados.

Indicadores futuros relacionados ao app:

- Clientes com acesso ao app ativado;
- Clientes sem acesso ao app;
- Últimos acessos ao app;
- Clientes autenticados porém inelegíveis.

---

## 14. Gráficos recomendados para o MVP

Para o MVP, recomenda-se começar com:

1. Crescimento de vidas ativas por mês;
2. Vendas confirmadas por mês;
3. Receita recebida por mês;
4. Inadimplência por mês;
5. Churn por mês;
6. Cancelamentos por motivo;
7. Ranking de vendedores.

---

## 15. Regras de cálculo importantes

### 15.1 Base ativa

A base ativa deve considerar clientes titulares com status ativo.

Para vidas ativas, considerar titulares ativos + dependentes ativos vinculados a titulares ativos.

### 15.2 Churn

Churn deve ser calculado sobre titulares, não sobre dependentes.

Dependentes podem ser usados em indicador separado de vidas perdidas.

### 15.3 Receita mensal esperada

Receita mensal esperada deve considerar assinaturas ativas, não vendas avulsas.

### 15.4 Receita recebida

Receita recebida deve considerar pagamentos efetivamente confirmados.

### 15.5 Receita em risco

Receita em risco deve considerar valores vencidos e/ou valores em aberto de clientes inadimplentes.

### 15.6 Vendas confirmadas

Venda confirmada deve ser computada pela entidade `sales` com status `confirmed`.

### 15.7 Oportunidade convertida

Oportunidade convertida deve ser computada pelo status `convertida` e/ou vínculo com venda confirmada e cliente gerado.

---

## 16. Cuidados técnicos

- Evitar calcular tudo em tempo real se a base crescer;
- Usar agregações e snapshots para indicadores históricos;
- Garantir que os filtros respeitem tenant/unidade;
- Garantir que gerente veja apenas seus times;
- Garantir que representante veja apenas seus próprios dados;
- Separar receita esperada de receita recebida;
- Separar venda confirmada de assinatura ativa;
- Separar cliente cancelado de venda cancelada antes do pagamento;
- Evitar misturar inadimplência com churn.

---

## 17. Pendências de definição

- A dashboard do representante mostrará apenas dados próprios ou também ranking geral?
- O gerente poderá visualizar indicadores financeiros ou apenas comerciais?
- Receita em risco será calculada somente por faturas vencidas ou também por faturas abertas de clientes com histórico de atraso?
- Os snapshots serão diários ou mensais no MVP?
- O sistema armazenará pagamentos confirmados localmente via webhook ou consultará sempre o Asaas para valores financeiros?
- O churn será exibido somente mensal ou também por período personalizado?

---

# Escopo Complementar — Gaps Incorporados e Decisões Operacionais

## 1. Objetivo desta seção

Esta seção consolida as recomendações aceitas após a revisão geral do projeto.

Ela complementa os escopos anteriores com regras operacionais, decisões técnicas e cuidados de implementação que reduzem risco de inconsistência entre:

- Oportunidades;
- Vendas;
- Clientes;
- Dependentes;
- Assinaturas;
- Pagamentos;
- Asaas;
- Dashboard;
- Permissões;
- Histórico e auditoria.

---

## 2. Glossário financeiro oficial

Para evitar ambiguidades nos relatórios, dashboard e regras de negócio, o sistema deve separar claramente os seguintes conceitos.

### 2.1 Receita mensal esperada

Representa a expectativa de receita recorrente mensal da unidade.

Fonte principal:

- Assinaturas internas ativas;
- Valor recorrente contratado na versão do plano da assinatura.

Não representa necessariamente dinheiro recebido.

### 2.2 Receita confirmada

Representa valores efetivamente pagos/confirmados.

Fonte principal:

- Webhooks de pagamento confirmado do Asaas;
- Registros locais de pagamentos confirmados, quando persistidos;
- Consulta ao Asaas quando necessário.

### 2.3 Caixa recebido

Representa entrada financeira efetiva no período.

Pode coincidir com receita confirmada, mas deve ser tratado como conceito separado caso futuramente existam taxas, repasses, estornos, split, chargeback ou retenções.

### 2.4 Receita pendente

Representa cobranças emitidas, ainda não vencidas e ainda não pagas.

### 2.5 Receita vencida

Representa cobranças vencidas e ainda não pagas.

### 2.6 Receita em risco

Para o MVP, a receita em risco será calculada de forma objetiva como:

```txt
soma das faturas vencidas
```

Evolução futura possível:

```txt
faturas vencidas + faturas em aberto de clientes com histórico de atraso ou status inadimplente
```

### 2.7 MRR

MRR representa a receita recorrente mensal esperada.

Deve ser calculado com base nas assinaturas ativas e nos valores recorrentes contratados, não em pagamentos avulsos.

### 2.8 Venda confirmada

Venda confirmada é o registro da tabela `sales` com status `confirmed`.

A venda é confirmada apenas após confirmação de pagamento pelo Asaas.

### 2.9 Venda pendente

Venda pendente é o registro da tabela `sales` com status `pending_payment`.

Significa que checkout/fatura foi gerado, mas ainda não houve confirmação de pagamento.

---

## 3. Snapshots para dashboard e indicadores históricos

Alguns indicadores não devem depender apenas do estado atual das tabelas.

Exemplos:

- Churn mensal;
- Base ativa no início do mês;
- Evolução de vidas ativas;
- MRR histórico;
- Inadimplência histórica;
- Receita em risco histórica.

Para isso, o sistema deve possuir uma estrutura de snapshots.

### 3.1 Estratégia recomendada para o MVP

Criar snapshots diários por unidade.

Os snapshots diários permitirão montar visões mensais, semanais e históricas sem depender apenas do estado atual dos clientes.

### 3.2 Tabela sugerida

```txt
dashboard_snapshots
```

Campos sugeridos:

```txt
id
unit_id
snapshot_date
active_holders
active_dependents
active_lives
active_subscriptions
mrr
expected_monthly_revenue
confirmed_revenue_month_to_date
delinquent_holders
overdue_amount
open_amount
revenue_at_risk
new_sales_month_to_date
cancelled_holders_month_to_date
created_at
```

### 3.3 Regras

- Um snapshot por unidade por data;
- Snapshot deve ser gerado por job agendado;
- Snapshot não deve substituir os dados transacionais;
- Snapshot serve para acelerar dashboard e preservar histórico;
- Se houver falha na geração, o sistema deve permitir reprocessamento.

---

## 4. Matriz de permissões operacionais

As permissões devem ser mais específicas para ações financeiras e sensíveis.

Abaixo está a matriz inicial recomendada.

| Ação | Representante | Gerente | Admin da unidade | Super Admin |
|---|---:|---:|---:|---:|
| Criar oportunidade | Sim | Sim | Sim | Sim |
| Editar oportunidade própria | Sim | Sim | Sim | Sim |
| Editar oportunidade de terceiros | Não | Apenas do time | Sim | Sim |
| Cancelar oportunidade própria | Sim | Sim | Sim | Sim |
| Cancelar oportunidade de terceiros | Não | Apenas do time | Sim | Sim |
| Gerar checkout/fatura | Sim | Sim | Sim | Sim |
| Ver clientes próprios | Sim | Sim | Sim | Sim |
| Ver todos os clientes da unidade | Não | Apenas do time | Sim | Sim |
| Ver financeiro detalhado | Limitado | Parcial | Sim | Sim |
| Quitar débitos | Não | Não por padrão | Sim | Sim |
| Editar valor da quitação | Não | Não | Sim | Sim |
| Cancelar plano | Não | Não por padrão | Sim | Sim |
| Reprocessar webhook | Não | Não | Não | Sim |
| Configurar chave Asaas | Não | Não | Não | Sim |
| Cadastrar webhook Asaas por unidade | Não | Não | Não | Sim |
| Criar planos e editar rascunhos de planos | Não | Não | Não | Sim |

### 4.1 Regras adicionais

- O representante pode cancelar a própria oportunidade, desde que informe justificativa obrigatória;
- Cancelamento de plano é ação sensível e deve ficar restrito inicialmente ao Admin da unidade e Super Admin;
- Quitação de débitos é ação financeira sensível e deve ficar restrita inicialmente ao Admin da unidade e Super Admin;
- Gerente pode ter permissões ampliadas futuramente, mas no MVP deve ser mais restrito em ações financeiras;
- Todas as ações sensíveis devem gerar log.

---

## 5. Preparação para comissionamento futuro

O comissionamento não faz parte obrigatória do MVP, mas a estrutura deve estar preparada.

A entidade `sales` deve preservar:

- Vendedor responsável no momento da venda;
- Time do vendedor no momento da venda;
- Unidade;
- Plano e versão do plano;
- Valor vendido;
- Valor confirmado;
- Quantidade de vidas vendidas;
- Data de geração da venda;
- Data de confirmação da venda;
- Status da venda.

### 5.1 Regra importante

Mesmo que o vendedor mude de time ou seja inativado depois, a venda deve preservar a fotografia comercial do momento em que foi confirmada.

### 5.2 Possível módulo futuro

Um módulo futuro de comissões poderá usar:

- `sales`;
- `sale_items`;
- `seller_user_id`;
- `team_id` histórico;
- `confirmed_at`;
- `final_amount`;
- `total_lives`.

---

## 6. Alterações de dependentes após a venda

O escopo atual cobre dependentes cadastrados na oportunidade e convertidos com o titular.

Também é necessário prever alterações futuras após a venda.

### 6.1 Regras recomendadas

- Dependente não deve ser excluído fisicamente;
- Remoção de dependente deve alterar status para `removido` ou `inativo`;
- Inclusão de dependente após a venda deve gerar evento histórico;
- Alteração de dependentes pode impactar valor da assinatura, conforme regra do plano contratado;
- Qualquer alteração que impacte valor deve ser tratada como evento financeiro/auditável;
- A versão do plano contratada deve continuar sendo a referência para cálculo.

### 6.2 Status sugeridos para dependente

```txt
ativo
inativo
removido
pendente_ativacao
vinculado_a_titular_inativo
```

### 6.3 Evento histórico recomendado

Toda inclusão, remoção ou reativação de dependente deve gerar registro em `customer_events`.

---

## 7. Regra operacional de inadimplência

A inadimplência deve ter comportamento claro e automático.

### 7.1 Regra recomendada para o MVP

Para o MVP, a regra inicial será objetiva:

```txt
fatura vencida no Asaas
→ webhook/evento de vencimento recebido
→ titular muda para inadimplente
→ dependentes perdem elegibilidade
```

Quando o pagamento for confirmado:

```txt
pagamento confirmado
→ titular volta para ativo
→ dependentes vinculados voltam à elegibilidade, se estiverem ativos
```

### 7.2 Status envolvidos

Cliente titular:

```txt
ativo
inadimplente
inativo
```

Assinatura:

```txt
ativa
inadimplente
inativa
```

Dependente:

```txt
ativo
vinculado_a_titular_inadimplente
vinculado_a_titular_inativo
```

### 7.3 Evolução futura com tolerância

Se futuramente houver período de tolerância, o sistema poderá incluir o status intermediário:

```txt
em_atraso
```

Fluxo futuro possível:

```txt
ativo
→ em_atraso
→ inadimplente
→ ativo
```

Para o MVP, a tolerância não será assumida como regra padrão.

---

## 8. Regra operacional de cancelamento

O cancelamento de plano já foi definido como alteração de status e interrupção da cobrança recorrente.

### 8.1 Regra recomendada para o MVP

Para o MVP, o cancelamento será imediato.

Ao cancelar:

- Cliente titular muda de `ativo` para `inativo`;
- Dependentes perdem elegibilidade;
- Subscription no Asaas é inativada/cancelada;
- Motivo do cancelamento é registrado;
- Usuário executor é registrado;
- Cliente não é excluído;
- Cliente não é movido para outra tabela;
- Venda original permanece `confirmed`;
- Oportunidade original permanece `convertida`.

### 8.2 Evolução futura

Futuramente o cancelamento poderá permitir escolha entre:

- Cancelamento imediato;
- Cancelamento no fim do ciclo já pago.

Essa evolução deve ser tratada como regra explícita, com data de encerramento de elegibilidade.

---

## 9. Eventos de negócio e timeline do cliente

Além de `audit_logs`, o sistema deve possuir uma estrutura para eventos de negócio.

Sugestão de tabela:

```txt
customer_events
```

### 9.1 Objetivo

Registrar a linha do tempo operacional e comercial do cliente, oportunidade, venda e assinatura.

### 9.2 Eventos recomendados

- Oportunidade criada;
- Oportunidade editada;
- Dependente adicionado à oportunidade;
- Checkout/fatura gerado;
- Venda criada;
- Pagamento confirmado;
- Venda confirmada;
- Cliente titular criado;
- Dependente criado;
- Assinatura ativada;
- Fatura vencida;
- Cliente marcado como inadimplente;
- Pagamento de inadimplência confirmado;
- Cliente reativado;
- Quitação de débitos gerada;
- Plano cancelado;
- Dependente removido;
- Cliente autenticado no app, futuramente.

### 9.3 Campos sugeridos

```txt
id
unit_id
client_id
opportunity_id
sale_id
subscription_id
event_type
title
description
metadata
created_by_user_id
created_at
```

### 9.4 Diferença entre audit_logs e customer_events

`audit_logs` registra auditoria técnica e administrativa.

`customer_events` registra linha do tempo de negócio, útil para atendimento, suporte e análise operacional.

---

## 10. Normalização e validação de CPF/CNPJ

A regra de unicidade depende de normalização adequada do documento.

### 10.1 Armazenamento recomendado

O sistema deve armazenar:

```txt
document
document_type
document_normalized
```

Exemplos:

```txt
123.456.789-00 → 12345678900
12.345.678/0001-99 → 12345678000199
```

### 10.2 Validação

O sistema deve validar:

- CPF válido;
- CNPJ válido;
- Tipo do documento;
- Dependente deve possuir CPF, não CNPJ;
- Oportunidade pode possuir CPF ou CNPJ;
- Titular pessoa física usa CPF;
- Titular pessoa jurídica usa CNPJ.

### 10.3 Índice de unicidade

Recomendação inicial:

```txt
unit_id + document_normalized
```

A implementação deve considerar cuidadosamente a transição oportunidade → cliente, para evitar duplicidade indevida entre registros que representam a mesma origem.

### 10.4 Regra para dependentes

- CPF do dependente não pode repetir dentro da mesma oportunidade;
- CPF do dependente não pode ser igual ao documento do titular;
- O mesmo dependente não pode existir em titulares diferentes na mesma unidade.

---

## 11. Titular pessoa jurídica com dependentes

Fica definido que oportunidades e clientes titulares podem ser pessoa jurídica.

Nesse cenário:

- O titular é uma empresa com CNPJ;
- Os dependentes representam pessoas físicas vinculadas à empresa;
- Os dependentes continuam usando CPF;
- O plano pessoa jurídica pode ter regras próprias de limite, preço e faixas de dependentes;
- A assinatura fica vinculada ao titular pessoa jurídica;
- A elegibilidade dos dependentes depende da assinatura ativa da pessoa jurídica.

### 11.1 Dados futuros possíveis para pessoa jurídica

Pode ser necessário incluir futuramente:

- Razão social;
- Nome fantasia;
- CNPJ;
- Responsável legal;
- CPF do responsável legal;
- E-mail financeiro;
- Telefone financeiro;
- Endereço da empresa.

Esses campos podem ser adicionados quando o fluxo de PJ for detalhado.

---

## 12. Carteirinha, elegibilidade e rede credenciada como módulos futuros

Como o sistema é um clube de assinatura, os clientes provavelmente usarão algum benefício futuramente.

Mesmo que não esteja no MVP, o sistema deve se preparar para:

- Carteirinha digital;
- QR Code;
- Validação de elegibilidade;
- Rede credenciada;
- Histórico de utilizações;
- App do cliente;
- Consulta de status de titular/dependente.

### 12.1 Regra de elegibilidade

A autenticação no app não significa elegibilidade automática.

A elegibilidade deve considerar:

- Cliente autenticado;
- Cliente ativo;
- Tipo do cliente;
- Titular ativo;
- Assinatura ativa;
- Inadimplência;
- Status do dependente.

Exemplo para titular:

```txt
cliente titular ativo + assinatura ativa = elegível
```

Exemplo para dependente:

```txt
dependente ativo + titular ativo + assinatura ativa = elegível
```

---

## 13. Comunicação e notificações

O sistema gerará links de checkout, faturas, boletos, cobranças de quitação e eventos financeiros.

### 13.1 Regra recomendada para o MVP

Para o MVP, o sistema deve:

- Gerar o link de checkout/fatura;
- Exibir o link na interface;
- Permitir copiar o link;
- Registrar o link na oportunidade/venda;
- Não depender inicialmente de envio automático por WhatsApp/e-mail.

### 13.2 Evoluções futuras

Futuramente o sistema poderá enviar:

- Link de checkout por e-mail;
- Link por WhatsApp;
- Lembrete de pagamento;
- Aviso de fatura vencida;
- Aviso de pagamento confirmado;
- Alerta para vendedor quando venda for confirmada;
- Alerta de inadimplência;
- Aviso de cancelamento.

### 13.3 Cuidados

- Envio automático deve respeitar LGPD e consentimento;
- Mensagens financeiras devem ser rastreáveis;
- Webhooks de entrega não são necessários no MVP, salvo decisão posterior.

---

## 14. Checklist de onboarding da unidade

Como cada unidade terá conta própria no Asaas, a unidade não deve ser considerada plenamente ativa para venda antes de concluir a configuração mínima.

### 14.1 Status sugeridos da unidade

```txt
rascunho
pendente_configuracao
ativa
inativa
bloqueada
```

### 14.2 Checklist recomendado

Uma unidade estará pronta para operar quando possuir:

- Dados básicos preenchidos;
- Primeiro administrador criado;
- Chave Asaas configurada;
- Conexão Asaas validada;
- Webhook cadastrado no Asaas;
- Eventos do webhook configurados;
- Pelo menos um plano publicado disponível para venda;
- Usuários/times configurados, quando aplicável;
- Formas de pagamento operacionais conforme conta Asaas.

### 14.3 Gestão pelo Super Admin

O Super Admin deve conseguir:

- Criar unidade;
- Editar unidade;
- Configurar chave Asaas;
- Testar conexão;
- Cadastrar webhook por API;
- Visualizar status do webhook;
- Visualizar última falha de integração;
- Ativar ou bloquear unidade.

---

## 15. Webhooks Asaas por unidade

Fica definido que o sistema deverá trabalhar com webhook por unidade.

### 15.1 Modelo recomendado

Cada unidade terá sua própria URL ou rota identificável para webhook do Asaas.

Exemplo conceitual:

```txt
/api/webhooks/asaas/units/{unitId}
```

Ou estrutura equivalente com token/chave de roteamento.

### 15.2 Gestão pelo Super Admin

Como o Super Admin terá a chave de API da conta Asaas da unidade, o painel poderá cadastrar e gerenciar os webhooks via API do Asaas.

O painel Super Admin deve permitir:

- Cadastrar webhook da unidade;
- Atualizar webhook;
- Validar URL configurada;
- Selecionar eventos necessários;
- Ver status da configuração;
- Registrar retorno da API;
- Exibir erros.

### 15.3 Regras técnicas

- Webhooks devem ser armazenados integralmente;
- Processamento deve ser idempotente;
- Webhook duplicado não pode duplicar venda, pagamento ou mudança de status;
- Webhook sem unidade identificável deve ser registrado como erro;
- Deve existir possibilidade de reprocessamento administrativo.

---

## 16. Quitação de débitos como renegociação/consolidação

A funcionalidade de quitação de débitos deve ser tratada como uma renegociação ou consolidação de cobranças, não como simples eliminação de faturas.

### 16.1 Fluxo recomendado

1. Usuário acessa rota interna do titular;
2. Sistema consulta faturas vencidas e/ou em aberto no Asaas;
3. Sistema calcula o valor consolidado;
4. Usuário clica em **Quitar débitos**;
5. Modal abre com valor, vencimento e forma de pagamento;
6. Valor vem preenchido com a soma dos débitos elegíveis;
7. Usuário pode editar valor;
8. Vencimento vem preenchido com a data atual;
9. Usuário pode editar vencimento;
10. Usuário seleciona boleto, Pix ou cartão de crédito;
11. Sistema cria nova cobrança no Asaas;
12. Sistema registra a renegociação localmente;
13. Sistema tenta cancelar/substituir faturas antigas quando permitido pela API do Asaas;
14. Sistema preserva o vínculo histórico entre faturas antigas e nova cobrança;
15. Tela atualiza histórico financeiro.

### 16.2 Regra central

As faturas antigas não devem simplesmente desaparecer do histórico de negócio.

Mesmo que sejam canceladas no Asaas, o sistema deve preservar localmente:

- Quais faturas foram consolidadas;
- Valor original total;
- Valor final negociado;
- Nova cobrança criada;
- Usuário responsável;
- Data/hora da renegociação;
- Forma de pagamento;
- Retorno da API do Asaas.

### 16.3 Tabela sugerida

```txt
debt_settlements
```

Campos sugeridos:

```txt
id
unit_id
client_id
subscription_id
created_by_user_id
original_amount
final_amount
due_date
payment_method
asaas_new_payment_id
old_payments_payload
old_payments_ids
asaas_response
status
created_at
updated_at
```

### 16.4 Status sugeridos

```txt
pending_payment
paid
cancelled
failed
```

### 16.5 Cuidados

- Evitar clique duplo gerando duas renegociações;
- Bloquear nova quitação enquanto houver uma quitação pendente para os mesmos débitos;
- Registrar falhas de cancelamento das cobranças antigas;
- Não considerar dívida quitada até o pagamento da nova cobrança ser confirmado.

---

## 17. Processamento assíncrono e jobs

Algumas operações não devem depender exclusivamente de request síncrono.

### 17.1 Casos que devem usar jobs ou processamento assíncrono

- Processamento de webhook;
- Reprocessamento de webhook com erro;
- Geração de snapshots da dashboard;
- Sincronização financeira com Asaas;
- Atualização de inadimplência;
- Recuperação de status pendente;
- Cancelamento pendente;
- Cadastro/validação de webhook Asaas por unidade;
- Consulta periódica de cobranças em aberto, se necessário.

### 17.2 Tabelas/estruturas úteis

- `asaas_webhooks`;
- `job_logs`;
- `integration_failures`;
- `dashboard_snapshots`;
- `debt_settlements`;
- `customer_events`.

### 17.3 Regras

- Jobs devem ser idempotentes;
- Falhas devem ser registradas;
- Deve existir possibilidade de reprocessamento manual para eventos críticos;
- O Super Admin deve visualizar falhas globais de integração;
- Uma unidade não deve afetar o processamento de outra.

---

## 18. Ajustes recomendados no modelo técnico

Além das tabelas já previstas, ficam recomendadas as seguintes estruturas.

### 18.1 `customer_events`

Linha do tempo de negócio.

### 18.2 `dashboard_snapshots`

Histórico de indicadores por unidade.

### 18.3 `debt_settlements`

Histórico de quitação/renegociação de débitos.

### 18.4 `job_logs`

Registro de jobs, falhas e reprocessamentos.

### 18.5 `client_auth_accounts`

Conta de autenticação futura para titulares e dependentes no app externo.

### 18.6 `plan_versions`

Versões imutáveis/publicadas dos planos.

### 18.7 `sale_items`

Itens que compõem a venda.

---

## 19. Pendências reais remanescentes

Após a incorporação dos gaps aceitos, as principais pendências deixam de ser estruturais e passam a ser decisões de produto/regra fina.

Pendências que ainda podem ser detalhadas depois:

- Se haverá taxa de adesão no MVP;
- Se haverá desconto ou cupom no MVP;
- Se haverá plano anual no MVP;
- Se planos poderão ser disponibilizados para todas as unidades ou apenas para unidades específicas;
- Se pessoa jurídica exigirá responsável legal já no MVP;
- Se gerente terá permissões financeiras ampliadas futuramente;
- Se notificações automáticas entrarão em uma segunda fase;
- Se cancelamento no fim do ciclo será suportado no futuro;
- Se haverá período de tolerância para inadimplência no futuro;
- Qual estratégia de autenticação será usada no app do cliente: OTP, senha, e-mail, telefone ou combinação.

---

## 20. Decisão consolidada

O sistema deverá ser desenvolvido preservando histórico e separando claramente:

- Interesse comercial: oportunidade;
- Fechamento comercial: venda;
- Pessoa cadastrada: cliente;
- Recorrência contratada: assinatura;
- Cobrança financeira: pagamento/fatura;
- Configuração comercial: plano e versão do plano;
- Elegibilidade: status operacional do titular/dependente;
- Autenticação futura: conta de cliente para app externo;
- Auditoria: logs técnicos e administrativos;
- Linha do tempo: eventos de negócio.

Essa separação é a base para evitar retrabalho e permitir evolução futura do produto.

