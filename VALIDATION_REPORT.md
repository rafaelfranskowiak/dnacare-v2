# Relatório de validação — DNA Care MVP

## 1. Resumo executivo

- Resultado geral: **REPROVADO** para produção.
- Ambiente e data: PostgreSQL local `dnacarev2`, PostgreSQL 16.14, 15/07/2026, America/Sao_Paulo.
- Hotfix `TenantUser.teamId`: **PASSOU**. O código contém `@Column({ name: 'team_id', type: 'varchar', nullable: true })` e `teamId: string | null`; o banco confirma `character varying NULL`.
- Nenhuma alteração foi feita em código-fonte ou em `MVP_CHECKLIST.md`. Foram criados somente artefatos de validação.
- Não foram feitas chamadas externas ao Asaas: os dois tenants locais estão com `asaas_sandbox=true`, porém sem API Key/token configurados.

Bloqueadores para produção:

1. Frontend `next build` falha no estágio final (`ENOENT` ao renomear `.next/export/500.html`).
2. Não existem constraints de unicidade para `tenant_users`, `sales`, `clients` e `subscriptions`; não há tabela `payments`.
3. Reativação marca cliente/assinatura como ativos localmente sem sincronização com Asaas.
4. Há uma divergência de dados: uma assinatura local inclui R$ 99,90 de taxa de adesão no valor recorrente.
5. Conversão completa no Sandbox Asaas não foi executada por falta de credencial por tenant.
6. `npm audit` encontrou 10 vulnerabilidades altas no backend e 4 altas no frontend.
7. Existe literal de credencial Sandbox hard-coded em `backend/database/seeds/populate-sandbox.ts`; o valor foi deliberadamente omitido deste relatório e dos logs.

## 2. Evidências do ambiente

| Item | Valor sanitizado | Evidência |
|---|---|---|
| Branch/commit | `deve-doug` / `ad245186739261488e69206a33e81e03f0b23b4e` | `git status`, `git rev-parse` |
| Alterações rastreadas | nenhuma antes da validação | `git diff --stat` vazio |
| Node/npm | `v24.3.0` / `11.4.2` | comando de inventário |
| Docker | `29.2.0` / Compose `v5.0.2` | comando de inventário |
| Compose do projeto | não existe no diretório | `docker compose ps` retornou “no configuration file” |
| Containers | PostgreSQL `pgvector/pg16` em execução, sem porta publicada no host | `docker ps -a` |
| PostgreSQL | `dnacarev2`, usuário sanitizado, PostgreSQL 16.14; conexão local via `127.0.0.1:5433` | [db-audit.json](validation-artifacts/db-audit.json) |
| Variáveis | `.env` backend e `.env.local` frontend presentes; nomes/valores não foram copiados | inventário sanitizado |
| Asaas | ambos os tenants locais em Sandbox; API Key e token de webhook ausentes | [db-audit.json](validation-artifacts/db-audit.json) |
| TypeORM | `synchronize: false`, migrations explícitas, logging de desenvolvimento | `datasource.ts` e `database.config.ts` |
| Migrations | 7 aplicadas; `npm run migration:run`: “No migrations are pending” | `migration:show` e [db-audit.json](validation-artifacts/db-audit.json) |
| Hotfix | `team_users.team_id` = `character varying`, nullable | [db-audit.json](validation-artifacts/db-audit.json) |

Schema local resumido: as dez tabelas solicitadas existem, mas as colunas de relacionamento são majoritariamente `varchar` apontando para UUIDs e não há FKs registradas. Existem PKs, unicidade de slug/email, unicidade de documento por tenant, unicidade de assinatura por tenant/cliente e unicidade global de `webhook_events.asaas_event_id`.

## 3. Resultado por teste

