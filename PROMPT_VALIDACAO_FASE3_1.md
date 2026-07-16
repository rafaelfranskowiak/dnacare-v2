# Validação local — DNA Care MVP Fase 3.1

## Objetivo

Validar as correções feitas após `VALIDATION_PHASE3_REPORT.md`, com foco em:

1. impedir que o seed altere o banco sem chave Sandbox válida;
2. impedir uso de URL Asaas de produção;
3. impedir reexecução acidental do seed em banco populado;
4. auditar e reparar somente duplicidades semanticamente idênticas em `tenant_users`;
5. aplicar a migration de constraints e colunas de assinatura;
6. confirmar que a taxa de adesão não permanece no valor recorrente;
7. repetir regressões essenciais.

Não use produção. Não exponha API Key, tokens, senhas, CPF/CNPJ ou dumps no relatório.

## Regras

- Trabalhe no projeto local já atualizado com a Fase 3.1.
- Antes de qualquer alteração no banco, gere backup local verificável.
- Não edite código-fonte durante a validação.
- Não remova registros conflitantes automaticamente.
- O script de reparo só pode ser aplicado se todos os registros de cada grupo duplicado tiverem os mesmos valores de `role_id`, `team_id`, `role` e `status`.
- Caso haja conflito semântico, pare e marque como bloqueado.
- Use exclusivamente `https://api-sandbox.asaas.com`.
- Credenciais devem ficar somente em variáveis de ambiente locais.

## 1. Preparação

Na pasta `backend`:

```bash
npm run typecheck
npm run build
npm run migration:show
```

Registrar resultado e exit code.

Confirmar que o backend inicia e conecta ao PostgreSQL sem `DataTypeNotSupportedError`.

## 2. Backup

Criar backup antes do reparo e registrar:

- data/hora;
- banco;
- formato;
- tamanho;
- comando sanitizado;
- caminho fora do repositório.

Não incluir o dump nos artefatos.

## 3. Seed sem credencial

Antes do teste, registrar contagens das tabelas:

- `tenant_users`;
- `plan_versions`;
- `opportunity_dependents`;
- `opportunities`;
- `sales`;
- `clients`;
- `subscriptions`.

Remover temporariamente `ASAAS_SANDBOX_API_KEY` do ambiente e executar:

```bash
npm run seed:sandbox
```

Resultado obrigatório:

- exit code diferente de zero;
- mensagem informando que o seed foi interrompido antes de acessar ou alterar o banco;
- nenhuma contagem alterada;
- nenhum novo log de chamada externa.

## 4. Bloqueio de URL de produção

Com uma chave fictícia não sensível, definir temporariamente:

```env
ASAAS_SANDBOX_API_KEY=dummy_validation_only
ASAAS_SANDBOX_BASE_URL=https://api.asaas.com
```

Executar:

```bash
npm run seed:sandbox
```

Resultado obrigatório:

- exit code diferente de zero;
- falha antes da inicialização/mutação do banco;
- nenhuma contagem alterada;
- nenhuma chamada à URL de produção.

Remover a chave fictícia depois do teste.

## 5. Banco populado sem confirmação

Com uma chave Sandbox válida e URL oficial, garantir:

```env
ALLOW_POPULATED_SANDBOX_SEED=false
```

Executar o seed em banco já populado.

Resultado obrigatório:

- seed interrompido antes de mutações;
- mensagem exigindo backup e `ALLOW_POPULATED_SANDBOX_SEED=true`;
- contagens inalteradas.

Não executar o seed completo com `ALLOW_POPULATED_SANDBOX_SEED=true` sem credencial Sandbox real e autorização operacional.

## 6. Auditoria das duplicidades

Executar em modo somente leitura:

```bash
npm run repair:tenant-users
```

Resultado esperado para o banco descrito no relatório anterior:

- quatro grupos duplicados;
- cada grupo classificado como semanticamente idêntico;
- nenhuma linha alterada.

Validar com SQL:

```sql
SELECT tenant_id, user_id, COUNT(*)
FROM tenant_users
GROUP BY tenant_id, user_id
HAVING COUNT(*) > 1;
```

Se qualquer grupo tiver diferenças em papel, time ou status, não aplicar reparo e registrar como bloqueador.


Também auditar possíveis resíduos da execução antiga do seed:

```sql
SELECT plan_id, version, COUNT(*)
FROM plan_versions
GROUP BY plan_id, version
HAVING COUNT(*) > 1;

SELECT opportunity_id, document_normalized, COUNT(*)
FROM opportunity_dependents
GROUP BY opportunity_id, document_normalized
HAVING COUNT(*) > 1;
```

