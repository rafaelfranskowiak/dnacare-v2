# Análise visual do print do plano

Este documento descreve, em detalhe, os elementos e componentes visíveis no print anexado da tela de detalhes do plano.

## Visão geral da tela

A interface usa um tema escuro com blocos em cartões, bordas sutis e contraste alto entre títulos, rótulos e valores. A tela é organizada em três áreas principais:

- Ações rápidas no topo.
- Card principal com os dados do titular e a tabela de dependentes.
- Blocos financeiros com resumo e histórico de faturas.

## 1. Ações no topo

No canto superior direito aparecem dois botões de ação:

- `Editar Dados`
- `Reativar Plano`

### Função visual e semântica

- `Editar Dados` indica acesso à edição das informações principais do plano ou do cliente.
- `Reativar Plano` sugere que o plano está inativo ou cancelado, mas ainda pode ser reativado.
- Os botões usam estilos contrastantes para diferenciar ação secundária de ação primária.

## 2. Card principal: detalhes do plano

O primeiro grande bloco da tela é um card com o título `Detalhes do Plano`.

### 2.1 Cabeçalho do card

Elementos presentes:

- Título da seção.
- Área de identificação do titular.
- Badges de status ao lado do tipo.

### 2.2 Bloco do titular

Logo abaixo do título, a tela mostra:

- Rótulo `Titular`.
- Badge `Titular`.
- Badge `Inadimplente`.

Esse conjunto comunica rapidamente:

- O papel da pessoa dentro do contrato.
- A situação financeira atual.

### 2.3 Dados cadastrais exibidos

Os campos estão distribuídos em colunas, com rótulo em tom mais discreto e valor em destaque.

Campos visíveis:

- Nome
- CPF/CNPJ
- Telefone
- Email
- Período de Renovação
- Endereço
- Bairro
- Cidade/UF
- CEP

### 2.4 Estrutura de leitura

O padrão visual é consistente:

- Rótulo menor acima.
- Valor abaixo em texto mais forte.
- Espaçamento em grade para permitir leitura rápida.

### 2.5 Dados observados no print

O print mostra os seguintes valores preenchidos:

- Nome: `Marlene Dos santos Rodrigues`
- CPF/CNPJ: `074.758.388-97`
- Telefone: `-`
- Email: `marlene.gomes1060@gmail.com`
- Período de Renovação: `Mensal`
- Endereço: `Rua Jacupiranga, 340 - Bloco dalia 22`
- Bairro: `Vila Camilópolis`
- Cidade/UF: `Santo André - SP`
- CEP: `09230-330`

## 3. Seção de dependentes

Abaixo dos dados do titular há uma seção chamada `Dependentes`.

### 3.1 Botão de inclusão

No lado direito da seção aparece:

- `+ Adicionar Dependente`

Função:

- Abre o fluxo de criação de um novo dependente vinculado ao titular.

### 3.2 Tabela de dependentes

A tabela exibe colunas organizadas para leitura operacional.

Colunas visíveis:

- Nome
- CPF
- Status
- Telefone
- Nascimento
- Ações

### 3.3 Linha de dependente

O print mostra um dependente listado:

- Nome: `Ademilson Gomes Rodrigues`
- CPF: `048.800.358-07`
- Status: `Inadimplente`
- Telefone: `-`
- Nascimento: `-`

### 3.4 Ações por linha

Na última coluna, cada dependente possui ações rápidas:

- `Editar`
- `Excluir`

Função:

- `Editar` permite alterar os dados do dependente.
- `Excluir` remove o dependente do plano.

## 4. Resumo financeiro

Entre a área de dependentes e o histórico de faturas aparecem dois cards de resumo.

### 4.1 Card de total recebido

Elementos:

- Rótulo `Total Recebido`
- Valor `R$ 147,62`

Características visuais:

- Destaque em verde.
- Sugere saldo positivo ou valores já quitados.

### 4.2 Card de total devido

Elementos:

- Rótulo `Total Devido`
- Valor `R$ 1.328,58`

Características visuais:

- Destaque em vermelho.
- Indica pendência financeira acumulada.

## 5. Histórico de faturas

A última área grande da tela é o card `Histórico de Faturas`.

### 5.1 Cabeçalho da seção

Elementos:

- Título `Histórico de Faturas`
- Botão `Quitar Débitos`

### 5.2 Função do botão

`Quitar Débitos` sugere uma ação financeira de consolidação ou regularização da dívida do titular.

### 5.3 Estrutura da tabela

Colunas visíveis:

- Vencimento
- Valor
- Status
- Tipo
- Links

### 5.4 Linhas da tabela

O print mostra várias faturas recorrentes, com padrão semelhante:

- Vencimentos mensais.
- Valor repetido de `R$ 73,81`.
- Status variando entre `pendente` e `vencida`.
- Tipo `Cartão`.
- Ícone de visualização na coluna de links.

### 5.5 Interpretação visual dos status

- `pendente` aparece em tom de alerta amarelado/alaranjado.
- `vencida` aparece em vermelho.
- `Cartão` aparece como etiqueta neutra.
- O ícone de olho na coluna `Links` sugere acesso a detalhes ou link de cobrança.

## 6. Padrões de interface observados

O layout do print segue alguns padrões consistentes:

- Cartões com fundo escuro e borda leve.
- Tipografia com hierarquia clara entre título, rótulo e valor.
- Badges coloridos para status.
- Tabelas com cabeçalho escuro e linhas bem separadas.
- Ações primárias destacadas em verde.
- Ações de risco ou atenção destacadas em vermelho.

## 7. Leitura funcional da tela

Em termos de objetivo de negócio, essa tela serve para:

- Consultar rapidamente o estado do plano.
- Identificar se o titular está inadimplente.
- Gerenciar dependentes vinculados.
- Acompanhar valores recebidos e devidos.
- Acessar o histórico financeiro e cobranças.
- Executar ações administrativas como editar, excluir, reativar e quitar débitos.

## 8. Resumo dos elementos visíveis

- Barra superior com ações rápidas.
- Card principal de detalhes do plano.
- Informações cadastrais do titular.
- Lista de dependentes em tabela.
- Botão para adicionar dependente.
- Dois cards de resumo financeiro.
- Histórico de faturas com tabela detalhada.
- Botão de quitação de débitos.