| ID | Área | Cenário | Resultado | Evidência | Impacto |
|---|---|---|---|---|---|
| ENV-01 | Ambiente | Conexão real ao PostgreSQL local | PASSOU | [db-audit.json](validation-artifacts/db-audit.json) | base local confirmada |
| ENV-02 | Ambiente | Hotfix `teamId`/`team_id` | PASSOU | [db-audit.json](validation-artifacts/db-audit.json) | remove o erro de metadata observado |
| ENV-03 | Banco | migrations aplicadas e sem pendências | PASSOU | `migration:run`, `migration:show` | nenhum drift detectado |
| BUILD-01 | Backend | `npm run build` | PASSOU | saída do comando; startup alternativo | compilação OK |
| BUILD-02 | Backend | `npm run typecheck` | PASSOU | saída do comando | tipos OK |
| BUILD-03 | Backend | `npm test -- --runInBand` | FALHOU | “No tests found”; 0 specs | ausência de cobertura automatizada |
| BUILD-04 | Backend | `npm run lint` | FALHOU | `eslint` não é reconhecido; não está disponível no backend | qualidade não automatizada |
| BUILD-05 | Backend | `start:dev` em porta livre 4013 | PASSOU | [backend-start-4013.stdout.log](validation-artifacts/backend-start-4013.stdout.log) | Nest inicializou, carregou entidades e conectou ao banco |
| BUILD-06 | Backend | `start:dev` na porta configurada 4003 | FALHOU | [backend-start.stderr.log](validation-artifacts/backend-start.stderr.log), `EADDRINUSE` | porta já estava ocupada; inicialização foi repetida em 4013 |
| BUILD-07 | Frontend | `npm run typecheck` | PASSOU | saída do comando | tipos OK |
| BUILD-08 | Frontend | `npm run lint` | PASSOU com avisos | warnings `react-hooks/exhaustive-deps` em 9 páginas | dívida de qualidade; não foi silenciosamente aprovado |
| BUILD-09 | Frontend | `npm run build` | FALHOU | `ENOENT` em `.next/export/500.html` | release bloqueada até reproduzir/corrigir o build |
| AUTH-01 | Auth | Super Admin login | PASSOU | [auth-multitenancy-results.json](validation-artifacts/auth-multitenancy-results.json), HTTP 201 |
| AUTH-02 | Multitenancy | Super Admin acessa `/api/tenants` | PASSOU | mesmo artefato, HTTP 200 | administração global protegida |
| AUTH-03 | Multitenancy | Admin acessa oportunidades do próprio tenant | PASSOU | HTTP 200 | acesso local confirmado |
| AUTH-04 | Authz | Representante acessa administração global | PASSOU | HTTP 403 | papel restrito |
| AUTH-05 | Multitenancy | Token do tenant A com `x-tenant-id` do B/sem vínculo ativo | PASSOU | HTTP 403 | isolamento confirmado neste cenário |
| AUTH-06 | Multitenancy | Admin em A troca para representante em B | PASSOU | [auth-switch-fixture-results.json](validation-artifacts/auth-switch-fixture-results.json), papel observado `representante` |
| AUTH-07 | Authz | Usuário trocado para B tenta administração global | PASSOU | HTTP 403 | privilégio de A não foi reaproveitado |
| AUTH-08 | Segurança | `GET /api/users` sem password/hash/segredos Asaas | PASSOU | campo ausente no JSON sanitizado | exposição não observada neste endpoint |
| AUTH-09 | DTO | Atualização de cliente com `tenantId`, `status`, IDs Asaas, `holderId` e relacionamento | PASSOU | HTTP 400 para cada campo | whitelist global efetiva |
| AUTH-10 | Multitenancy | Alteração de vínculo de B usando tenant A | PASSOU | HTTP 404 | filtro `id + tenant_id` efetivo |
| WH-01..04 | Webhook | tenant inexistente, token ausente, token inválido, payload inválido | PASSOU | [webhook-validation-results.json](validation-artifacts/webhook-validation-results.json), 401/401/401/400 | autenticação/validação efetivas |
| WH-05/10 | Webhook | evento não suportado | PASSOU | HTTP 200, estado `processed` | comportamento documentado |
| WH-06 | Webhook | mesmo `event.id` reenviado | PASSOU | uma linha, `processed` | idempotência sequencial confirmada |
| WH-06-CONCURRENT | Webhook | dois webhooks iguais simultâneos | PASSOU | HTTP 200/200, uma linha | barreira do índice de evento funcionou |
| WH-07/08 | Webhook | falha de `PAYMENT_CONFIRMED` e reenvio | PASSOU | HTTP 500/500, uma linha `failed` | retry é identificável |
| WH-09 | Webhook | `PAYMENT_RECEIVED` sem repetir conversão | PASSOU | HTTP 200, `processed` | handler separado confirmado |
| CHK-01 | Checkout | tenant sem Asaas configurado | PASSOU | HTTP 400; vendas 4 antes/depois | falha antes de criar venda |
| CHK-02 | Checkout | `CREDIT_CARD` direto | PASSOU | HTTP 400 sem mensagem sensível | cartão rejeitado explicitamente |
| CHK-03/CONCURRENT | Checkout | repetição e concorrência sem configuração | PASSOU | HTTP 400; nenhuma venda nova | apenas preflight foi exercitado |
| CHK-04 | Asaas | boleto real, `customer`, `externalReference`, cliente por CPF/CNPJ | BLOQUEADO | [checkout-validation-results.json](validation-artifacts/checkout-validation-results.json) | sem chave Sandbox por tenant |
| CONV-01 | Conversão | consistência local das 4 vendas confirmadas | PASSOU com ressalva | [conversion-consistency-results.json](validation-artifacts/conversion-consistency-results.json) | 4 oportunidades convertidas, 4 titulares, 2 dependentes, 4 assinaturas |
| CONV-02 | Conversão | taxa de adesão fora do recorrente | FALHOU | 1 de 4 assinaturas tem delta de R$ 99,90 | divergência financeira existente |
| CONV-03 | Assinatura | ciclo mensal e datas 29/30/31 | PASSOU em função local | 2025-01-29/30/31 → 2025-02-28 | cálculo de fim de mês correto |
| CONV-04 | Assinatura | `nextDueDate` persistido | BLOQUEADO | schema não possui coluna `next_due_date` | reconciliação futura fica incompleta |
| CONV-05 | Conversão E2E | titular/dependentes/assinatura via webhook real | BLOQUEADO | sem credencial Sandbox | não foi considerado aprovado |
| FIN-01 | Cancelamento | cancelamento com Asaas indisponível | PASSOU | [financial-cancellation-results.json](validation-artifacts/financial-cancellation-results.json), `cancelamento_pendente` local |
| FIN-02 | Cancelamento | reativação sincronizada com Asaas | FALHOU | HTTP 201 e estado local `ativa/ativo` sem chamada Asaas | risco de divergência externa |
| FIN-03 | Financeiro | quitação consolidada | PASSOU | HTTP 400 explícito | função permanece bloqueada |
| FIN-04 | Financeiro | consulta financeira sem configuração | PASSOU | HTTP 400 seguro antes do gateway | não houve fallback |
| FIN-05 | Financeiro | ledger de pagamentos/suspensão | BLOQUEADO | não existe tabela `payments` nem rota de suspensão | requisito ainda não implementado |
| DB-01 | Idempotência | contagem de duplicidades atuais | PASSOU | 0 grupos duplicados nos dados atuais | não prova concorrência futura |
| DB-02 | Idempotência | constraints exigidas pelo roteiro | FALHOU | [constraint-validation-results.json](validation-artifacts/constraint-validation-results.json) | ausência é bloqueador de concorrência |
| SEC-01 | Dependências | `npm audit` backend | FALHOU | 30 vulnerabilidades: 10 altas, 16 moderadas, 4 baixas | atualizar sem `--force` e revisar impacto |
| SEC-02 | Dependências | `npm audit` frontend | FALHOU | 6 vulnerabilidades: 4 altas, 2 moderadas | Next/glob/postcss requerem atualização planejada |
| SEC-03 | Código | busca por segredos hard-coded | FALHOU | literal de credencial Sandbox em `populate-sandbox.ts`; valor omitido | remover/rotacionar antes de compartilhar ou publicar |

