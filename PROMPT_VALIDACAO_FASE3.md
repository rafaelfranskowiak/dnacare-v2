# Validação local — Fase 3 do MVP DNA Care

Execute esta validação somente no ambiente local e com credenciais do **Sandbox Asaas**.

## Regras

- Não use produção.
- Não imprima nem salve chaves completas em logs ou relatórios.
- Antes de começar, faça backup do banco local.
- Não use `synchronize: true`.
- Não altere o código durante a validação.
- Gere `VALIDATION_PHASE3_REPORT.md` na raiz do projeto.

## 1. Segurança da credencial do seed

1. Confirme que `backend/database/seeds/populate-sandbox.ts` não contém chave Asaas literal.
2. Confirme que o seed exige `ASAAS_SANDBOX_API_KEY`.
3. Execute o seed sem a variável e confirme falha explícita antes de uma chamada externa.
4. Confirme que `ASAAS_SANDBOX_BASE_URL=https://api.asaas.com` é rejeitada.
5. Não execute o seed completo contra uma conta que contenha dados relevantes.

## 2. Build e metadata

Execute:

```bash
cd backend
npm run typecheck
npm run build
```

Inicie o backend em uma porta livre e confirme:

- conexão ao PostgreSQL;
- ausência de `DataTypeNotSupportedError`;
- ausência de erro de metadata para `Subscription.nextDueDate`.

## 3. Pré-migration

Antes de executar a migration, registre apenas contagens:

```sql
SELECT tenant_id, user_id, COUNT(*)
FROM tenant_users
GROUP BY tenant_id, user_id
HAVING COUNT(*) > 1;

SELECT tenant_id, opportunity_id, COUNT(*)
FROM sales
GROUP BY tenant_id, opportunity_id
HAVING COUNT(*) > 1;

SELECT tenant_id, opportunity_id, COUNT(*)
FROM clients
WHERE type = 'holder'
GROUP BY tenant_id, opportunity_id
HAVING COUNT(*) > 1;

SELECT tenant_id, sale_id, COUNT(*)
FROM subscriptions
GROUP BY tenant_id, sale_id
HAVING COUNT(*) > 1;
```

Todas devem retornar zero linhas. Caso exista duplicidade, não apague automaticamente: marque a migration como bloqueada e detalhe os IDs sanitizados.

## 4. Executar migration

```bash
cd backend
npm run migration:show
npm run migration:run
npm run migration:show
```

Confirme a criação de:

- `UQ_tenant_users_tenant_user`;
- `UQ_sales_tenant_opportunity`;
- `UQ_clients_holder_tenant_opportunity`;
- `UQ_subscriptions_tenant_sale`;
- `subscriptions.billing_cycle`;
- `subscriptions.next_due_date`.

Confirme que a migration aparece como aplicada.

## 5. Reparação do valor recorrente

Execute uma consulta que compare, por assinatura:

```text
recurring_value
versus
base_value + dependents_value - discount
```

Resultado esperado: nenhuma divergência.

Confirme especificamente que taxa de adesão não aparece em `subscriptions.recurring_value`.

## 6. Testes de constraints

Dentro de uma transação com rollback, tente inserir duplicidades para cada índice novo.

Resultado esperado:

- PostgreSQL rejeita vínculo duplicado em `tenant_users`;
- PostgreSQL rejeita segunda venda da mesma oportunidade;
- PostgreSQL rejeita segundo titular da mesma oportunidade;
- PostgreSQL rejeita segunda assinatura da mesma venda;
- dependentes da mesma oportunidade continuam permitidos, desde que o documento seja diferente.

Não deixe dados de teste persistidos.

## 7. Suspensão e reativação

Use um tenant Sandbox com chave válida e uma assinatura de teste real.

### Suspensão

Chame:

```text
POST /api/clients/:id/cancel-plan
```

Resultado esperado:

- requisição `PUT /v3/subscriptions/:id` com `status=INACTIVE`;
- assinatura local `inativa`;
- titular local `inativo`;
- dependentes `vinculado_a_titular_inativo`;
- nenhuma chamada `DELETE /subscriptions/:id`.

### Reativação

Chame:

```text
POST /api/clients/:id/reactivate-plan
```

Resultado esperado:

- requisição `PUT /v3/subscriptions/:id`;
- `status=ACTIVE`;
- `nextDueDate` obrigatório, futuro e persistido localmente;
- somente após sucesso remoto, assinatura e clientes ficam ativos.

### Falha externa

Repita com chave ausente ou inválida.

Resultado esperado:

- reativação retorna erro;
- cliente e assinatura não são marcados como ativos apenas no banco;
- suspensão fica em estado pendente quando a sincronização falha.

## 8. Regressão

Repita os cenários do relatório anterior:

- login e troca de tenant;
- webhook inválido;
- webhook duplicado sequencial e concorrente;
- checkout sem configuração Asaas;
- cartão rejeitado;
- quitação consolidada bloqueada.

## 9. Relatório

Crie `VALIDATION_PHASE3_REPORT.md` contendo:

- resumo executivo;
- PASSOU, FALHOU ou BLOQUEADO por cenário;
- migrations aplicadas;
- evidências sanitizadas;
- divergências encontradas;
- bloqueadores para produção remanescentes;
- recomendações de atualização do `MVP_CHECKLIST.md`.

Não inclua CPF/CNPJ completo, senha, token, API Key ou payload pessoal completo.
