# Evidências sanitizadas — Fase 3.1

Os JSONs desta pasta contêm apenas contagens, status HTTP, códigos SQL, nomes de índices/colunas e hashes parciais de chaves compostas. Não contêm `DATABASE_URL`, chaves Asaas, JWTs, senhas, dumps, PII ou IDs de usuários preservados.

- `backup-metadata.txt`: metadados do backup local criado antes do reparo.
- `preflight-before.json`: estado antes do reparo.
- `preflight-final.json`: estado após o reparo e após o rollback da migração.
- `seed-security-results.json`: bloqueios do seed e cenários não executados por falta de chave Sandbox válida.
- `migration-results.json`: execução e reprodução do erro da migração.
- `constraint-tests.json`: tentativas em transação revertida.
- `regression-results.json`: regressões HTTP locais.
- `suspension-results.json`: cenário de suspensão sem configuração Asaas, bloqueado pela migração pendente.

O dump permanece fora do repositório, no caminho descrito em `backup-metadata.txt`.
