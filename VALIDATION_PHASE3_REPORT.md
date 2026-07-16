# Relatório de validação — Fase 3 DNA Care MVP

## 1. Resumo executivo

- Resultado geral: **REPROVADO** para produção.
- Ambiente: PostgreSQL local `dnacarev2`, PostgreSQL 16.14, validação em 15/07/2026.
- Código validado: branch `deve-doug`, commit `f8c5ba3` (`fase 3`).
- Produção não foi usada. Nenhuma chamada externa ao Asaas foi executada.
- Backup local foi criado antes dos testes: dump custom temporário fora do workspace, documentado em [backup-evidence.md](validation-artifacts/phase3/backup-evidence.md).
- Código-fonte não foi alterado durante a validação. O banco local, porém, foi alterado pela execução do `seed:sandbox` sem chave; a migration não foi aplicada e fez rollback.

Bloqueadores atuais:

1. `seed:sandbox` sem `ASAAS_SANDBOX_API_KEY` terminou com sucesso em um banco já populado, em vez de falhar antes do fluxo; a execução criou quatro grupos duplicados em `tenant_users`.
2. A migration `HardenMvpConstraintsAndSubscriptions1784149200000` está pendente e bloqueada por essas duplicidades.
3. Os índices de idempotência e as colunas `subscriptions.billing_cycle`/`next_due_date` não existem no banco atual.
4. A suspensão/reativação HTTP retornou 500 por schema incompatível, portanto não foi aprovada.
5. O E2E com Asaas Sandbox válido permanece bloqueado por ausência de API Key por tenant.

## 2. Segurança do seed

| Cenário | Resultado | Evidência |
|---|---|---|
| Não há literal de chave Asaas com prefixos conhecidos no seed | PASSOU | [seed-security-results.json](validation-artifacts/phase3/seed-security-results.json) |
| Seed exige `ASAAS_SANDBOX_API_KEY` no helper | PASSOU parcialmente | variável lida de `process.env` |
| Seed sem variável falha explicitamente antes de chamada externa | FALHOU | exit code 0; registros existentes fizeram o helper externo ser pulado |
| URL Asaas de produção rejeitada em runtime | BLOQUEADO | não foi executada URL de produção; guard está apenas dentro do helper, sem preflight global |
| Seed completo contra dados relevantes | FALHOU operacionalmente | foi executado uma vez durante a validação; não houve chamada externa observada, mas surgiram duplicidades locais |

O `.env.example` contém somente os nomes `ASAAS_SANDBOX_API_KEY`, `ASAAS_SANDBOX_BASE_URL` e `ASAAS_USER_AGENT`; nenhum valor foi incluído no relatório.

## 3. Build e metadata

| ID | Cenário | Resultado | Evidência |
|---|---|---|---|
| BUILD-01 | `backend npm run typecheck` | PASSOU | exit code 0 |
| BUILD-02 | `backend npm run build` | PASSOU | exit code 0 |
| BUILD-03 | Backend em porta livre 4014 | PASSOU | [backend-start.stdout.log](validation-artifacts/phase3/backend-start.stdout.log) |
| BUILD-04 | Conexão PostgreSQL e inicialização Nest | PASSOU | rota pública respondeu; startup completo |
| BUILD-05 | `DataTypeNotSupportedError` | PASSOU | não encontrado no stdout/stderr |
| BUILD-06 | metadata de `Subscription.nextDueDate` | PASSOU no código/startup | entidade declara `date`; leitura HTTP bloqueada pelo schema pendente |
| BUILD-07 | `npm run migration:show` | FALHOU | script não existe no `package.json`; comando equivalente `npx ts-node ... migration:show` foi executado |

## 4. Pré-migration e migration

O pré-check inicial, antes do seed sem chave, retornou zero grupos duplicados em:

- `tenant_users (tenant_id, user_id)`;
- `sales (tenant_id, opportunity_id)`;
- titulares em `clients (tenant_id, opportunity_id)`;
- `subscriptions (tenant_id, sale_id)`.