## 4. Erros encontrados

### E-01 — Build de produção do frontend falha

- Severidade: P1.
- Reprodução: `cd frontend; npm run build`.
- Resultado atual: compilação, lint e geração de páginas avançam, mas o Next falha com `ENOENT` ao renomear `.next/export/500.html` para `.next/server/pages/500.html`.
- Esperado: build com exit code 0.
- Evidência: saída do comando; não foi copiada qualquer informação sensível.
- Correção sugerida: reproduzir em diretório limpo/Windows, revisar configuração de export/Next e limpar o artefato `.next` apenas como procedimento local; validar novamente sem alterar código durante esta validação.

### E-02 — Idempotência de negócio sem constraints

- Severidade: P0/P1.
- Arquivos/módulos: migrations de entidades `tenant_users`, `sales`, `clients`, `subscriptions`; webhook/sale services.
- Reprodução: `node validation-artifacts/constraint-validation.js`.
- Resultado atual: faltam unicidades para vínculo tenant/usuário, venda/oportunidade, cliente/oportunidade e assinatura/venda; `payments` nem sequer existe.
- Esperado: concorrência não criar duplicatas mesmo com duas transações simultâneas.
- Correção sugerida: criar migrations explícitas após limpar/consolidar dados existentes; adicionar constraints/FKs e testes concorrentes.

