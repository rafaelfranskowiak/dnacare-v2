---
name: bug-report
description: >
  Documenta bugs em relatórios estruturados com severidade, passos de reprodução e
  tarefas vinculadas. Use esta skill SOMENTE quando o usuário pedir explicitamente
  para "reportar um bug", "documentar o erro", "criar um bug report", "registrar o bug",
  ou frases similares que indiquem uma vontade ativa de registro formal.
  NÃO ative automaticamente ao detectar erros; aguarde o comando do usuário.
  Cria e gerencia bugs-reports/ na raiz do projeto.
---

## Visão Geral

Quando invocada, extrai do contexto da conversa o bug identificado e:

1. Cria a estrutura `bugs-reports/` na raiz do projeto (se não existir)
2. Gera relatório individual em `bugs-reports/reports/open/NNNN-nome-descritivo.md`
3. Adiciona o bug ao checklist `bugs-reports/pending-bugs.md`
4. Detecta duplicatas com bugs já reportados
5. Faz perguntas direcionadas se faltarem info cruciais
6. Opcionalmente cria task vinculada no formato do projeto (speckit-tasks, GitHub issue, etc.)

## Estrutura de Diretórios

```
bugs-reports/
├── pending-bugs.md        # Checklist de bugs pendentes (open / in_analysis / in_progress)
├── resolved-bugs.md       # Checklist de bugs resolvidos (resolved / closed)
└── reports/
    ├── open/               # Bugs aguardando correção
    │   ├── 0001-nome-descritivo.md
    │   └── ...
    └── resolved/           # Bugs já corrigidos (movidos apenas com confirmação do usuário)
        ├── 0002-outro-bug.md
        └── ...
```

## Workflow

### 1. Extrair Informações do Contexto

Extraia da conversa o máximo possível:

| Campo | Descrição |
|-------|-----------|
| **Título descritivo** | Curto, em kebab-case (ex: `scroll-nao-carrega-mensagens`) |
| **Descrição** | O que acontece, em 1-3 frases |
| **Passos para reproduzir** | Sequência de ações que leva ao bug |
| **Comportamento esperado** | O que deveria acontecer |
| **Comportamento atual** | O que acontece de errado |
| **Severidade** | `critical` (sistema quebra) / `high` (funcionalidade principal afetada) / `medium` (funcionalidade secundária afetada) / `low` (cosmético/melhoria) |
| **Tags** | Categorias: `ui`, `backend`, `performance`, `security`, `auth`, `data`, `api`, `mobile`, `build`, `infra` |
| **Ambiente** | Browser, SO, versão, mobile/desktop, rota/URL — extraia do contexto |

### 2. Perguntar se Faltam Informações

Se info crítica para REPRODUZIR O BUG estiver faltando, pergunte ao usuário. Seja específico:

- ❌ "Me dê mais detalhes"
- ✅ "Isso acontece no mobile ou desktop? E qual browser você estava usando?"
- ✅ "Qual o passo exato antes do erro aparecer? Você clicou em algum botão?"
- ✅ "Apareceu alguma mensagem de erro no console ou na tela?"

Máximo 2-3 perguntas. O usuário está reportando um bug, não preenchendo formulário.

### 3. Verificar Duplicatas

Leia `bugs-reports/reports/open/` e `bugs-reports/reports/resolved/` (se existirem) para verificar se bug similar já foi reportado.

- Se encontrar duplicata **em open**: avise o usuário com o número e título, ofereça adicionar info nova ao existente
- Se encontrar duplicata **em resolved**: avise o usuário que já foi resolvido, pergunte se o problema voltou
- Se não houver duplicata: prossiga

### 4. Determinar Próximo Número

Leia arquivos em `bugs-reports/reports/open/` e `bugs-reports/reports/resolved/` para achar o próximo número sequencial (o número é único entre todos os reports, independente de status).
- Listar arquivos com padrão `NNNN-*.md` em ambas as pastas
- Extrair o prefixo numérico de 4 dígitos
- O próximo é `max + 1`, padding com zeros à esquerda (ex: `0001`, `0002` ... `0102`)

### 5. Criar Relatório Individual

Arquivo: `bugs-reports/reports/open/NNNN-titulo-em-kebab-case.md`

Use o template abaixo. O título kebab-case é o nome do arquivo + identificador amigável. Exemplo: se o bug é "scroll não carrega mensagens antigas no chat", o arquivo é `0003-scroll-nao-carrega-mensagens-antigas.md`.

```markdown
# Bug Report: NNNN-titulo-descritivo

**Status**: open
**Severidade**: [critical | high | medium | low]
**Tags**: [tag1, tag2]
**Reportado**: YYYY-MM-DD
**Resolvido**:
**Tarefa vinculada**:

## Descrição


## Passos para Reproduzir

1. 
2. 
3. 

## Comportamento Esperado


## Comportamento Atual


## Ambiente


## Logs / Screenshots


## Notas
```

### 6. Atualizar pending-bugs.md

Adicione entrada ao final do checklist em `bugs-reports/pending-bugs.md`:

```markdown
- [ ] `NNNN` - Título amigável — [report](reports/open/NNNN-titulo-descritivo.md) (severidade: medium)
```

Se o arquivo não existir, crie com:
```markdown
# Pending Bugs

Total: 0

```

Após adicionar, atualize a linha `Total:` no cabeçalho.

### 7. Vincular Tarefa (Opcional)

Se o projeto tiver sistema de tasks (speckit-tasks, `.specify/tasks.md`, ou similar), ofereça criar uma task vinculada. Pergunte ao usuário: "Quer que eu crie uma tarefa para este bug também?"

Se sim, crie a task no formato do projeto. A referência cruzada deve ser bidirecional:
- No relatório: `**Tarefa vinculada**: [task-name](path/to/task)`
- Na task: `**Bug report**: [NNNN-titulo](path/to/report)`

## Ciclo de Vida do Status

| Status | Significado | Pasta do Relatório | Checklist |
|--------|-------------|-------------------|-----------|
| open | Reportado, aguardando análise | reports/open/ | pending-bugs.md |
| in_analysis | Em investigação | reports/open/ | pending-bugs.md |
| in_progress | Sendo corrigido | reports/open/ | pending-bugs.md |
| resolved | Correção aplicada | reports/resolved/ | resolved-bugs.md |
| closed | Verificado e aceito pelo usuário | reports/resolved/ | resolved-bugs.md |

A transição de `reports/open/` → `reports/resolved/` (movimento físico do arquivo) é gerenciada pela skill **bug-fix**, que SEMPRE pergunta ao usuário antes de mover.

### Regra para mover para resolved

NUNCA mova um report de `open/` para `resolved/` sem confirmação explícita do usuário. O motivo: o usuário pode querer testar a correção antes de considerar o bug resolvido. Apenas mova quando o usuário disser algo como "pode mover", "pode fechar", "está resolvido", "ok, pode resolver".

## Comportamento por Cenário

- **Usuário diz explicitamente "reporta esse bug", "documenta isso", ou similar**: execute o workflow completo
- **Usuário apenas descreve um erro sem pedir registro**: NÃO ative a skill; apenas ajude com o código/problema
- **Usuário diz "tem um bug" ou "encontrei um erro" sem contexto**: pergunte se ele deseja reportar formalmente ou apenas resolver agora
- **Bug duplicado**: avise e ofereça consolidar info se ele decidir reportar
- **Usuário pergunta "esse bug já foi reportado?"**: faça busca nos reports e responda
