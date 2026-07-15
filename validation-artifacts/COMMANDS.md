# Comandos executados (sanitizados)

Todos os comandos abaixo foram executados no workspace local em 15/07/2026. Credenciais foram fornecidas somente por variáveis de ambiente do processo e não são registradas aqui.

## Inventário e banco

```text
git status --short
git diff --stat
node --version
npm --version
docker --version
docker compose version
docker ps -a
npm run migration:run                         # backend: sem migrations pendentes
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d src/database/datasource.ts
node validation-artifacts/run-db-audit.js
node validation-artifacts/constraint-validation.js
```

## Qualidade

```text
cd backend; npm install --no-audit --no-fund
cd backend; npm run build
cd backend; npm run typecheck
cd backend; npm test -- --runInBand
cd backend; npm run lint
cd frontend; npm install --no-audit --no-fund
cd frontend; npm run build
cd frontend; npm run typecheck
cd frontend; npm run lint
cd backend; npm audit
cd frontend; npm audit
```

## HTTP e fixtures locais

```text
powershell -File validation-artifacts/auth-multitenancy.ps1
node validation-artifacts/auth-switch-fixture.js
node validation-artifacts/webhook-validation.js
node validation-artifacts/checkout-validation.js
node validation-artifacts/conversion-consistency.js
node validation-artifacts/financial-cancellation.js
```

As fixtures criadas no banco foram sintéticas, limitadas ao PostgreSQL local e restauradas/removidas ao final de cada script. O token usado no webhook foi sintético e temporário.
