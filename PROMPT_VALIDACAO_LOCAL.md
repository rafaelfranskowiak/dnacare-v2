# Prompt de validação local — DNA Care MVP

Você tem acesso ao projeto DNA Care local, ao PostgreSQL em Docker e ao ambiente de execução do backend e frontend.

## Objetivo

Validar tecnicamente tudo que foi alterado nas Fases 1, 2 e no hotfix 2.1, sem usar dados ou credenciais de produção. Gere um relatório reproduzível com evidências, falhas, impacto, prioridade e recomendações.

O projeto é um SaaS multitenant em NestJS, TypeORM, PostgreSQL, Next.js e integração com Asaas. O fluxo principal é:

`oportunidade → checkout/boleto → pagamento → webhook → venda confirmada → cliente/dependentes → assinatura`

## Regras de segurança

1. Use somente PostgreSQL local e, quando necessário, credenciais do Sandbox Asaas.
2. Não use conta, token, API Key, webhook ou cliente de produção.
3. Não mostre segredos completos no relatório ou nos logs copiados.
4. Não apague nem recrie o banco sem registrar o motivo e obter autorização do operador.
5. Não altere código-fonte durante a validação. Caso encontre uma correção necessária, descreva o patch proposto separadamente.
6. Pode criar apenas arquivos de relatório, logs sanitizados, fixtures e testes temporários claramente identificados.
7. Não marque um teste como aprovado sem evidência executada no ambiente local.

## Estado esperado antes dos testes

Confirme que este hotfix está aplicado:

```ts
// backend/src/modules/tenant/tenant-user.entity.ts
@Column({ name: 'team_id', type: 'varchar', nullable: true })
teamId: string | null;
```

A migration existente criou `tenant_users.team_id` como `character varying`, portanto não altere para `uuid` sem antes criar e validar uma migration de conversão.

## Etapa 1 — Inventário e ambiente

Registre no relatório:

- branch, commit e arquivos modificados;
- versões de Node.js, npm, Docker e PostgreSQL;
- containers em execução;
- variáveis necessárias presentes, sem revelar valores secretos;
- configuração TypeORM usada;
- valor de `synchronize`;
- lista e status das migrations;
- schema atual das tabelas principais.

Execute comandos equivalentes a:

```bash
git status --short
git diff --stat
node --version
npm --version
docker compose ps
```

No banco, registre tipos, nulabilidade, índices e constraints de:

```text
tenant_users
tenants
users
teams
opportunities
sales
clients
subscriptions
webhook_events
document_registry
```

## Etapa 2 — Inicialização e qualidade básica

Backend:

```bash
cd backend
npm install
npm run build
npm test -- --runInBand
npm run start:dev
```

Confirme especificamente:

- ausência de `DataTypeNotSupportedError`;
- conexão real com PostgreSQL;
- carregamento de todas as entidades;
- migrations sem divergência inesperada;
- inicialização completa do NestJS;
- nenhuma API Key ou token aparecendo nos logs.

Frontend:

```bash
cd frontend
npm install
npm run build
npm run lint
```

Registre erros e avisos separadamente. Não trate aviso como sucesso silencioso.

## Etapa 3 — Matriz de autenticação e multitenancy

Prepare, sem usar dados reais:

- um Super Admin;
- tenant A e tenant B;
- um administrador em A;
- o mesmo usuário como representante em B;
- um representante somente em A;
- um usuário sem vínculo ativo.

Teste e registre status HTTP, endpoint, usuário e resultado:

1. Super Admin acessa administração global.
2. Administrador acessa somente recursos da própria unidade.
3. Representante recebe `403` em ações administrativas.
4. Usuário do tenant A tenta usar `x-tenant-id` do tenant B sem vínculo.
5. Usuário administrador em A e representante em B troca de tenant e não mantém o papel de administrador.
6. Usuário sem vínculo ativo é rejeitado.
7. `GET /api/users` não retorna `password`, hash, `asaasApiKey` ou `asaasWebhookAuthToken`.
8. Alterações de vínculo, time, gestor e membro não atravessam tenants.
9. Atualização genérica de cliente rejeita campos sensíveis como `tenantId`, `status`, `asaasCustomerId`, `holderId` e relacionamentos.

Inclua requisições reproduzíveis com `curl`, script ou coleção, sempre mascarando tokens.

## Etapa 4 — Webhook

Valide o endpoint vigente:

```text
POST /api/webhooks/asaas/:tenantId
```

Cenários obrigatórios:

1. tenant inexistente;
2. token ausente;
3. token inválido;
4. token válido e payload inválido;
5. token válido e evento suportado;
6. mesmo `event.id` enviado duas vezes;
7. evento que falha no processamento e depois é reenviado;
8. `PAYMENT_CONFIRMED`;
9. `PAYMENT_RECEIVED`;
10. evento não suportado.

Confirme no banco os estados:

```text
received
processing
processed
failed
```

Verifique se o mesmo evento não cria duas vendas, clientes, dependentes ou assinaturas. Confirme que o token do webhook nunca aparece em log ou resposta.

## Etapa 5 — Checkout e Asaas Sandbox

Quando houver credencial Sandbox válida:

