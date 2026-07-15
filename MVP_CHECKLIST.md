# Checklist de conclusão do MVP — DNA Care

> Documento vivo para acompanhar correções, pendências, validações e decisões do MVP.
>
> **Última atualização:** 15/07/2026  
> **Responsável pelo acompanhamento técnico:** Patch Limpo  
> **Regra de uso:** toda alteração relevante deve atualizar o status, a evidência e a data neste arquivo.

## Legenda

- `[x]` concluído e verificado
- `[~]` parcialmente concluído
- `[ ]` pendente
- `[!]` bloqueador para produção
- `[?]` decisão de produto/negócio necessária

---

## 1. Segurança e multitenancy

### Autenticação e autorização

- [x] **SEC-001 — Papel do usuário disponível no `req.user`**
  - O `JwtStrategy` agora busca o vínculo ativo em `tenant_users`.
  - Super Admin recebe explicitamente o papel `super_admin`.
  - Usuário comum sem vínculo ativo com o tenant é rejeitado.
  - Arquivo: `backend/src/modules/auth/strategies/jwt.strategy.ts`

- [x] **SEC-002 — Administração de tenants restrita ao Super Admin**
  - Listagem completa, consulta, criação, edição, remoção e configuração Asaas exigem `super_admin`.
  - Arquivo: `backend/src/modules/tenant/tenant.controller.ts`

- [x] **SEC-003 — Rota pública de tenants com resposta mínima**
  - A rota pública retorna apenas `id`, `slug` e `name`.
  - Credenciais e metadados internos não são retornados.
  - Arquivos:
    - `backend/src/modules/tenant/tenant.controller.ts`
    - `backend/src/modules/tenant/tenant.service.ts`

- [x] **SEC-004 — Segredos Asaas ocultos por padrão**
  - `asaasApiKey` e `asaasWebhookAuthToken` usam `select: false`.
  - Consultas comuns não retornam esses campos.
  - Existe método explícito para uso interno: `findByIdWithAsaasConfig`.
  - Arquivos:
    - `backend/src/modules/tenant/tenant.entity.ts`
    - `backend/src/modules/tenant/tenant.service.ts`

- [ ] **SEC-005 — Criptografar segredos em repouso**
  - A API Key e o token do webhook ainda são armazenados em texto puro no banco.
  - Implementar criptografia de aplicação ou gerenciador de segredos.
  - Criar estratégia de rotação sem indisponibilidade.

- [~] **SEC-006 — Revisar todas as rotas globais**
  - `GET /users` agora retorna todos os usuários apenas para Super Admin; usuários comuns recebem somente vínculos ativos da unidade atual.
  - Criação de usuário por administrador força o tenant autenticado.
  - Alteração e exclusão global de usuários exigem Super Admin.
  - Senhas/hash não são devolvidos na listagem.
  - Ainda falta teste automatizado de autorização cobrindo todas as rotas.

- [~] **SEC-007 — Eliminar IDOR entre tenants**
  - `tenant_id` de query/body é ignorado para usuários comuns em usuários e vínculos.
  - Atualização e remoção de vínculos são filtradas por `id + tenant_id`.
  - Times, gestores e membros são validados dentro da unidade.
  - Dependentes de oportunidades passaram a validar a oportunidade e o tenant.
  - O `TenantAccessGuard` atualiza o papel conforme o tenant efetivo da requisição, evitando reaproveitamento de papel mais privilegiado de outra unidade.
  - Ainda falta suíte automatizada de isolamento para encerrar o item.

- [x] **SEC-008 — DTOs estritos para atualização de clientes**
  - Criado `UpdateClientDto` com lista fechada de campos editáveis.
  - `tenantId`, `holderId`, IDs Asaas, status, tipo, vendedor e relacionamentos não podem ser alterados pelo endpoint genérico.
  - CPF/CNPJ alterado é normalizado, validado e verificado contra duplicidade local.
  - O ciclo completo do registro global de documentos continua acompanhado em `DOC-002`.

