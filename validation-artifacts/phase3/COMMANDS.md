# Comandos Fase 3 (sanitizados)

```text
docker exec <postgres-local> pg_dump -U <local-user> -d dnacarev2 -Fc -f /tmp/dnacarev2-phase3-backup-20260715.dump
node validation-artifacts/phase3/db-preflight.js
cd backend; npm run typecheck
cd backend; npm run build
cd backend; npm run migration:show                 # falha: script não definido
cd backend; npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d src/database/datasource.ts
cd backend; npm run migration:run                  # rollback por duplicidade tenant_users
node validation-artifacts/phase3/duplicates-after-seed.js
node validation-artifacts/phase3/regression.js
node validation-artifacts/phase3/suspension-failure.js
```

Portas de validação: 4014, 4015 e 4016, todas livres e encerradas após o teste. Nenhum comando usou produção ou uma URL Asaas de produção.
