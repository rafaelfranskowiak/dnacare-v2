---
name: bug-fix
description: >
  Corrige bugs documentados nos relatórios de bug-report. Use esta skill quando o
  usuário pedir para "resolver um bug", "corrigir issue", "fazer o fix", "aplicar
  correção", ou especificamente mencionar um número de bug (ex: "corrige o bug
  0003"). Também quando pedir implementação de correção baseada em relatório
  existente. Antes de codificar, lê o relatório, analisa se o bug já não foi
  resolvido acidentalmente, pergunta dúvidas, implementa, verifica com testes, e
  atualiza checklists. Trabalha em conjunto com a skill bug-report.
---

## Visão Geral

Workflow completo de correção de bugs:

1. Identifica o bug a corrigir
2. Lê o relatório detalhado
3. Verifica se já foi corrigido acidentalmente
4. Faz perguntas direcionadas se necessário
5. Analisa o código para encontrar causa raiz
6. Implementa a correção seguindo convenções do projeto
7. Verifica com testes
8. Atualiza relatório e checklists (pending-bugs.md → resolved-bugs.md)
9. Informa o usuário do que foi feito

## Workflow

### 1. Identificar o Bug

- Se o usuário mencionou número (`"corrige o 0003"` ou `"bug 0003"`): ache o arquivo em `bugs-reports/reports/open/0003-*.md` ou `bugs-reports/reports/resolved/0003-*.md`
- Se mencionou descrição: busque por termo em `bugs-reports/reports/open/` e `bugs-reports/reports/resolved/`
- Se está no contexto da conversa mas não explícito: deduza
- Se não conseguir identificar: pergunte "Qual bug você quer corrigir? Pode me dar o número ou descrever?"

### 2. Ler o Relatório

Leia o relatório completo em `bugs-reports/reports/open/NNNN-titulo.md`. Entenda:

- Descrição e passos de reprodução
- Severidade (prioriza critical/high)
- Tags (ajuda a localizar código relevante)
- Status atual (se já estiver resolved/closed, avise)

### 3. Verificar se Já Foi Corrigido

Antes de implementar, investigue se o bug pode já ter sido resolvido acidentalmente por mudanças posteriores:

- Use `git log --oneline -20` para ver commits recentes
- Busque changesets que tocaram arquivos relevantes à área do bug
- Se possível, tente reproduzir o bug seguindo os passos do relatório
- Se encontrar evidência de correção acidental:
  - Avise o usuário: "Parece que esse bug já foi resolvido pelo commit XXXX"
  - Ofereça: "Quer que eu mova para resolved mesmo assim ou prefere investigar mais?"
- Se o usuário confirmar, pule para a etapa 9

### 4. Perguntar Dúvidas

- Se os passos de reprodução forem vagos: "Consegue me dar o fluxo exato? Qual tela/rota?"
- Se não souber onde procurar no código: "Sabe em qual parte do sistema isso acontece? (frontend/backend/mobile?)"
- Máximo 2-3 perguntas por rodada

### 5. Analisar o Código

Use as ferramentas de busca para encontrar a causa raiz:

1. **Busque por termos-chave**: strings de erro, nomes de componentes, rotas mencionadas no relatório
2. **Siga o fluxo**: do ponto de entrada (UI/rota) até a lógica afetada
3. **Entenda o contexto**: arquivos vizinhos, imports, funções chamadas
4. **Identifique a causa**: o que está errado — lógica, estado, tipagem, API call, race condition, etc.

Documente mentalmente (ou em nota no relatório) a causa raiz encontrada.

### 6. Atualizar Status para in_progress

Edite o relatório:
```markdown
**Status**: in_progress
```

### 7. Implementar a Correção

Siga as convenções do projeto:

- **Mesmo estilo de código**: olhe arquivos vizinhos para entender padrões
- **Mesmas bibliotecas**: não introduza novas dependências sem perguntar
- **Mínimo necessário**: não faça refactors ou mudanças não relacionadas ao bug
- **Trate bordas**: considere estado vazio, erro, loading, edge cases
- **Sem comentários**: a menos que o projeto explicitamente use comentários (verifique)

Se a correção for complexa, explique brevemente sua abordagem antes de implementar.

### 8. Verificar a Correção

1. **Testes existentes**: encontre e execute os testes do projeto
   - Procure por `package.json` scripts, `pytest`, `vitest`, etc.
   - Execute com `npm test` / `pytest` / comando equivalente
2. **Se possível**: tente rodar a aplicação e verificar os passos de reprodução
3. **Se testes quebrarem**: ajuste a correção ou atualize os testes se a mudança for correta

### 9. Atualizar o Relatório e Checklists

**Relatório individual** (`bugs-reports/reports/open/NNNN-titulo.md`):
```markdown
**Status**: resolved
**Resolvido**: YYYY-MM-DD
```

Adicione seção de correção ao final:
```markdown
## Correção

**Causa raiz**: [explica brevemente o que causava o bug]
**Solução**: [explica o que foi feito para corrigir]
**Commits/arquivos alterados**:
- `caminho/do/arquivo.ts` — [o que mudou]
```

**PRIMEIRO: pergunte ao usuário se pode mover para resolved.** O usuário pode querer testar a correção antes de considerar o bug resolvido. Portanto, NUNCA mova o report para resolved sem confirmação explícita.

Pergunte algo como: "A correção foi aplicada. Quer que eu mova o report NNNN para resolved, ou prefere testar antes?"

**SÓ se o usuário confirmar**, faça:

1. **Mover o arquivo fisicamente**:
   ```
   Mover: bugs-reports/reports/open/NNNN-titulo.md → bugs-reports/reports/resolved/NNNN-titulo.md
   ```

2. **pending-bugs.md**: encontre a linha do bug e remova-a

3. **resolved-bugs.md**: adicione entrada:
```markdown
- [x] `NNNN` - Título amigável — [report](reports/resolved/NNNN-titulo-descritivo.md) — resolvido YYYY-MM-DD
```

Se o arquivo `resolved-bugs.md` não existir, crie com cabeçalho:
```markdown
# Resolved Bugs

Total: 0

```

Atualize contagens em ambos os checklists.

Se o usuário disser "não, deixa pendente" ou "quero testar antes", NÃO mova o report. Deixe em `reports/open/` com status `resolved` no frontmatter. O usuário poderá pedir para mover depois.

### 10. Informar o Usuário

Resuma:
- **Causa raiz**: o que estava errado
- **O que foi alterado**: arquivos modificados
- **Como verificar**: passos ou testes para confirmar a correção
- **Status atual**: informe se foi movido para resolved ou se ficou pendente de teste

## Comportamento por Cenário

- **Bug já resolvido acidentalmente**: avise e ofereça atualizar status, mas pergunte se pode mover para resolved
- **Não consegue reproduzir**: informe o usuário, pergunte se tem mais info
- **Correção requer mudanças em múltiplas camadas**: implemente camada por camada, verificando cada uma
- **Usuário discorda da correção**: reverta e tente abordagem alternativa
- **Testes não existem na área**: avise o usuário e implemente a correção com cautela
- **Usuário pede para mover depois**: se o report já estava com status `resolved` mas em `open/`, execute apenas a movimentação física do arquivo + atualização dos checklists