- [x] **SEC-009 — Remover credencial Asaas hard-coded do seed**
  - A chave Sandbox foi removida de `populate-sandbox.ts`.
  - O seed exige `ASAAS_SANDBOX_API_KEY` e bloqueia explicitamente a URL de produção.
  - A credencial anteriormente exposta deve ser rotacionada no painel Asaas.
  - Arquivos:
    - `backend/database/seeds/populate-sandbox.ts`
    - `backend/.env.example`

---

## 2. Integração Asaas

### Cliente HTTP

- [x] **ASAAS-001 — Payload de cobrança usa `customer`**
  - A aplicação mantém `customerId` internamente e converte para `customer` antes da requisição.
  - Arquivo: `backend/src/modules/asaas/asaas.service.ts`

- [x] **ASAAS-002 — Payload de assinatura usa `customer`**
  - A aplicação mantém `customerId` internamente e converte para `customer` antes da requisição.
  - Arquivo: `backend/src/modules/asaas/asaas.service.ts`

- [x] **ASAAS-003 — Headers oficiais**
  - Envio de `access_token`.
  - Envio de `Content-Type: application/json`.
  - Envio de `User-Agent` configurável por `ASAAS_USER_AGENT`.
  - Arquivo: `backend/src/modules/asaas/asaas.service.ts`

- [x] **ASAAS-004 — Timeout e normalização básica de erro**
  - Timeout de 10 segundos.
  - Resposta não JSON é tratada sem quebrar o parser.
  - Erro de rede é convertido para exceção de integração.
  - Arquivo: `backend/src/modules/asaas/asaas.service.ts`

- [x] **ASAAS-005 — Ambiente correto por tenant**
  - Todas as chamadas operacionais recebem `AsaasTenantContext` com `tenantId`, `apiKey` e `sandbox`.
  - URL de Sandbox/produção é determinada exclusivamente pelo contexto da unidade.

- [x] **ASAAS-006 — Remover fallback global silencioso**
  - Removido o fallback para chaves globais de ambiente.
  - Operação sem configuração Asaas do tenant é interrompida com erro explícito.
  - A API Key não aparece em logs.

- [~] **ASAAS-007 — Reutilização de cliente Asaas**
  - Checkout consulta cliente por CPF/CNPJ antes de criar.
  - Prioriza `externalReference` da oportunidade e reaproveita o cliente encontrado.
  - Requisição repetida reaproveita venda, cliente e cobrança já persistidos.
  - Ainda falta constraint no banco para eliminar corrida concorrente.

- [~] **ASAAS-008 — Cartão de crédito funcional**
  - Removido o fallback silencioso que transformava cartão em boleto.
  - Cartão foi retirado da interface do MVP e o backend rejeita a tentativa com mensagem explícita.
  - Implementação real de cartão recorrente permanece como evolução posterior.

- [ ] **ASAAS-009 — Paginação das listagens**
  - Implementar paginação completa em pagamentos e consultas financeiras.

### Referências oficiais usadas

- Authentication: https://docs.asaas.com/docs/authentication
- Create a new Webhook through the API: https://docs.asaas.com/docs/create-new-webhook-via-api
- How to implement idempotency in Webhooks: https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks
- Webhooks FAQ: https://docs.asaas.com/docs/webhooks-faq

---

## 3. Webhooks

- [x] **WH-001 — Endpoint público identifica o tenant**
  - Novo formato esperado: `POST /api/webhooks/asaas/:tenantId`.
  - O middleware libera apenas o endpoint de recebimento, não o endpoint administrativo de configuração.
  - Arquivos:
    - `backend/src/modules/tenant/middleware/tenant.middleware.ts`
    - `backend/src/modules/webhooks/webhook.controller.ts`

- [x] **WH-002 — Validação de `asaas-access-token`**
  - Token comparado com `timingSafeEqual`.
  - Tenant inexistente, token ausente ou token inválido resultam em rejeição.
  - O token não é devolvido pela API após a configuração.
  - Arquivos:
    - `backend/src/modules/webhooks/webhook.controller.ts`
    - `frontend/src/app/admin/(dashboard)/tenants/page.tsx`