Após a execução indevida do seed sem chave, a varredura encontrou quatro grupos duplicados em `tenant_users`, todos com contagem 2. Os identificadores foram convertidos em hashes parciais em [duplicates-after-seed.json](validation-artifacts/phase3/duplicates-after-seed.json); nenhum ID real foi incluído.

`npm run migration:run` iniciou transação, detectou `tenant_users` duplicado, lançou `Migration blocked` e executou `ROLLBACK`. O banco ficou sem alterações parciais da migration.

Estado final:

- migration nova: **pendente**;
- `UQ_tenant_users_tenant_user`: ausente;
- `UQ_sales_tenant_opportunity`: ausente;
- `UQ_clients_holder_tenant_opportunity`: ausente;
- `UQ_subscriptions_tenant_sale`: ausente;
- `subscriptions.billing_cycle`: ausente;
- `subscriptions.next_due_date`: ausente.

Evidências: [db-preflight.json](validation-artifacts/phase3/db-preflight.json), [duplicates-after-seed.json](validation-artifacts/phase3/duplicates-after-seed.json) e [COMMANDS.md](validation-artifacts/phase3/COMMANDS.md).

## 5. Valor recorrente

Consulta executada:

```sql
recurring_value <> base_value + dependents_value - discount
```

Resultado atual: 4 assinaturas avaliadas, 1 divergência, delta absoluto R$ 99,90. A divergência corresponde à taxa de adesão presente no valor recorrente. Portanto:

- reparação prevista pela migration: **não executada**, pois a migration foi bloqueada;
- resultado esperado “nenhuma divergência”: **FALHOU** no estado atual;
- taxa de adesão fora do recorrente: **FALHOU** nos dados locais atuais.

Evidência: [db-preflight.json](validation-artifacts/phase3/db-preflight.json).

## 6. Testes de constraints

Resultado: **BLOQUEADO**. Os índices novos não existem porque a migration não pôde ser aplicada. Não foram inseridos dados artificiais nas tabelas reais nem foram removidas duplicidades automaticamente.

Os testes que precisam ser repetidos após a correção dos dados são:

- segundo vínculo `tenant_users`;
- segunda venda para a mesma oportunidade;
- segundo titular da mesma oportunidade;
- segunda assinatura da mesma venda;
- dependentes distintos para a mesma oportunidade.

## 7. Suspensão e reativação

| ID | Cenário | Resultado | Observação |
|---|---|---|---|
| SUSP-01 | cancelar plano sem configuração Asaas | FALHOU | HTTP 500; schema ausente impediu leitura da assinatura |
| SUSP-02 | reativar plano sem configuração Asaas | FALHOU | HTTP 500; cliente/assinatura permaneceram ativos, mas o fluxo esperado de erro pendente não pôde ser exercitado |
| SUSP-03 | chave Sandbox válida, `PUT /v3/subscriptions/:id`, status INACTIVE/ACTIVE e `nextDueDate` futuro | BLOQUEADO | não há credencial Sandbox válida configurada |

O código atual prevê `PUT /v3/subscriptions/:id`, `INACTIVE` na suspensão, `ACTIVE` com `nextDueDate` na reativação e só salva o estado local após sucesso remoto. Isso foi verificado estaticamente, mas não é aprovação E2E.

Evidência: [suspension-failure-results.json](validation-artifacts/phase3/suspension-failure-results.json) e logs [suspension-backend.stdout.log](validation-artifacts/phase3/suspension-backend.stdout.log).

## 8. Regressão

Executada em porta local 4015 com o código atual:

| ID | Cenário | Resultado |
|---|---|---|
| REG-01/02 | login admin e representante | PASSOU — HTTP 201 |
| REG-03 | admin no próprio tenant | PASSOU — HTTP 200 |
| REG-04 | representante em administração global | PASSOU — HTTP 403 |
| REG-05 | token A usando tenant B sem vínculo | PASSOU — HTTP 403 |
| REG-06 | webhook sem token válido | PASSOU — HTTP 401 |
| REG-07 | webhook duplicado concorrente | PASSOU — HTTP 200/200, uma linha |
| REG-08 | `CREDIT_CARD` direto | PASSOU — HTTP 400 |
| REG-09 | checkout sem configuração Asaas | PASSOU — HTTP 400, nenhuma venda nova |
| REG-10 | quitação consolidada | PASSOU — HTTP 400 |
| REG-11 | constraints novas e E2E Asaas | BLOQUEADO |

