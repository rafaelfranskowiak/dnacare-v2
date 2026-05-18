# Checklist de implementacao - rota `/dashboard/clientes`

Baseado na comparacao entre o mock anexado e a implementacao atual em `frontend/src/app/dashboard/clientes/page.tsx`.

## Objetivo

Transformar a pagina atual, que hoje funciona como uma listagem simples de clientes, em uma tela de operacao mais rica, com:

- contexto visual mais forte
- cards de KPI no topo
- filtros mais completos
- tabela com campos realmente uteis para operacao
- paginação visivel
- maior alinhamento com o fluxo de acompanhamento de vidas

## Diagnostico rapido

- O backend ja entrega listagem paginada em `GET /clients` e devolve `meta.total`.
- O backend ja possui dados para tela de detalhe e historico financeiro.
- A pagina atual ainda nao explora os metadados da listagem.
- O mock introduz informacao agregada que hoje esta em `reports`, nao na pagina de clientes.

## Checklist de frontend

### Estrutura da pagina

- [ ] Trocar o titulo principal de `Clientes` para `Vidas`, se a proposta do produto for adotar a linguagem do mock.
- [ ] Atualizar o subtitulo para uma mensagem mais operacional, focada em gestao e acompanhamento.
- [ ] Inserir um bloco superior com cards de KPI antes dos filtros.
- [ ] Separar visualmente o header da pagina, os cards e a area da tabela com espacamento consistente.
- [ ] Ajustar o container da pagina para ter a mesma densidade visual do mock.

### Cards de KPI

- [ ] Exibir `Vidas totais`.
- [ ] Exibir `Ativos`.
- [ ] Exibir `Inadimplentes`.
- [ ] Exibir `Inativos`.
- [ ] Mostrar subtotais de `Titulares` e `Dependentes` dentro de cada card, quando houver dado disponivel.
- [ ] Definir icone ou indicador visual por estado para reforcar leitura rapida.
- [ ] Padronizar cores semanticas por status, sem depender apenas de texto.

### Filtros

- [ ] Manter filtro de tipo.
- [ ] Manter filtro de status.
- [ ] Ampliar busca para aceitar telefone, alem de nome e CPF.
- [ ] Adicionar filtro de plano, se a informacao vier da assinatura ou de uma query com join.
- [ ] Adicionar filtro de UF usando o campo `state` do cliente.
- [ ] Exibir contador de registros ao lado dos filtros.
- [ ] Permitir buscar sem precisar trocar filtro, apenas com Enter ou botao dedicado.

### Tabela

- [ ] Trocar a coluna `Criado em` por campos mais uteis ao atendimento diario.
- [ ] Exibir `Telefone`.
- [ ] Exibir `CPF`.
- [ ] Exibir `Cidade` e `UF`.
- [ ] Manter `Nome`, `Tipo` e `Status`.
- [ ] Padronizar os badges de `Tipo` com semantica visual clara entre `Titular` e `Dependente`.
- [ ] Padronizar os badges de `Status` com as cores do mock.
- [ ] Garantir que nomes longos quebrem bem sem destruir a linha.
- [ ] Revisar hover, bordas e separadores para deixar a tabela mais legivel em tema escuro.

### Paginação e estado de lista

- [ ] Ler `meta.total` retornado pelo backend.
- [ ] Exibir pagina atual e total de paginas.
- [ ] Adicionar `Anterior` e `Proximo`.
- [ ] Adicionar numeros de pagina com `...` quando o volume for grande.
- [ ] Persistir filtros ao navegar entre paginas.
- [ ] Desabilitar controles corretamente no primeiro e no ultimo bloco.

### Estados de tela

- [ ] Criar estado de loading mais forte do que apenas um texto simples.
- [ ] Criar estado vazio consistente com o tom do mock.
- [ ] Garantir que erros de busca ou rede tenham feedback claro.
- [ ] Evitar que a pagina fique vazia sem explicacao quando a API falhar.

### Header da pagina

- [ ] Avaliar se o header global atual deve ser mantido como esta ou receber um contexto mais especifico para a rota de clientes.
- [ ] Se o mock for adotado, exibir badge de tenant e status do usuario de forma mais proeminente.
- [ ] Revisar se os icones de notificacao e tema devem aparecer nessa rota ou apenas no shell global.

## Checklist de backend

### Listagem de clientes

- [ ] Confirmar que `GET /clients` continua retornando `data` + `meta`.
- [ ] Garantir suporte a `page` e `limit` no frontend.
- [ ] Verificar se a pagina atual passa `page` e `limit` na query.
- [ ] Expandir o filtro de busca para incluir telefone, se isso for requisito do mock.
- [ ] Avaliar se o filtro por plano precisa vir de um join com assinatura.
- [ ] Verificar se o filtro por UF pode usar diretamente `state`.

### Indicadores da pagina

- [ ] Reaproveitar `GET /reports/unit-dashboard` para obter agregados de clientes, se ele for suficiente.
- [ ] Caso os KPIs da pagina de clientes precisem ser mais especificos, criar um endpoint dedicado ou expandir o contrato atual.
- [ ] Confirmar a definicao de `Vidas totais`, `Ativos`, `Inadimplentes` e `Inativos` para nao haver divergencia de negocio.

### Contrato de dados

- [ ] Validar se a listagem atual expoe todos os campos necessarios para a tabela do mock.
- [ ] Se `plano` nao existir na listagem, decidir entre buscar por join ou remover o filtro da UI.
- [ ] Se `telefone` nao for padrao de listagem, decidir entre ampliar o payload ou aceitar um layout menos denso.
- [ ] Se `status` puder ter mais estados internos, definir quais aparecem na tela principal e quais ficam ocultos.

## Checklist de design system

- [ ] Decidir se a tela vai seguir o tema claro atual ou adotar o visual mais escuro do mock.
- [ ] Manter a linguagem de bordas e `shadow-sm`, mas rever a densidade vertical dos blocos.
- [ ] Uniformizar raio, paddings e alturas de campos para aproximar a composicao do mock.
- [ ] Ajustar hierarquia tipografica dos KPI cards.
- [ ] Rever a cor de fundo da pagina para garantir contraste com cards e tabela.
- [ ] Validar legibilidade dos chips coloridos em dark mode.

## Sequencia sugerida de execucao

1. Fechar o contrato visual final: manter o sistema atual ou aproximar do mock.
2. Adicionar paginação real na UI usando `meta.total`.
3. Inserir KPI cards reaproveitando os agregados existentes em `reports`.
4. Expandir filtros de busca e de localidade.
5. Reorganizar a tabela para os campos mais uteis.
6. Revisar estados vazios, loading e erro.
7. Validar se algum ajuste de backend e necessario para plano, UF ou telefone.

## Riscos e decisoes em aberto

- O mock usa informacoes que nao estao todas expostas na listagem atual.
- O campo de `plano` pode exigir join com assinatura, e isso impacta custo e contrato.
- A mudanca de linguagem de `Clientes` para `Vidas` pode pedir alinhamento com produto e negocio.
- Se o objetivo for so visual, alguns filtros do mock devem ser retirados ou simplificados.

## Resultado esperado

Ao final, a rota `/dashboard/clientes` deve deixar de parecer uma tabela basica e passar a funcionar como uma tela de acompanhamento operacional, com leitura rapida de status, contexto de volume e acesso claro aos detalhes do cliente.