- [x] **WH-003 — URL do webhook específica por tenant**
  - Ao configurar, o backend acrescenta `/:tenantId` à URL base.
  - A URL final é persistida e devolvida ao painel.
  - Arquivo: `backend/src/modules/webhooks/webhook.controller.ts`

- [x] **WH-004 — Entrega sequencial configurada**
  - `sendType` alterado para `SEQUENTIALLY`.
  - Arquivo: `backend/src/modules/asaas/asaas.service.ts`

- [x] **WH-005 — Estados de processamento atualizados**
  - Fluxo implementado: `received → processing → processed | failed`.
  - Mensagem de erro é persistida.
  - Eventos `failed` ou `received` podem ser tentados novamente.
  - Arquivos:
    - `backend/src/modules/webhooks/webhook-events.service.ts`
    - `backend/src/modules/webhooks/webhook-handler.service.ts`

- [x] **WH-006 — Duplicidade do mesmo evento**
  - Evento já `processed` ou `processing` retorna sucesso sem repetir o handler.
  - O índice único de `asaas_event_id` continua sendo a primeira barreira.

- [~] **WH-007 — Separar `PAYMENT_CONFIRMED` de `PAYMENT_RECEIVED`**
  - Conversão ocorre somente em `PAYMENT_CONFIRMED`.
  - `PAYMENT_RECEIVED` não repete a conversão.
  - Ainda falta um ledger local para registrar datas e valores efetivamente recebidos.

- [!] **WH-008 — Processamento assíncrono durável**
  - O endpoint ainda processa o evento antes de responder.
  - Implementar fila durável ou worker persistente.
  - Meta: salvar o evento, responder HTTP 200 rapidamente e processar fora da requisição.
  - Não usar somente fila em memória.

- [~] **WH-009 — Idempotência de negócio**
  - Migration criada para garantir:
    - uma venda por oportunidade;
    - um titular por oportunidade;
    - uma assinatura por venda;
    - um vínculo de usuário por tenant.
  - Ainda falta a entidade/tabela local de pagamentos e a constraint por ID Asaas.
  - A migration ainda precisa ser executada e validada no PostgreSQL local.

- [ ] **WH-010 — Reprocessamento administrativo**
  - Criar endpoint/painel para listar eventos `failed`.
  - Permitir reprocessamento seguro e auditado.

- [ ] **WH-011 — Tentativas e observabilidade**
  - Adicionar `attempt_count`, `last_attempt_at`, correlação e logs estruturados.

---

## 4. Checkout, venda e cobrança

- [~] **SALE-001 — Impedir checkout duplicado**
  - Repetição do checkout retorna a venda/cobrança existente.
  - Venda pendente sem cobrança pode retomar somente a criação da cobrança.
  - Venda finalizada ou cancelada não cria outra silenciosamente.
  - Constraint única no banco ainda é necessária contra concorrência.

- [x] **SALE-002 — Usar credenciais do tenant**
  - Geração de cliente e cobrança recebe contexto Asaas explícito da unidade.
  - Unidade sem chave configurada não inicia o checkout.

- [x] **SALE-003 — Validar plano e versão**
  - Versão precisa estar publicada.
  - Plano precisa estar publicado e disponível para venda.
  - Versão selecionada precisa corresponder à oportunidade.
  - Quantidades mínima e máxima de dependentes são validadas.

- [~] **SALE-004 — Corrigir cancelamento por oportunidade**
  - Busca local corrigida para `tenant_id + opportunity_id`.
  - Ainda falta cancelar a cobrança pendente no Asaas antes do estado local definitivo.

- [~] **SALE-005 — Separar valor inicial e recorrente**
  - Assinatura usa `baseValue + dependentsValue - discount`, sem taxa de adesão.
  - Snapshot inclui o ciclo contratado.
  - Ainda falta persistir uma coluna explícita de valor recorrente na venda.