Evidência: [regression-results.json](validation-artifacts/phase3/regression-results.json).

## 9. Divergências e erros

### E-01 — Seed não tem preflight obrigatório de credencial

- Severidade: P1.
- Reprodução: remover `ASAAS_SANDBOX_API_KEY` e executar `npm run seed:sandbox` em banco já populado.
- Resultado atual: exit code 0; o seed pula chamadas externas quando os registros já existem.
- Esperado: falha explícita antes de qualquer operação do seed.
- Correção: validar API Key, base URL Sandbox e estado de execução no início de `populate()` antes de inicializar/alterar dados.

### E-02 — Seed criou duplicidades sem constraint antiga

- Severidade: P1.
- Reprodução: seed sem chave em banco local sem os índices novos.
- Resultado atual: quatro grupos duplicados em `tenant_users`, migration bloqueada.
- Correção: corrigir/restaurar o banco a partir do backup ou fazer deduplicação aprovada e auditada; depois aplicar migration.
- Não foi feita limpeza automática.

### E-03 — Migration pendente por dados duplicados

- Severidade: P0/P1.
- Reprodução: `npm run migration:run`.
- Resultado atual: rollback no preflight de `tenant_users`.
- Correção: resolver duplicidades sem apagar dados arbitrariamente, executar novamente e validar todos os índices/colunas.

### E-04 — Suspensão/reativação não validável com schema atual

- Severidade: P1.
- Reprodução: `node validation-artifacts/phase3/suspension-failure.js` com backend atual em porta livre.
- Resultado atual: HTTP 500 antes de chegar ao comportamento Asaas, porque `billing_cycle`/`next_due_date` não existem.
- Correção: aplicar migration após saneamento e repetir o teste com chave Sandbox válida e mock/spy de HTTP seguro.

## 10. Bloqueadores para produção remanescentes

- Resolver os quatro grupos duplicados sanitizados e aplicar a migration sem intervenção destrutiva não autorizada.
- Confirmar constraints novas e testes concorrentes com rollback.
- Corrigir o preflight do seed e impedir base URL de produção antes de qualquer mutação.
- Corrigir o valor recorrente e comprovar zero divergências após migration.
- Executar suspensão/reativação real no Sandbox com `PUT`, estados remotos e `nextDueDate` persistido.
- Repetir todo o relatório anterior após o banco estar no schema final.

## 11. Recomendações para o MVP_CHECKLIST.md

Não editei o checklist nesta validação.

- `DB-000`: pode permanecer concluído, pois o metadata do `teamId` e o startup sem `DataTypeNotSupportedError` passaram.
- `DB-001`, `CONV-003`, `SUB-004`, `SUB-005`, `QA-003`: manter como pendentes/bloqueadores; a migration e o E2E não passaram.
- `SALE-005`/`SUB-001`: manter parcialmente concluídos ou rebaixar até a consulta recorrente retornar zero divergências.
- Critérios “migration aplicada”, “suspensão/reativação consistente” e “E2E Sandbox”: não marcar como concluídos.
- Adicionar item específico para preflight obrigatório do seed e rejeição de base URL de produção antes da inicialização.
- Adicionar item para impedir execução do seed em banco populado sem confirmação explícita/backup verificável.
- Atualizar a seção de validação manual com os artefatos [db-preflight.json](validation-artifacts/phase3/db-preflight.json), [regression-results.json](validation-artifacts/phase3/regression-results.json) e [suspension-failure-results.json](validation-artifacts/phase3/suspension-failure-results.json).

## 12. Arquivos de evidência

Todos os artefatos novos da Fase 3 estão em [validation-artifacts/phase3/](validation-artifacts/phase3/). Eles contêm apenas contagens, hashes parciais, estados, comandos, logs locais e resultados sanitizados. Não incluem dump do banco, CPF/CNPJ completo, senha, token ou API Key.