### E-03 — Reativação local sem sincronização Asaas

- Severidade: P1.
- Arquivo: `backend/src/modules/clients/client.controller.ts`, rota `POST /api/clients/:id/reactivate-plan`.
- Reprodução: `node validation-artifacts/financial-cancellation.js`.
- Resultado atual: após cancelamento pendente por ausência de configuração, a reativação retorna 201 e grava `ativo/ativa` sem obter contexto Asaas nem chamar o gateway.
- Esperado: sincronizar o estado remoto ou permanecer pendente com erro explícito.
- Correção sugerida: definir operação de reativação no Asaas, estados intermediários e retry auditável.

### E-04 — Taxa de adesão presente no recorrente de dado local

- Severidade: P1.
- Módulo: conversão/assinaturas; dado sandbox populado.
- Reprodução: `node validation-artifacts/conversion-consistency.js`.
- Resultado atual: 3 de 4 recorrências batem com `base + dependentes - desconto`; 1 tem delta de R$ 99,90, igual à taxa de adesão.
- Esperado: taxa de adesão somente no valor inicial.
- Correção sugerida: localizar a origem do dado seed/importado, corrigir a assinatura afetada por migration/fixture controlada e criar teste de regressão.

### E-05 — Testes e lint backend indisponíveis

- Severidade: P2, mas bloqueia o critério de qualidade.
- Reprodução: `cd backend; npm test -- --runInBand` e `npm run lint`.
- Resultado atual: zero testes encontrados; ESLint não está instalado/referenciado no pacote backend.
- Correção sugerida: adicionar specs mínimos e declarar/configurar ESLint; executar `npm run lint && npm run typecheck` no CI.

### E-06 — Credencial Sandbox hard-coded

- Severidade: P1.
- Arquivo: `backend/database/seeds/populate-sandbox.ts`.
- Reprodução: busca sanitizada por padrões de API Key em `backend/src` e `backend/database`; o relatório não copia o valor.
- Correção sugerida: remover o literal, carregar somente de variável/secret store local e rotacionar a credencial Sandbox.

## 5. Banco e consistência

- `synchronize=false` foi confirmado.
- `migration:run` não encontrou pendências; as sete migrations aparecem aplicadas.
- `tenant_users.team_id` é `character varying NULL`, conforme hotfix e migration.
- Duplicidades atuais: zero nos agrupamentos verificados de tenant users, sales, clients, subscriptions e webhook events.
- Unicidade observada: PKs, tenant slug, user email, documento por tenant, assinatura por tenant/cliente e `webhook_events.asaas_event_id`.
- Unicidade ausente: `tenant_users(tenant_id,user_id)`, `sales(tenant_id,opportunity_id)`, `clients(tenant_id,opportunity_id)`, `subscriptions(tenant_id,sale_id)` e `payments(tenant_id,asaas_payment_id)`.
- Não foram identificadas FKs nas tabelas principais; os relacionamentos dependem de `varchar` e filtros de serviço.

Consultas/evidências: [schema-inventory.sql](validation-artifacts/schema-inventory.sql), [db-audit.json](validation-artifacts/db-audit.json), [constraint-validation-results.json](validation-artifacts/constraint-validation-results.json) e [conversion-consistency-results.json](validation-artifacts/conversion-consistency-results.json).

## 6. Asaas Sandbox e webhooks