Esses grupos não são removidos automaticamente nesta fase. Caso existam, registrar IDs por hash parcial, referências em `opportunities`, `sales` e `subscriptions`, e classificar a necessidade de saneamento separado.

## 7. Aplicação conservadora do reparo

Somente após backup e aprovação do modo auditoria:

```bash
npm run repair:tenant-users -- --apply --confirm=DELETE_EXACT_DUPLICATES
```

Resultado obrigatório:

- somente linhas extras semanticamente idênticas removidas;
- um registro canônico preservado por `tenant_id + user_id`;
- zero grupos duplicados ao final;
- usuários, papéis e times mantidos.

Registrar contagens antes/depois e IDs apenas de forma sanitizada ou por hash parcial.

## 8. Migration

Executar:

```bash
npm run migration:show
npm run migration:run
npm run migration:show
```

Validar a existência de:

- `UQ_tenant_users_tenant_user`;
- `UQ_sales_tenant_opportunity`;
- `UQ_clients_holder_tenant_opportunity`;
- `UQ_subscriptions_tenant_sale`;
- `subscriptions.billing_cycle`;
- `subscriptions.next_due_date`.

A migration deve constar como aplicada.

## 9. Valor recorrente

Executar uma consulta equivalente a:

```sql
SELECT COUNT(*) AS divergencias
FROM subscriptions subscription
JOIN sales sale
  ON sale.id = subscription.sale_id
 AND sale.tenant_id = subscription.tenant_id
WHERE subscription.recurring_value IS DISTINCT FROM GREATEST(
  0,
  sale.base_value + sale.dependents_value - sale.discount
);
```

Resultado obrigatório: zero divergências.

Confirmar que a taxa de adesão permanece apenas no valor inicial da venda.

## 10. Constraints em transação com rollback

Testar, sem deixar dados artificiais:

- segundo `tenant_users` para o mesmo tenant/usuário;
- segunda venda para a mesma oportunidade;
- segundo titular para a mesma oportunidade;
- segunda assinatura para a mesma venda;
- dois dependentes distintos ligados à mesma oportunidade.

Os quatro primeiros devem falhar por unicidade. O último deve continuar permitido.

Executar tudo dentro de transações revertidas.

## 11. Idempotência do seed

Somente se houver chave Sandbox válida e autorização para reexecução:

1. registrar contagens;
2. definir `ALLOW_POPULATED_SANDBOX_SEED=true`;
3. executar o seed uma vez;
4. executar novamente;
5. comparar contagens e IDs.

Não podem surgir novos grupos duplicados em:

- `tenant_users`;
- versões `version = 1` dos planos do seed;
- dependentes de oportunidade por documento;
- vendas por oportunidade;
- titulares por oportunidade;
- assinaturas por venda.

Se não houver chave Sandbox, marcar este cenário como bloqueado, não simular aprovação.

## 12. Suspensão e reativação

Após a migration, repetir os testes da Fase 3:

- sem configuração Asaas: falha controlada, sem alteração local;
- com Sandbox válido: `PUT /v3/subscriptions/:id`;
- suspensão com `status: INACTIVE`;
- reativação com `status: ACTIVE`;
- `nextDueDate` futuro persistido;
- falha externa não pode ativar ou suspender somente localmente.

Sem chave válida, marcar o E2E externo como bloqueado.

## 13. Regressão mínima

Repetir:

- login administrador e representante;
- representante recebe `403` na administração global;
- tenant A não usa tenant B sem vínculo;
- webhook sem token retorna `401`;
- webhook duplicado permanece uma única linha;
- `CREDIT_CARD` recebe `400`;
- checkout sem configuração Asaas não cria venda;
- quitação consolidada permanece bloqueada.

## 14. Relatório

Gerar na raiz:

```text
VALIDATION_PHASE3_1_REPORT.md
```

E evidências sanitizadas em:

```text
validation-artifacts/phase3-1/
```

O relatório deve conter:

- resumo executivo: aprovado, reprovado ou bloqueado;
- ambiente e commit;
- backup;
- comandos e exit codes;
- comparação das contagens antes/depois;
- resultado do preflight do seed;
- auditoria e reparo de duplicidades;
- migration e inventário dos índices/colunas;
- divergência do valor recorrente;
- testes das constraints;
- suspensão/reativação;
- regressões;
- bloqueadores restantes;
- recomendações de atualização do `MVP_CHECKLIST.md`.

Não marque um cenário como aprovado sem execução real.
