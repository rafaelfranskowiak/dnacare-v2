# Relatório de validação local — DNA Care MVP Fase 3.1

**Data:** 16/07/2026  
**Escopo:** PostgreSQL local `dnacarev2`, backend local e regressões HTTP em `127.0.0.1:4017`  
**Commit base:** `f8c5ba3`  
**Resultado executivo:** **REPROVADO / BLOQUEADO PARA PRODUÇÃO**

## Resumo

Passaram os controles de segurança do seed sem credencial e com URL de produção, a auditoria/reparo conservador de `tenant_users`, o hotfix TypeORM, o typecheck e as regressões HTTP essenciais.

A migração de constraints **falhou e sofreu rollback** por incompatibilidade de tipos: `sales.id` é `uuid` e `subscriptions.sale_id` é `varchar`, mas a migração compara os campos diretamente. Como consequência, os quatro índices exigidos e as colunas `subscriptions.billing_cycle`/`next_due_date` não foram persistidos; a divergência do valor recorrente continua em 1 registro, com diferença absoluta de R$ 99,90.

Não foi usado ambiente de produção nem chamada externa ao Asaas. Não foram alterados arquivos de código durante esta validação. Houve alteração controlada no PostgreSQL local: remoção de quatro duplicidades semanticamente idênticas em `tenant_users`, após backup e auditoria.

## Status por cenário

| Área | Status | Evidência |
|---|---|---|
| Hotfix `TenantUser.teamId` | PASSOU | `tenant-user.entity.ts:18-19` declara `type: 'varchar'`, `nullable: true`, `string \| null` |
| Backup antes do reparo | PASSOU | `validation-artifacts/phase3-1/backup-metadata.txt` |
| Seed sem `ASAAS_SANDBOX_API_KEY` | PASSOU | exit 1 antes de inicializar/acessar o banco |
| Seed com URL oficial de produção e chave fictícia | PASSOU | exit 1 antes de banco/chamada externa |
| Banco populado sem `ALLOW_POPULATED_SANDBOX_SEED=true` | BLOQUEADO | sem chave Sandbox válida; não foi simulada aprovação |
| Auditoria de duplicidades | PASSOU | 4 grupos, 2 linhas por grupo, assinaturas semânticas únicas |
| Reparo conservador | PASSOU | comando confirmado; somente duplicidades exatas removidas; pós-reparo: 0 grupos |
| Migration | FALHOU / BLOQUEADOR | SQLSTATE `42883`; rollback confirmado |
| Índices de unicidade da Fase 3.1 | BLOQUEADO | nenhum dos 4 índices exigidos existe após rollback |
| Colunas de assinatura | BLOQUEADO | `billing_cycle` e `next_due_date` continuam ausentes |
| Valor recorrente | FALHOU | 1 divergência; delta absoluto R$ 99,90 |
| Constraints em transação | FALHOU | `tenant_users` e `sales` aceitaram duplicatas artificiais; os outros dois já tinham constraints legadas; dependente distinto foi permitido |
| Idempotência completa do seed | BLOQUEADO | sem chave Sandbox válida/autorização operacional |
| Suspensão/reativação Asaas | BLOQUEADO | migração pendente e ausência de chave Sandbox |
| Regressão HTTP mínima | PASSOU | REG-01 a REG-10; REG-11 bloqueado por migração/Asaas |
| Backend typecheck | PASSOU | `npm run typecheck` |
| Backend lint | BLOQUEADO | `eslint` não está instalado em `backend/node_modules` |

## Evidências do banco

Preflight inicial no PostgreSQL local:

- `tenant_users`: 8 linhas, com 4 grupos duplicados;
- `plan_versions`: 8 linhas, com 3 duplicidades `(plan_id, version)` históricas;
- `opportunity_dependents`: 4 linhas, com 2 duplicidades `(opportunity_id, document_normalized)` históricas;
- `sales`, titulares e assinaturas: sem grupos duplicados nos pares auditados;
- 4 assinaturas, 1 divergência recorrente de R$ 99,90;
- 1 venda possui taxa de adesão e 1 recorrência ainda a inclui indevidamente.

Após o reparo de `tenant_users` e o rollback da migration:

- `tenant_users`: 4 linhas, 0 grupos duplicados;
- as duplicidades históricas de `plan_versions` e dependentes permanecem e não foram removidas automaticamente, pois o script aprovado pelo roteiro cobre apenas `tenant_users`;
- a migration `HardenMvpConstraintsAndSubscriptions1784149200000` permanece pendente;
- os quatro índices `UQ_tenant_users_tenant_user`, `UQ_sales_tenant_opportunity`, `UQ_clients_holder_tenant_opportunity` e `UQ_subscriptions_tenant_sale` não existem;
- `subscriptions.billing_cycle` e `subscriptions.next_due_date` não existem;
- a divergência recorrente permanece em 1.

Os detalhes sanitizados estão em [`validation-artifacts/phase3-1/`](validation-artifacts/phase3-1/).

## Reprodução do erro da migration

Com PostgreSQL local e dependências já instaladas:

```text
cd backend
npm run migration:show
npm run migration:run
```

Resultado: a migration inicia transação, cria temporariamente os objetos anteriores ao erro e falha no `UPDATE` de `subscriptions` com:

```text
SQLSTATE 42883: operator does not exist: uuid = character varying
```

A expressão problemática é equivalente a:

```sql
WHERE sale.id = subscription.sale_id
  AND sale.tenant_id = subscription.tenant_id
```

O TypeORM registra `ROLLBACK`; um novo `npm run migration:show` confirma a migration pendente e o preflight confirma que não ficaram índices/colunas parciais.

## Seed e credenciais

O `.env` local não possui `ASAAS_SANDBOX_API_KEY`. Por isso:

- o cenário sem chave foi executado e passou;
- o cenário com URL de produção usou apenas um valor fictício de teste e foi bloqueado antes de qualquer requisição;
- o cenário de banco populado com chave Sandbox real não foi simulado;
- a idempotência com duas execuções não foi aprovada artificialmente.

Nenhum segredo, valor de `DATABASE_URL`, JWT ou credencial foi salvo neste relatório ou nos artefatos.

## Regressões HTTP executadas

Em backend local, `127.0.0.1:4017`:

- login de administrador: 201 — PASSOU;
- login de representante: 201 — PASSOU;
- acesso do próprio tenant: 200 — PASSOU;
- representante em administração global: 403 — PASSOU;
- tenant A usando tenant B sem vínculo: 403 — PASSOU;
- webhook sem token: 401 — PASSOU;
- duas entregas concorrentes do mesmo evento: 200/200 e uma linha local — PASSOU;
- `CREDIT_CARD`: 400 — PASSOU;
- checkout sem configuração Asaas: 400, sem nova venda — PASSOU;
- quitação consolidada: 400 — PASSOU.

O teste de suspensão sem configuração não pôde chegar ao comportamento da Fase 3.1: a consulta da assinatura retorna 500 porque as colunas novas ainda não existem. O estado local observado permaneceu inalterado. O E2E externo com `PUT /v3/subscriptions/:id`, `INACTIVE`, `ACTIVE` e `nextDueDate` futuro ficou bloqueado por ausência de chave Sandbox válida e pela migration pendente.

## Bloqueadores para produção

1. Corrigir a incompatibilidade `uuid`/`varchar` na migration e reaplicar em banco local restaurável.
2. Executar e comprovar a migration; sem isso, as constraints contra corrida não existem.
3. Corrigir e zerar a divergência de recorrência, mantendo taxa de adesão somente no valor inicial.
4. Reexecutar os testes transacionais dos quatro pares de unicidade após a migration.
5. Executar idempotência e E2E Asaas com credencial Sandbox válida, autorização operacional e novo backup.
6. Instalar/recuperar as dependências de lint e executar lint/build completos.

## Recomendações para atualização do `MVP_CHECKLIST.md`

- Manter `DB-001`, `SUB-001`, `SUB-002`, `SUB-004`, `SEED-001`, `SEED-002`, `SEED-003`, `CONV-003` e `QA-003` como pendentes ou bloqueados; não marcar como concluídos com base nesta execução.
- Atualizar `DB-001` com a reprodução `42883` e o requisito de cast explícito ou comparação textual consistente entre `sales.id` e `subscriptions.sale_id`.
- Registrar que o reparo de `tenant_users` foi executado localmente após backup, mas que duplicidades de `plan_versions` e dependentes ainda precisam de decisão/limpeza específica.
- Adicionar critério obrigatório: migration aplicada, quatro índices presentes, duas colunas presentes, divergência recorrente zero e constraints transacionais rejeitando duplicatas.
- Manter idempotência do seed e E2E Asaas bloqueados enquanto não houver chave Sandbox válida e autorização operacional documentada.
- Registrar a ausência de `eslint` como bloqueador de qualidade do ambiente, não como aprovação de lint.

## Próximos ajustes por prioridade

1. Corrigir a migration sem editar dados de produção; testar em cópia/restauração local.
2. Reexecutar migration, preflight, recorrência e constraints em transações revertidas.
3. Decidir e documentar o tratamento das duplicidades de `plan_versions` e dependentes.
4. Obter chave Sandbox válida, rotacionada e autorizada; executar seed idempotente duas vezes.
5. Repetir suspensão/reativação externa e verificar estados local/Asaas.
6. Restaurar dependências de lint e executar lint/build/testes automatizados.

## Comandos e artefatos

O inventário de comandos está em [`validation-artifacts/phase3-1/commands.txt`](validation-artifacts/phase3-1/commands.txt). O backup foi criado antes da primeira mutação local e permanece fora do repositório; seus metadados sanitizados estão em [`validation-artifacts/phase3-1/backup-metadata.txt`](validation-artifacts/phase3-1/backup-metadata.txt).

O working tree já continha alterações do usuário em `MVP_CHECKLIST.md`, `.env.example`, migration, seed e `package.json`, além dos artefatos da Fase 3. Essas alterações foram preservadas; nenhum arquivo de código foi modificado durante a validação.