- Os testes usaram somente tenants locais e um token sintético temporário gravado/restaurado no tenant Sandbox; eventos sintéticos foram removidos ao final.
- Não foi usada produção e não foi feita chamada externa ao Asaas.
- Webhook recebeu o endpoint vigente `POST /api/webhooks/asaas/:tenantId`.
- Tokens ausente/inválido foram rejeitados com 401; payload inválido com 400.
- Eventos processados foram marcados `processed`; falhas foram marcadas `failed`; retry não criou segunda linha.
- O token sintético não apareceu em resposta nem na varredura dos artefatos/logs.
- O fluxo externo boleto → cliente → cobrança → webhook → conversão → assinatura ficou BLOQUEADO por ausência de credencial Sandbox configurada por tenant. O comportamento de payload `customer`, `billingType=BOLETO` e `externalReference` foi revisado no código, mas não foi marcado como aprovação E2E.

## 7. Builds, testes e auditoria

- Backend: build e typecheck passaram; startup em porta livre passou sem `DataTypeNotSupportedError`; testes não existem; lint falha por ferramenta ausente.
- Frontend: typecheck e lint passaram, com avisos; build falhou no `ENOENT` descrito acima.
- Auditoria backend: 30 vulnerabilidades (10 altas, 16 moderadas, 4 baixas). Auditoria frontend: 6 (4 altas, 2 moderadas). `npm audit fix --force` não foi executado, pois o próprio relatório indica upgrades breaking (Nest 11/Next 16 e outros).
- Varredura estática encontrou usos de `Object.assign` em services de oportunidade/plano/time; não houve `catch {}` vazio detectado pela busca usada. A revisão completa de rotas e dados sensíveis deve continuar em CI.

## 8. Recomendação de atualização do MVP_CHECKLIST.md

Não editei o checklist. Recomendações baseadas em evidência:

- `DB-000`: pode mudar de `[ ]` para `[x]`, pois o hotfix foi confirmado no código, no PostgreSQL e no startup em porta livre.
- Seção manual de hotfix TypeORM: pode ser marcada como executada, referenciando [db-audit.json](validation-artifacts/db-audit.json) e [backend-start-4013.stdout.log](validation-artifacts/backend-start-4013.stdout.log).
- `SEC-006` e `SEC-007`: atualizar evidência com os cenários AUTH-01..AUTH-10, mas manter `[~]` até existir suíte automatizada para todas as rotas.
- `WH-001`..`WH-006`: atualizar evidência manual para `[x]` somente onde o checklist aceitar validação manual; manter a ressalva de que não houve conversão E2E real.
- `ASAAS-007`, `SALE-001`, `CONV-002` e `SUB-004`: manter `[~]`; a ausência de constraints foi comprovada.
- `SUB-001`: rebaixar de `[x]` para `[~]` ou `[!]` até corrigir a assinatura local que inclui taxa de adesão.
- `SUB-002`: rebaixar de `[x]` para `[~]`; o cálculo foi exercitado, mas `nextDueDate` não é persistido e o E2E está bloqueado.
- `SUB-005`, `DB-001`, `QA-001`, `QA-002`, `QA-003`, `OPS-002` e critérios de aceite de build/E2E: permanecer pendentes/bloqueadores.
- `FIN-002`: rebaixar para `[~]` até existir ledger local e validação com credencial Sandbox por tenant.

## 9. Próximas ações

1. Rotacionar/remover a credencial hard-coded e definir armazenamento seguro por tenant.
2. Criar migrations de constraints/FKs e resolver duplicidades antes de aplicá-las; adicionar testes de corrida.
3. Corrigir recorrência/admissão, persistir `nextDueDate` e criar o ledger `payments`.
4. Corrigir cancelamento/reativação para manter banco e Asaas consistentes, com estados pendentes e retry.
5. Disponibilizar credenciais Sandbox separadas por tenant ou um mock HTTP controlado; executar o E2E completo e provar payloads/IDs externos mascarados.
6. Corrigir o build do frontend e configurar lint/testes backend.
7. Atualizar dependências vulneráveis em grupos compatíveis, sem `npm audit fix --force` automático; repetir build, lint, typecheck e auditoria.
8. Implementar processamento durável/assíncrono de webhooks, reprocessamento administrativo e observabilidade de tentativas.

## 10. Arquivos de evidência

Os artefatos sanitizados estão em [validation-artifacts/](validation-artifacts/). Incluem comandos/scripts, SQL, logs de inicialização, inventário do banco e resultados JSON. Não há `node_modules`, dumps, dados pessoais completos, tokens completos ou chaves no conjunto de evidências.
