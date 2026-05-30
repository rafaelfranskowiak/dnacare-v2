# Plan: páginas internas de clientes

Este diretório documenta a experiência visual e funcional das rotas internas de clientes em `/dashboard/clientes/*`, com foco nas telas que o usuário realmente vê no dashboard.

## Escopo

- Layout compartilhado do dashboard que envolve a página.
- Tela de detalhe do cliente em `/dashboard/clientes/[id]`.
- Tela de detalhe do dependente em `/dashboard/clientes/[id]/dependentes/[dependentId]`.

## 1. Estrutura global visível na rota

### Sidebar do dashboard

Arquivo-base: `frontend/src/components/sidebar.tsx`

Elementos presentes:

- Container lateral vertical com largura expansível/recolhível.
- Bloco superior com:
  - Logo/ícone da aplicação.
  - Título da unidade (`DNA Care`).
- Área de navegação com links para as seções do dashboard.
- Estado ativo no item correspondente à rota atual.
- Botão para recolher/expandir a sidebar.
- Cartão do usuário logado com:
  - Avatar com iniciais.
  - Nome do usuário.
  - E-mail do usuário.
- Botão de sair.

Comportamentos relevantes:

- A sidebar muda de aparência quando a rota pertence a `/dashboard/clientes`.
- O item "Clientes" aparece destacado quando a rota atual é a área de clientes.
- O estado recolhido remove os rótulos e deixa apenas ícones.

### Header do dashboard

Arquivo-base: `frontend/src/components/header.tsx`

Elementos presentes:

- Título principal da tela.
- Subtítulo contextual da rota.
- Badge de `Platform Admin`, quando aplicável.
- Botão de notificações.
- Botão de alternância de tema.
- Avatar com iniciais do usuário.
- Nome do usuário.
- Botão de logout.

Comportamentos relevantes:

- Para rotas de cliente, o header usa uma variação visual escura específica.
- O título e o subtítulo mudam conforme a rota:
  - `/dashboard/clientes` → `Clientes`
  - `/dashboard/clientes/[id]` → `Cliente`
  - `/dashboard/clientes/[id]/dependentes/[dependentId]` → `Dependente`

## 2. Tela de detalhe do cliente

Rota: `/dashboard/clientes/[id]`

Arquivo: `frontend/src/app/dashboard/clientes/[id]/page.tsx`

### 2.1 Estado de carregamento

Quando os dados ainda estão sendo buscados, a página mostra:

- Área simples de feedback.
- Texto de carregamento.

### 2.2 Estado de cliente não encontrado

Se a API não retorna cliente válido:

- Mensagem de cliente não encontrado.

### 2.3 Link de retorno

Elemento:

- Link `← Voltar`

Função:

- Leva o usuário de volta para `/dashboard/clientes`.

### 2.4 Card de identidade do cliente

Elementos presentes:

- Rótulo superior `Cliente`.
- Nome do cliente em destaque.
- Linha de contexto com:
  - Tipo do cliente (`Titular` ou `Dependente`).
  - Link para o titular, quando o cliente atual for dependente.
  - CPF.
- Badge de status do cliente.

Badge de status:

- `ativo` → destaque de sucesso.
- `inativo` → visual neutro.
- Outros estados, como inadimplência, recebem estilo de alerta.

### 2.5 Card de dados pessoais

Título:

- `Dados Pessoais`

Campos exibidos:

- Telefone.
- E-mail.
- Nascimento.
- CEP.
- Endereço.
- Bairro.
- Cidade/UF.

Comportamento:

- Cada linha mostra rótulo à esquerda e valor à direita.
- Valores vazios aparecem como `-`.

### 2.6 Card de assinatura

Este bloco aparece somente quando o cliente é `holder` e existe `subscription`.

Título:

- `Assinatura`

Campos exibidos:

- Plano.
- Valor recorrente.
- Status da assinatura.
- Data de início.

Função:

- Dar visibilidade à situação contratual do titular.

### 2.7 Card de dependentes

Este bloco aparece somente para clientes do tipo `holder`.

Título:

- `Dependentes (n)`

Elementos:

- Lista de dependentes vinculados ao titular.
- Nome de cada dependente como link.
- Badge de status por dependente.

Comportamento:

- Quando não há dependentes, a página exibe a mensagem `Nenhum dependente.`

### 2.8 Card financeiro

Este bloco aparece somente para clientes do tipo `holder`.

Título:

- `Financeiro`

Elementos:

- Botão `Quitar Débitos`.
- Mensagem de resultado da negociação, quando aplicável.
- Mensagem de erro, quando a operação falha.
- Lista de pagamentos carregados da API.

Comportamentos:

- O botão de quitar débitos dispara a consolidação da dívida.
- A resposta pode trazer:
  - Valor consolidado.
  - Link de pagamento.
- A lista financeira é rolável e exibe até 20 pagamentos.

Status de pagamento exibidos:

- `RECEIVED`
- `OVERDUE`
- Outros estados recebem visual intermediário.

### 2.9 Ação de cancelamento de plano

Este bloco aparece somente para clientes `holder` com status `ativo`.

Elemento:

- Botão `Cancelar Plano`

Ao abrir:

- Surge um modal fixo centralizado.

Conteúdo do modal:

- Título `Cancelar Plano`.
- Campo de texto para justificativa.
- Botão `Voltar`.
- Botão `Confirmar Cancelamento`.

Regras funcionais:

- A justificativa precisa ter no mínimo 20 caracteres.
- O cancelamento chama a API com a razão informada.

## 3. Tela de detalhe do dependente

Rota: `/dashboard/clientes/[id]/dependentes/[dependentId]`

Arquivo: `frontend/src/app/dashboard/clientes/[id]/dependentes/[dependentId]/page.tsx`

### 3.1 Estado de carregamento

Enquanto os dados são buscados:

- Mensagem `Carregando...`

### 3.2 Estado de dependente não encontrado

Se a API não retorna o dependente:

- Mensagem `Dependente não encontrado.`

### 3.3 Link de retorno ao titular

Elemento:

- Link `← Voltar ao Titular`

Função:

- Retorna para `/dashboard/clientes/[id]`.

### 3.4 Card de identidade do dependente

Elementos presentes:

- Rótulo `Dependente`.
- Nome do dependente em destaque.
- CPF.
- Badge de status.

Comportamento:

- O status usa destaque visual quando `ativo`.
- Estados sem destaque ativo ficam em tom neutro.

### 3.5 Card de dados pessoais

Título:

- `Dados Pessoais`

Possui dois modos:

#### Modo leitura

Campos exibidos:

- Telefone.
- E-mail.
- Data de nascimento.
- Titular vinculado.

O campo `Titular` vira link para a página do titular.

#### Modo edição

Campos editáveis:

- Telefone.
- E-mail.
- Data de nascimento.

Elementos extras:

- Botão de alternar entre `Editar` e `Cancelar`.
- Botão `Salvar`.

Comportamento:

- O botão `Salvar` envia atualização via PATCH.
- Após salvar, o formulário fecha e os dados são recarregados.

## 4. Resumo funcional da experiência

As páginas internas de cliente são compostas por:

- Navegação global do dashboard.
- Cabeçalho contextual por rota.
- Blocos de identidade e relacionamento.
- Blocos de dados pessoais.
- Componentes condicionais por tipo de cliente.
- Ações financeiras e de cancelamento para titulares.
- Edição direta para dependentes.

Em termos de UI, o fluxo privilegia:

- Leitura rápida da situação do cliente.
- Acesso ao contexto familiar.
- Ações administrativas com feedback claro de estado.