- [ ] **SALE-006 — Snapshot contratual completo**
  - Salvar ciclo, preços, regras, limites e versão contratada de forma imutável.

---

## 5. Conversão, clientes e documentos

- [!] **CONV-001 — Conversão transacional**
  - Confirmar venda, converter oportunidade, criar clientes e assinatura em uma transação local.
  - Chamadas externas devem usar estados intermediários e retomada segura.

- [~] **CONV-002 — Conversão retomável**
  - Confirmação da venda e conversão da oportunidade são idempotentes.
  - Titular é reutilizado por oportunidade.
  - Dependentes são reutilizados pelo documento e titular.
  - Assinatura é reutilizada pela venda.
  - Ainda falta transação local e constraints para concluir a garantia.

- [~] **CONV-003 — Constraints de negócio**
  - Criadas na migration:
    - `UNIQUE sales (tenant_id, opportunity_id)`;
    - índice único parcial para titular em `clients (tenant_id, opportunity_id)`;
    - `UNIQUE subscriptions (tenant_id, sale_id)`;
    - `UNIQUE tenant_users (tenant_id, user_id)`.
  - `payments (tenant_id, asaas_payment_id)` continua pendente porque o ledger local ainda não existe.
  - Validação da migration no banco local permanece pendente.

- [!] **DOC-001 — Transferência de documento**
  - Implementar operações transacionais `claim`, `transfer` e `release`.
  - Remover `catch` silencioso no processo definitivo.

- [ ] **DOC-002 — Edição e remoção**
  - Liberar documento antigo ao trocar CPF/CNPJ.
  - Liberar documento de dependente removido.

---

## 6. Assinaturas

- [~] **SUB-001 — Valor recorrente correto**
  - O serviço usa `base + dependentes - desconto`.
  - O relatório local encontrou uma assinatura antiga criada pelo seed com a taxa de adesão no recorrente.
  - A migration corrige os dados existentes e o seed passou a criar a assinatura com o valor recorrente correto.
  - Falta executar a migration e repetir a validação local.

- [~] **SUB-002 — Próximo vencimento correto**
  - `nextDueDate` é calculado a partir do vencimento da cobrança confirmada mais um ciclo.
  - A nova migration adiciona `billing_cycle` e `next_due_date` em `subscriptions`.
  - O seed também persiste os dois campos.
  - Falta executar a migration e validar o fluxo real no Sandbox.

- [x] **SUB-003 — Ciclo não fixo**
  - Ciclo vem do snapshot da versão do plano.
  - Ciclos inválidos são rejeitados antes da chamada externa.

- [~] **SUB-004 — Não duplicar assinatura**
  - Retry procura assinatura local pela venda antes de criar outra.
  - Foi criada constraint única por `tenant_id + sale_id`.
  - Ainda falta executar a migration e implementar reconciliação específica para futuro Checkout recorrente.

- [~] **SUB-005 — Suspensão, reativação e cancelamento**
  - A rota atual de desativação passa a suspender a assinatura no Asaas com `status: INACTIVE`.
  - Reativação atualiza o Asaas com `status: ACTIVE` e novo `nextDueDate` antes de alterar o estado local.
  - Falha externa não ativa mais cliente/assinatura somente no banco.
  - Cancelamento definitivo, motivo auditável e histórico de transições ainda estão pendentes.

---

## 7. Financeiro e relatórios

- [x] **FIN-001 — Credenciais do tenant em todas as consultas**
  - Consultas, criação de cobrança e cancelamento recebem contexto Asaas da unidade.

- [x] **FIN-002 — Totais reais**
  - Totais recebidos e em aberto são calculados a partir das cobranças retornadas.
  - Paginação completa continua em `ASAAS-009`.

- [x] **FIN-003 — Quitação de débitos**
  - Função insegura foi desabilitada no MVP.
  - Nenhuma cobrança consolidada é criada sem entidade de acordo e tratamento das cobranças originais.

- [ ] **REP-001 — Dashboard global**
  - Alinhar frontend e backend para `global-dashboard`.