1. tenant sem configuração Asaas deve falhar antes de criar venda;
2. tenant A deve usar somente a chave e o ambiente de A;
3. boleto deve ser criado com `billingType: BOLETO`;
4. payload externo deve usar `customer`, não `customerId`;
5. `externalReference` deve permitir correlação;
6. repetir o checkout da mesma oportunidade não deve criar outro cliente, venda ou cobrança;
7. `CREDIT_CARD` enviado diretamente deve retornar erro explícito;
8. cartão não deve aparecer na interface;
9. nenhuma chamada deve fazer fallback para chave global;
10. cliente existente por CPF/CNPJ deve ser reutilizado conforme a regra implementada.

Caso não haja credencial Sandbox, valide com mock/spy HTTP e marque o E2E externo como bloqueado, não como aprovado.

## Etapa 6 — Conversão e assinatura

Crie uma oportunidade de teste com titular e dependentes e valide:

1. `PAYMENT_CONFIRMED` confirma a venda;
2. cria exatamente um titular;
3. cria exatamente os dependentes esperados;
4. cria ou associa exatamente uma assinatura;
5. reenvio do evento não duplica dados;
6. taxa de adesão não entra no valor recorrente;
7. desconto e dependentes são calculados corretamente;
8. ciclo vem da versão do plano;
9. `nextDueDate` cai no ciclo seguinte;
10. datas 29, 30 e 31 são tratadas no último dia válido;
11. `PAYMENT_RECEIVED` atualiza financeiro sem repetir conversão;
12. falha parcial fica identificável e pode ser retomada.

Execute consultas SQL de consistência para provar contagens e relacionamentos.

## Etapa 7 — Cancelamento e financeiro

Valide:

- cancelamento de oportunidade procura a venda por `opportunityId`;
- cobrança pendente não permanece ativa silenciosamente;
- suspensão, reativação e cancelamento não divergem entre banco e Asaas;
- consulta financeira usa a conta do tenant correto;
- totais recebidos, pendentes e vencidos são calculados com dados reais;
- quitação consolidada permanece bloqueada;
- nenhuma operação financeira cria cobrança duplicada.

Quando alguma função ainda não estiver implementada, marque como pendência e não simule aprovação.

## Etapa 8 — Banco, concorrência e idempotência

Verifique se existem constraints ou índices para impedir duplicidade de:

```text
tenant_users (tenant_id, user_id)
sales (tenant_id, opportunity_id)
clients (tenant_id, source_opportunity_id)
subscriptions (tenant_id, source_sale_id)
payments (tenant_id, asaas_payment_id)
webhook_events (asaas_event_id)
```

Faça testes concorrentes quando seguro, por exemplo duas requisições simultâneas de checkout e dois webhooks iguais. Classifique como bloqueador qualquer duplicidade que só seja evitada por uma consulta prévia sem constraint no banco.

## Etapa 9 — Segurança e dependências

Execute auditoria sem aplicar correções automáticas destrutivas:

```bash
npm audit
```

Registre:

- vulnerabilidades por severidade;
- dependência direta ou transitiva;
- impacto provável;
- atualização compatível sugerida;
- risco de `npm audit fix --force`.

Procure também:

- `body: any`;
- `Object.assign` em entidades;
- rotas sem guard;
- retorno de entidades com segredo;
- uso de tenant vindo de body/query para usuário comum;
- `catch` vazio;
- logs com token, API Key ou dados sensíveis.

## Relatório obrigatório

Crie na raiz:

```text
VALIDATION_REPORT.md
```

Use este formato:

```markdown
# Relatório de validação — DNA Care MVP

## 1. Resumo executivo
- Resultado geral: APROVADO / APROVADO COM RESSALVAS / REPROVADO
- Bloqueadores para produção:
- Itens aprovados:
- Itens não testados:
- Ambiente e data:

## 2. Evidências do ambiente
| Item | Valor sanitizado | Evidência |

## 3. Resultado por teste
| ID | Área | Cenário | Resultado | Evidência | Impacto |
|---|---|---|---|---|---|

Resultados permitidos:
- PASSOU
- FALHOU
- BLOQUEADO
- NÃO EXECUTADO

## 4. Erros encontrados
Para cada erro:
- título;
- severidade P0/P1/P2/P3;
- arquivo ou módulo;
- passos para reproduzir;
- resultado atual;
- resultado esperado;
- evidência;
- causa provável;
- correção sugerida;
- risco de regressão.

## 5. Banco e consistência
- migrations;
- schema;
- constraints;
- duplicidades;
- consultas SQL usadas.

## 6. Asaas Sandbox e webhooks
- cenários executados;
- IDs externos mascarados;
- idempotência;
- divergências.

## 7. Builds, testes e auditoria
- backend;
- frontend;
- testes;
- npm audit.

## 8. Recomendação de atualização do MVP_CHECKLIST.md
Liste cada item que pode mudar de `[ ]` ou `[~]` para `[x]`, sempre com evidência.
Não edite o checklist sem informar claramente.

## 9. Próximas ações
Ordene por prioridade e dependência.
```

Além do relatório, anexe ou mantenha em arquivo separado:

```text
validation-artifacts/
```

Somente com logs sanitizados, comandos, SQL e fixtures usados. Não inclua `node_modules`, dumps com dados pessoais ou segredos.

Ao terminar, responda com:

1. caminho do `VALIDATION_REPORT.md`;
2. resumo dos bloqueadores;
3. lista dos arquivos criados;
4. confirmação de que nenhum segredo foi incluído.
