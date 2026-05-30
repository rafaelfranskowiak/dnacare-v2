# Planejamento de refatoracao - rotas `/dashboard/oportunidades` e `/dashboard/vendas`

Baseado no novo layout consolidado da rota `/dashboard/clientes`.

## Objetivo

Padronizar as rotas de Oportunidades e Vendas para usar a mesma estrutura visual, densidade e hierarquia de informacao ja adotadas em Clientes.

## Direcao proposta

- Manter o `Header` global como ponto unico de titulo e subtitulo da rota.
- Reaproveitar a mesma casca visual escura da pagina de Clientes.
- Extrair componentes compartilhados para evitar duplicacao entre as rotas.
- Ajustar apenas o conteudo, filtros e colunas de cada dominio.

## Componentes compartilhados a extrair

- `MetricCard`
- `FilterBar`
- `TableShell`
- `StatusBadge`
- `Pagination`
- `EmptyState`
- `LoadingState`

## Rota `/dashboard/oportunidades`

### Objetivo visual

- Usar a mesma estrutura de pagina da rota de Clientes.
- Manter o botao de acao principal no topo.
- Exibir cards de resumo no estilo do mock.

### Conteudo sugerido

- Card: total de oportunidades
- Card: abertas
- Card: checkout gerado
- Card: convertidas
- Card: canceladas

### Filtros sugeridos

- Status
- Busca por nome, documento ou telefone, se a API suportar
- Vendedor, se fizer sentido no contrato atual

### Tabela sugerida

- Nome
- Status
- Vendedor
- Criado em
- Acesso ao detalhe

## Rota `/dashboard/vendas`

### Objetivo visual

- Reaproveitar a mesma estrutura visual de Clientes.
- Dar foco rapido em status, valor e contexto comercial.

### Conteudo sugerido

- Card: total de vendas
- Card: pendentes
- Card: confirmadas
- Card: canceladas antes do pagamento
- Card opcional: receita confirmada

### Filtros sugeridos

- Status
- Forma de pagamento, se for util operacionalmente
- Busca por cliente, plano ou documento, se a API suportar

### Tabela sugerida

- Cliente
- Plano
- Valor
- Pagamento
- Status
- Data
- Acesso ao detalhe

## Sequencia de implementacao

1. Extrair componentes compartilhados da pagina de Clientes.
2. Refatorar a listagem de Oportunidades para usar os componentes novos.
3. Refatorar a listagem de Vendas para usar os componentes novos.
4. Validar se os dados atuais da API cobrem cards, filtros e tabela.
5. Ajustar os contratos de backend apenas se houver bloqueio real.
6. Rodar `typecheck` e `lint`.
7. Fazer revisao visual final.

## Decisoes em aberto

Decisoes definidas:

- Em **todas as rotas** teremos cards superiores com indicadores compativeis com o dominio.
- Os indicadores devem ser focados em **operacao**.
- Os componentes compartilhados devem ser pensados para reaproveitamento futuro em **`/admin`** tambem.
- A pagina de **Clientes** continua como referencia exata de estilo.
- **Telefone** e **vendedor** sao importantes; **plano** fica fora por enquanto.
- Os filtros precisam existir, no minimo com **vendedor** e **time**.
- A **paginação** e obrigatoria e deve ser mantida no novo padrao.

## Sugestao de padrao

Para seguir sem mais idas e vindas, o plano recomendado fica assim:

- padronizar as **listagens** de Oportunidades e Vendas com a mesma casca visual de Clientes
- extrair componentes compartilhados em `frontend/src/components/dashboard/`
- manter os detalhes para uma segunda etapa
- incluir cards, filtros e paginação em todas as rotas refatoradas
- planejar backend apenas se faltar dado real para cards, filtros ou paginação