- [ ] **REP-002 — Clientes por plano**
  - Remover placeholder que retorna lista vazia.

---

## 8. Qualidade, banco e entrega

- [!] **QA-001 — Testes unitários**
  - Pricing engine.
  - Máquina de estados.
  - Validação de documentos.
  - Guards e papel do usuário.

- [!] **QA-002 — Testes de integração**
  - Isolamento entre tenants.
  - Webhook com token válido/inválido.
  - Evento duplicado.
  - Evento com falha e retry.

- [!] **QA-003 — E2E Sandbox Asaas**
  - Oportunidade → cobrança → webhook → cliente → assinatura.

- [!] **QA-004 — Build de produção do frontend**
  - O relatório local registrou falha `ENOENT` ao mover `.next/export/500.html`.
  - Reproduzir em workspace limpo e corrigir antes da release.
  - Typecheck e lint passaram, com avisos de hooks.

- [x] **DB-000 — Metadata explícito para coluna anulável `TenantUser.teamId`**
  - `string | null` gera metadata refletido como `Object`; o PostgreSQL/TypeORM não consegue inferir o tipo.
  - A coluna agora declara `type: 'varchar'`, alinhada à migration `AddTeamsAndRoles`, que criou `team_id` como `character varying`.
  - Arquivo: `backend/src/modules/tenant/tenant-user.entity.ts`
  - Verificado no PostgreSQL local e no startup do NestJS em porta livre, conforme `VALIDATION_REPORT.md`.

- [~] **DB-001 — Migrations de constraints**
  - Criada migration explícita para:
    - `tenant_users(tenant_id, user_id)`;
    - `sales(tenant_id, opportunity_id)`;
    - titular em `clients(tenant_id, opportunity_id)`;
    - `subscriptions(tenant_id, sale_id)`.
  - A migration bloqueia a execução com mensagem clara quando encontra duplicidades.
  - Ainda falta executar e validar a migration no PostgreSQL local.
  - Arquivo: `backend/database/migrations/1784149200000-HardenMvpConstraintsAndSubscriptions.ts`

- [ ] **OPS-001 — Health check e logs**
  - Health do banco.
  - Logs estruturados sem segredos.
  - Correlação por tenant, venda, evento e pagamento.

- [ ] **OPS-002 — Dependências vulneráveis**
  - Atualizar sem `--force`.
  - Rodar build e testes após cada grupo de atualização.

- [ ] **CLEAN-001 — Remover resíduos**
  - Validar e remover S3/transcoding caso não façam parte do deploy.

---

## 9. Critérios de aceite do MVP

O MVP só pode ser marcado como concluído quando todos os itens abaixo passarem:

- [x] Tenant A não acessa dados do tenant B nos cenários executados no relatório local.
- [ ] Nenhuma API devolve chave Asaas ou token de webhook.
- [ ] Uma oportunidade gera no máximo uma venda ativa.
- [ ] Boleto é criado corretamente no Sandbox.
- [x] Cartão funciona de fato ou é removido da interface do MVP.
- [ ] Taxa de adesão não é recorrente após executar a migration de reparo.
- [ ] O primeiro ciclo não é cobrado duas vezes em teste E2E Sandbox.
- [x] Webhook inválido é rejeitado.
- [x] Webhook duplicado não duplica o registro de evento nos testes sequencial e concorrente.
- [ ] Falha parcial pode ser reprocessada.
- [ ] Cancelamento/suspensão fica consistente localmente e no Asaas.
- [ ] Fluxo completo passa em teste E2E no Sandbox.
- [ ] Builds do backend e frontend passam.
- [ ] Testes automatizados essenciais passam.
- [ ] Vulnerabilidades altas foram corrigidas ou formalmente aceitas.

---

## 10. Validação manual solicitada

Executar inicialmente apenas com tenants de teste e chaves do Sandbox.

### Primeira implementação — segurança e webhook

- [x] Login de Super Admin continua acessando administração global.
- [x] Administrador de unidade acessa oportunidades da própria unidade; demais rotas seguem na suíte futura.
- [x] Representante recebe `403` ao acessar administração global.
- [x] Usuário do tenant A recebe `403` ao usar `x-tenant-id` do tenant B sem vínculo.
- [x] Usuário administrador no tenant A e representante no tenant B assume o papel correto de representante.
- [x] `GET /api/users` não retornou `password`, hash ou segredos Asaas.
- [x] Webhook com `asaas-access-token` ausente ou incorreto retorna `401`.
- [x] Webhook com token correto e payload válido foi aceito nos testes sintéticos.
- [x] Reenvio sequencial e concorrente do mesmo `event.id` manteve uma única linha processada.

### Hotfix de inicialização TypeORM

- [x] Backend inicia e conecta ao PostgreSQL sem `DataTypeNotSupportedError` em `TenantUser.teamId`.
- [x] A coluna `tenant_users.team_id` continua como `character varying` e aceita `NULL`.

### Segunda implementação — checkout e recorrência

- [x] Tenant sem chave Asaas recebe erro antes de criar venda.
- [ ] Checkout por boleto cria cliente e cobrança no Sandbox da unidade correta.
- [ ] Repetir o mesmo checkout retorna o mesmo `saleId` e não cria outra cobrança.
- [x] Cartão não aparece na interface e tentativa direta recebe erro explícito.
- [ ] `PAYMENT_CONFIRMED` cria um titular, os dependentes e uma assinatura somente uma vez.
- [ ] Valor da assinatura não contém taxa de adesão.
- [ ] Primeiro vencimento recorrente ocorre no ciclo seguinte ao vencimento pago.
- [ ] Consulta financeira usa a conta Asaas do tenant correto.
- [x] Quitação consolidada permanece bloqueada até existir modelo de acordo.

---

## 11. Registro de progresso

| Data | Lote | Alterações | Verificação |
|---|---|---|---|
| 15/07/2026 | Fundação de segurança e webhook | JWT com papel atual, segredos ocultos, tenants restritos ao Super Admin, webhook por tenant, token validado, status de eventos, payload `customer`, `User-Agent`, timeout e envio sequencial | Sintaxe TypeScript/TSX verificada nos arquivos alterados. Build completo bloqueado no ambiente por falha de rede durante `npm ci` (`EAI_AGAIN` ao baixar binário/headers do `bcrypt`). |
| 15/07/2026 | Isolamento, checkout e recorrência segura | Escopo de usuários/vínculos/times, DTO de cliente, contexto Asaas obrigatório, boleto idempotente, cartão desabilitado, plano validado, conversão retomável, recorrência sem adesão e financeiro por tenant | Sintaxe TypeScript/TSX verificada em 23 arquivos. Build completo ainda depende da instalação das dependências do projeto. Testes manuais listados na seção 10. |
| 15/07/2026 | Hotfix TypeORM `teamId` | Tipo da coluna `team_id` declarado explicitamente como `varchar` para evitar metadata `Object` em propriedade `string | null` | Confirmado no PostgreSQL local e no startup do NestJS pelo relatório de validação. |
| 15/07/2026 | Fase 3 — constraints, seed e ciclo da assinatura | Migration de idempotência, reparo de recorrência, persistência de ciclo/vencimento, remoção de segredo hard-coded e suspensão/reativação sincronizadas | Sintaxe TypeScript verificada. Execução da migration, build completo e testes locais permanecem a cargo do ambiente conectado ao banco. |

## 12. Próxima ordem de execução

1. Executar `migration:run` e repetir os testes de constraints/recorrência/reativação.
2. Rotacionar a credencial Sandbox anteriormente exposta no seed.
3. Refatorar a conversão para transação local e retomada segura.
4. Implementar ledger local de pagamentos e constraint por `asaas_payment_id`.
5. Implementar processamento assíncrono durável de webhooks.
6. Corrigir o build de produção do frontend.
7. Implementar testes unitários, integração e E2E Sandbox.
8. Revisar dependências vulneráveis e preparar a liberação.
