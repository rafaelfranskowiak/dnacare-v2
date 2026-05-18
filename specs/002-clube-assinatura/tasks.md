# Tasks: Clube de Assinatura Multitenant

**Input**: Design documents from `/specs/002-clube-assinatura/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Contract tests included per constitutional requirement (test-first discipline).

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New module scaffolding and configuration

- [ ] T001 Create backend module directories for all new modules per plan.md structure (backend/src/modules/plans/, opportunities/, sales/, clients/, subscriptions/, asaas/, webhooks/, reports/)
- [ ] T002 [P] Create Asaas configuration module in backend/src/config/asaas.config.ts — registerAs('asaas', {...}) with API key, sandbox flag, base URLs
- [ ] T003 [P] Create frontend page directories per plan.md (frontend/src/app/(dashboard)/oportunidades/, clientes/, vendas/, relatorios/, equipe/, config/; frontend/src/app/admin/planos/)
- [ ] T004 Create database interceptor directory and TenantQueryInterceptor in backend/src/database/interceptors/tenant-query.interceptor.ts — auto-filter GET queries by tenantId from request
- [ ] T005 [P] Create Roles decorator and RolesGuard in backend/src/common/decorators/roles.decorator.ts and backend/src/common/guards/roles.guard.ts — role-based authorization
- [ ] T006 [P] Verify package.json files in backend/package.json and frontend/package.json — no new dependencies needed (native fetch for HTTP, existing class-validator/class-transformer)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting infrastructure required by ALL user stories

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [ ] T007 Create PlanPricingEngine pure function in backend/src/modules/plans/pricing-engine.ts — input: PricingInput, output: PricingOutput with calculationMemory (per research.md Section 10)
- [ ] T008 [P] Create AsaasService in backend/src/modules/asaas/asaas.module.ts + asaas.service.ts — typed methods: createCustomer, findCustomerByCpfCnpj, createPayment, createCheckout, createSubscription, cancelSubscription, getPayments using native fetch (per research.md Section 7)
- [ ] T009 [P] Create DocumentRegistry entity in backend/src/modules/opportunities/document-registry.entity.ts — tenant_id, document_normalized, entity_type, entity_id with UNIQUE(tenant_id, document_normalized)
- [ ] T010 [P] Create WebhookEvent entity in backend/src/modules/webhooks/webhook-event.entity.ts — asaas_event_id UNIQUE, event_type, payload JSONB, status (received/processing/processed/failed)
- [ ] T011 [P] Create WebhookEventService in backend/src/modules/webhooks/webhook-events.service.ts — insertIfNotExists() with idempotency check via unique constraint
- [ ] T012 Extend Tenant entity in backend/src/modules/tenant/tenant.entity.ts — add columns: asaas_api_key (VARCHAR, encrypted), asaas_sandbox (BOOLEAN), asaas_webhook_url, asaas_webhook_id, asaas_webhook_auth_token
- [ ] T013 Generate and run initial migration for foundational entities: DocumentRegistry, WebhookEvent, Tenant Asaas columns — `npm run migration:generate -- database/migrations/AddFoundationalEntities` then `npm run migration:run`
- [ ] T014 [P] Create frontend Asaas API helper in frontend/src/lib/asaas-api.ts (if any frontend-side Asaas calls needed — likely none, all through backend)

**Checkpoint**: Foundation ready — cross-cutting infrastructure operational. User story implementation begins.

---

## Phase 3: User Story 1 — Gestão de Tenants e Usuários da Plataforma (Priority: P1) 🎯 MVP Foundation

**Goal**: Super Admin manages units; Admin manages team (users, teams, roles). Multi-tenant isolation enforced.

**Independent Test**: Create unit as Super Admin → create Admin/Manager/Rep users → verify role-based access and tenant isolation.

### Tests for User Story 1

> **Write tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Contract test for tenant CRUD in backend/tests/contract/tenants.contract.spec.ts — POST/GET/PATCH/DELETE /api/tenants
- [ ] T016 [P] [US1] Contract test for tenant user management in backend/tests/contract/tenant-users.contract.spec.ts — CRUD /api/tenant-users, role assignment
- [ ] T017 [P] [US1] Contract test for tenant isolation in backend/tests/contract/tenant-isolation.contract.spec.ts — user from unit A cannot access unit B data

### Implementation for User Story 1

- [ ] T018 [US1] Create Team entity in backend/src/modules/tenant/team.entity.ts — name, tenant_id FK, manager_id FK→users
- [ ] T019 [US1] Extend TenantUser entity with role field in backend/src/modules/tenant/tenant-user.entity.ts — role ENUM (admin/gerente/representante)
- [ ] T020 [US1] Create TeamService in backend/src/modules/tenant/team.service.ts — CRUD teams, assign manager/representatives
- [ ] T021 [US1] Extend TenantController in backend/src/modules/tenant/tenant.controller.ts — add PATCH /api/tenants/:id for Asaas config (Super Admin), GET /api/tenants/:id/config
- [ ] T022 [US1] Extend TenantUserController in backend/src/modules/tenant/tenant-user.controller.ts — add role management, list users by role
- [ ] T023 [US1] Create TeamController in backend/src/modules/tenant/team.controller.ts — CRUD /api/teams, assign users
- [ ] T024 [US1] Update TenantModule in backend/src/modules/tenant/tenant.module.ts — register Team entity, export TeamService
- [ ] T025 [US1] Generate and run migration for Team entity + TenantUser role column — `npm run migration:generate -- database/migrations/AddTeamsAndRoles` then `npm run migration:run`
- [ ] T026 [US1] Apply @Roles guards to tenant controllers in backend/src/modules/tenant/tenant.controller.ts and backend/src/modules/tenant/team.controller.ts — @Roles('super_admin') on POST /api/tenants, @Roles('admin') on team management
- [ ] T027 [US1] Create frontend team management page in frontend/src/app/(dashboard)/equipe/page.tsx — list teams, create/edit modal, assign members
- [ ] T028 [US1] Create frontend unit config page in frontend/src/app/(dashboard)/config/page.tsx — Asaas API key config (Admin only, masked display)

**Checkpoint**: Tenants + users + teams fully operational with role-based access. Unit config page ready.

---

## Phase 4: User Story 2 — Gestão Centralizada de Planos pelo Super Admin (Priority: P1)

**Goal**: Super Admin creates/configures/publishes/inactivates plans with versioning and dependent pricing rules. Units only view available plans.

**Independent Test**: Create plan as Super Admin → configure pricing → publish → verify units see it. Create new version → verify old clients unaffected.

### Tests for User Story 2

- [ ] T029 [P] [US2] Contract test for plan CRUD in backend/tests/contract/plans.contract.spec.ts — POST/GET/PATCH /api/plans
- [ ] T030 [P] [US2] Contract test for plan versioning in backend/tests/contract/plan-versions.contract.spec.ts — publish, new version, inactivate flow
- [ ] T031 [P] [US2] Contract test for available plans (unit view) in backend/tests/contract/plans-available.contract.spec.ts — GET /api/plans/available

### Implementation for User Story 2

- [ ] T032 [P] [US2] Create Plan entity in backend/src/modules/plans/plan.entity.ts — per data-model.md: name UNIQUE, type PF/PJ, status (rascunho/publicado/inativo/arquivado), available_for_sale
- [ ] T033 [P] [US2] Create PlanVersion entity in backend/src/modules/plans/plan-version.entity.ts — plan_id FK, version INT, base_value, billing_cycle, dependent_rule, included_dependents, max_dependents, dependent_value, tiers_config JSONB, admission_fee, status, published_at
- [ ] T034 [US2] Create CreatePlanDto and UpdatePlanDto in backend/src/modules/plans/dto/ — class-validator decorators
- [ ] T035 [US2] Create PublishPlanDto in backend/src/modules/plans/dto/ — base_value, billing_cycle, dependent_rule, pricing fields
- [ ] T036 [US2] Implement PlanService in backend/src/modules/plans/plan.service.ts — create (draft only), update (draft only), publish (creates/activates version), inactivate, createNewVersion (duplicates latest), getAvailable (published only)
- [ ] T037 [US2] Implement PlanVersionService in backend/src/modules/plans/plan-version.service.ts — createDraft, publish, inactivate, getCurrent, getByPlan
- [ ] T038 [US2] Create PlanController in backend/src/modules/plans/plan.controller.ts — per contracts/plans-api.md: CRUD, publish/:id, inactivate/:id, versions/:id, available, GET /:id/clients
- [ ] T039 [US2] Create PlanModule in backend/src/modules/plans/plan.module.ts — register both entities, provide PricingEngine, AsaasService
- [ ] T040 [US2] Register PlanModule in backend/src/app.module.ts
- [ ] T041 [US2] Generate and run migration for Plan + PlanVersion entities — `npm run migration:generate -- database/migrations/AddPlans` then `npm run migration:run`
- [ ] T042 [US2] Apply @Roles guards to plan controller in backend/src/modules/plans/plan.controller.ts — @Roles('super_admin') on mutation endpoints, @Roles('admin','gerente','representante') on GET /available
- [ ] T043 [US2] Create frontend Super Admin plan management pages in frontend/src/app/admin/planos/ — list page (page.tsx), create/edit modal, publish/inactivate actions, version history view

**Checkpoint**: Plan management fully operational. Units can see available plans for sale.

---

## Phase 5: User Story 3 — Ciclo de Venda: Oportunidade → Checkout → Pagamento → Cliente (Priority: P1) 🎯 Core MVP

**Goal**: Representative creates opportunity with name+CPF/CNPJ → validates uniqueness → complements data → selects plan + payment method → generates checkout → webhook confirms payment → opportunity converts to client (holder + dependents).

**Independent Test**: Create opportunity → fill data → select plan → generate checkout → simulate payment webhook → verify holder + dependents created with correct statuses.

### Tests for User Story 3

- [ ] T044 [P] [US3] Contract test for opportunity CRUD in backend/tests/contract/opportunities.contract.spec.ts — POST/GET/PATCH /api/opportunities, uniqueness validation
- [ ] T045 [P] [US3] Contract test for checkout generation in backend/tests/contract/checkout.contract.spec.ts — POST /api/opportunities/:id/generate-checkout, validate required fields
- [ ] T046 [P] [US3] Contract test for webhook processing in backend/tests/contract/webhooks.contract.spec.ts — POST /api/webhooks/asaas, idempotency, payment confirmation flow
- [ ] T047 [P] [US3] Integration test for full sales flow in backend/tests/integration/sales-flow.int.spec.ts — opportunity → checkout → webhook → client creation
- [ ] T047a [P] [US3] Contract test for no-delete enforcement in backend/tests/contract/no-delete.contract.spec.ts — verify DELETE /api/opportunities/:id returns 405, DELETE /api/clients/:id returns 405, DELETE /api/plans/:id returns 405; only status-based lifecycle transitions are permitted

### Implementation for User Story 3

**Entities & DTOs**

- [ ] T048 [P] [US3] Create Opportunity entity in backend/src/modules/opportunities/opportunity.entity.ts — per data-model.md: all columns including status, asaas_customer_id, document_normalized, UNIQUE(tenant_id, document_normalized)
- [ ] T049 [P] [US3] Create OpportunityDependent entity in backend/src/modules/opportunities/opportunity-dependent.entity.ts — opportunity_id FK, name, document, document_normalized
- [ ] T050 [P] [US3] Create Sale entity in backend/src/modules/sales/sale.entity.ts — per data-model.md: all columns including plan_snapshot JSONB, calculation_memory JSONB, asaas IDs, status
- [ ] T051 [P] [US3] Create Client entity in backend/src/modules/clients/client.entity.ts — per data-model.md: type holder/dependent, holder_id FK self-ref, UNIQUE(tenant_id, document_normalized)
- [ ] T052 [P] [US3] Create Subscription entity in backend/src/modules/subscriptions/subscription.entity.ts — per data-model.md: UNIQUE(tenant_id, client_id)
- [ ] T053 [US3] Create DTOs for Opportunity in backend/src/modules/opportunities/dto/ — CreateOpportunityDto (name, document), UpdateOpportunityDto (all optional fields), CancelOpportunityDto (reason min 20 chars)
- [ ] T054 [US3] Create DTOs for Sale in backend/src/modules/sales/dto/ — GenerateCheckoutDto (planVersionId, paymentMethod)
- [ ] T055 [US3] Create DTOs for Client in backend/src/modules/clients/dto/ — (minimal, clients are created by system not user input)
- [ ] T056 [US3] Create DTOs for Subscription — (minimal, created by system)
- [ ] T057 [US3] Generate and run migration for Opportunity + Dependent + Sale + Client + Subscription — `npm run migration:generate -- database/migrations/AddCoreEntities` then `npm run migration:run`

**Document Registry & CPF/CNPJ Uniqueness**

- [ ] T058 [US3] Implement DocumentRegistryService in backend/src/modules/opportunities/document-registry.service.ts — register(document, type, entityId) with transaction, checkExists(document), release(entityId) on cancel
- [ ] T059 [US3] Create CPF/CNPJ normalizer utility in backend/src/modules/opportunities/document-normalizer.ts — strip non-digits, validate check digits for CPF and CNPJ

**Opportunity Service**

- [ ] T060 [US3] Implement OpportunityService in backend/src/modules/opportunities/opportunity.service.ts — create (validate uniqueness via DocumentRegistryService, auto-link seller), update, cancel (require reason, cascade to sale, attempt Asaas customer deletion), findAll with filters
- [ ] T061 [US3] Implement OpportunityDependentService in backend/src/modules/opportunities/opportunity-dependent.service.ts — add/remove dependents, validate uniqueness per opportunity and per unit

**ViaCEP Integration**

- [ ] T062 [US3] Create ViaCepService in backend/src/modules/opportunities/viacep.service.ts — fetch address by CEP from https://viacep.com.br/ws/{cep}/json/, graceful fallback on error

**Sales & Checkout Generation**

- [ ] T063 [US3] Implement SaleService in backend/src/modules/sales/sale.service.ts — createSale (stores plan snapshot + calculation memory), confirmSale (called by webhook), cancelBeforePayment
- [ ] T064 [US3] Implement checkout generation in SaleService — generateCheckout(): validate required fields (FR-021 checklist), call AsaasService createCustomer + createPayment/Checkout, store asaas IDs, update opportunity to checkout_gerado

**Client Creation on Payment Confirmed**

- [ ] T065 [US3] Implement ClientService in backend/src/modules/clients/client.service.ts — createFromOpportunity (only after payment confirmed): create holder + dependents, reuse data from opportunity, insert into document_registry
- [ ] T066 [US3] Implement SubscriptionService in backend/src/modules/subscriptions/subscription.service.ts — createFromSale (after payment confirmed), updateStatus

**Webhook Receiver**

- [ ] T067 [US3] Create WebhookController in backend/src/modules/webhooks/webhook.controller.ts — POST /api/webhooks/asaas: validate asaas-access-token, check idempotency via WebhookEventService, route by event type, return 200 immediately
- [ ] T068 [US3] Implement webhook event handler in backend/src/modules/webhooks/webhook-handler.service.ts — per contracts/webhooks-api.md event→action mapping: PAYMENT_RECEIVED/CONFIRMED confirms sale+converts opportunity+creates clients, PAYMENT_OVERDUE marks delinquency, SUBSCRIPTION_INACTIVATED cascades status
- [ ] T069 [US3] Implement Asaas webhook configuration endpoint in backend/src/modules/webhooks/webhook.controller.ts — POST /api/webhooks/asaas/configure/:tenantId (Super Admin), calls AsaasService to create webhook config

**Controllers & Module Wiring**

- [ ] T070 [US3] Create OpportunityController in backend/src/modules/opportunities/opportunity.controller.ts — per contracts/opportunities-api.md: CRUD, dependents sub-resource, cancel, generate-checkout, validate-checkout
- [ ] T071 [US3] Create OpportunityModule in backend/src/modules/opportunities/opportunity.module.ts — register all entities, import DocumentRegistryService, ViaCepService
- [ ] T072 [US3] Create SaleController in backend/src/modules/sales/sale.controller.ts — per contracts/sales-api.md: list, detail, payment history
- [ ] T073 [US3] Create SaleModule in backend/src/modules/sales/sale.module.ts
- [ ] T074 [US3] Create ClientModule in backend/src/modules/clients/client.module.ts and SubscriptionModule in backend/src/modules/subscriptions/subscription.module.ts
- [ ] T075 [US3] Create WebhooksModule in backend/src/modules/webhooks/webhooks.module.ts
- [ ] T076 [US3] Register all new modules (OpportunityModule, SaleModule, ClientModule, SubscriptionModule, WebhooksModule) in backend/src/app.module.ts

**State Machine Validation**

- [ ] T077 [US3] Implement state machine validators in each module — allowed transitions maps per data-model.md, validate in service methods before status changes

**Roles & Auth**

- [ ] T078 [US3] Apply @Roles guards on all new controllers — @Roles('representante','gerente','admin') on opportunity creation, @Roles('representante') on checkout generation, public access on webhook endpoint

**Frontend — Opportunities**

- [ ] T079 [US3] Create frontend opportunity list page in frontend/src/app/(dashboard)/oportunidades/page.tsx — table with status/seller filters, search
- [ ] T080 [US3] Create frontend opportunity create form in frontend/src/app/(dashboard)/oportunidades/novo/page.tsx — name + CPF/CNPJ, validation, duplicate check feedback
- [ ] T081 [US3] Create frontend opportunity detail page in frontend/src/app/(dashboard)/oportunidades/[id]/page.tsx — edit form with all fields, CEP auto-fill via ViaCepService, dependent management (add/remove), plan selection, payment method selection, checkout generation button, cancel with reason modal

**Frontend — Sales**

- [ ] T082 [US3] Create frontend sales list page in frontend/src/app/(dashboard)/vendas/page.tsx — table with status filters
- [ ] T083 [US3] Create frontend sale detail page in frontend/src/app/(dashboard)/vendas/[id]/page.tsx — full sale data, plan snapshot, calculation memory, Asaas links

**Checkpoint**: Full sales cycle operational — opportunity → checkout → payment webhook → client creation. This is the core MVP.

---

## Phase 6: User Story 4 — Gestão de Clientes e Acompanhamento Financeiro (Priority: P2)

**Goal**: List clients (holders + dependents) with filters, view holder route with financial data from Asaas, cancel plans, settle debts.

**Independent Test**: After US3 creates clients → list/filter clients → access holder detail with dependents → view financial data → cancel plan → verify dependent status cascade.

### Tests for User Story 4

- [ ] T084 [P] [US4] Contract test for client list/detail in backend/tests/contract/clients.contract.spec.ts — GET /api/clients, GET /api/clients/:id
- [ ] T085 [P] [US4] Contract test for plan cancellation in backend/tests/contract/cancel-plan.contract.spec.ts — POST /api/clients/:id/cancel-plan, status cascade
- [ ] T086 [P] [US4] Contract test for debt settlement in backend/tests/contract/settle-debts.contract.spec.ts — POST /api/clients/:id/settle-debts

### Implementation for User Story 4

- [ ] T087 [US4] Extend ClientService in backend/src/modules/clients/client.service.ts — findAll with filters (type, status, seller, search), findById with holder/dependent differentiation, update (PATCH)
- [ ] T088 [US4] Create ClientController in backend/src/modules/clients/client.controller.ts — per contracts/clients-api.md: list, detail (holder vs dependent response shapes), update, cancel-plan, settle-debts
- [ ] T089 [US4] Implement cancel-plan logic in ClientService — validate allowed transition, set holder to inativo/cancelamento_pendente, cascade dependents to vinculado_a_titular_inativo, call AsaasService.cancelSubscription, handle Asaas failure with cancelamento_pendente
- [ ] T090 [US4] Implement settle-debts logic in ClientService — query Asaas for overdue payments, consolidate value, generate new Asaas payment for settlement
- [ ] T091 [US4] Implement financial data aggregation in ClientService — GET /api/clients/:id/financial: fetch payments from AsaasService.getPayments by customer+subscription IDs, compute totals (received, due, overdue)
- [ ] T092 [US4] Extend SubscriptionService in backend/src/modules/subscriptions/subscription.service.ts — findAll with filters, findById, getPaymentHistory (from Asaas)
- [ ] T093 [US4] Create SubscriptionController in backend/src/modules/subscriptions/subscription.controller.ts — per contracts/subscriptions-api.md: list, detail, payment history
- [ ] T094 [US4] Apply @Roles guards to client and subscription controllers in backend/src/modules/clients/client.controller.ts and backend/src/modules/subscriptions/subscription.controller.ts — @Roles('admin','gerente') on cancel-plan/settle-debts, @Roles('admin','gerente','representante') on list
- [ ] T095 [US4] Create frontend client list page in frontend/src/app/(dashboard)/clientes/page.tsx — table with type/status/seller filters, search by name/document
- [ ] T096 [US4] Create frontend holder detail page in frontend/src/app/(dashboard)/clientes/[id]/page.tsx — personal data, subscription info, dependent list (with links), financial data panel, cancel plan button + reason modal, settle debts button
- [ ] T097 [US4] Create frontend dependent detail page in frontend/src/app/(dashboard)/clientes/[id]/dependentes/[dependentId]/page.tsx — name, CPF, holder link, status, complementable data

**Checkpoint**: Client management fully operational. Cancel plan and debt settlement functional.

---

## Phase 7: User Story 5 — Relatórios e Indicadores Comerciais (Priority: P3)

**Goal**: Dashboards with operational indicators per unit and global (Super Admin). Metrics: conversion rate, delinquency, lives, seller performance, plan analytics.

**Independent Test**: Generate test data → access unit dashboard → verify all indicators match entity data. Access global dashboard as Super Admin → verify consolidation.

### Tests for User Story 5

- [ ] T098 [P] [US5] Contract test for unit dashboard in backend/tests/contract/reports-unit.contract.spec.ts — GET /api/reports/unit-dashboard
- [ ] T099 [P] [US5] Contract test for global dashboard in backend/tests/contract/reports-global.contract.spec.ts — GET /api/reports/global-dashboard (Super Admin)

### Implementation for User Story 5

- [ ] T100 [P] [US5] Create ReportsService in backend/src/modules/reports/reports.service.ts — unitDashboard (query opportunities/sales/clients/subscriptions within tenant, compute metrics), globalDashboard (aggregate across all tenants), sellerPerformance, planAnalytics
- [ ] T101 [US5] Create ReportsController in backend/src/modules/reports/reports.controller.ts — per contracts/reports-api.md: unit-dashboard, global-dashboard (Super Admin), seller-performance, plan-analytics
- [ ] T102 [US5] Create ReportsModule in backend/src/modules/reports/reports.module.ts
- [ ] T103 [US5] Register ReportsModule in backend/src/app.module.ts
- [ ] T104 [US5] Apply @Roles guards to reports controller in backend/src/modules/reports/reports.controller.ts — @Roles('admin','gerente') on unit dashboard, @Roles('super_admin') on global dashboard
- [ ] T105 [US5] Create frontend unit dashboard page in frontend/src/app/(dashboard)/relatorios/page.tsx — metric cards (conversion, delinquency, lives), charts for seller performance, plan distribution
- [ ] T106 [US5] Create frontend Super Admin global dashboard in frontend/src/app/admin/page.tsx — consolidated metrics, by-unit and by-plan breakdowns

**Checkpoint**: Dashboards operational with real-time indicators from local data.

---

## Phase 8: User Story 6 — Preparação para Autenticação Futura de Clientes (Priority: P3)

**Goal**: Data model preparation only — ClientAuthAccount entity exists and is linked to clients without mixing with admin users. Full auth implementation deferred.

**Independent Test**: Verify ClientAuthAccount table can be linked to any client (holder or dependent) without affecting admin user auth.

### Implementation for User Story 6

- [ ] T107 [P] [US6] Create ClientAuthAccount entity in backend/src/modules/clients/client-auth-account.entity.ts — per data-model.md: client_id FK, email, phone, document_normalized, password_hash, auth_provider, is_active, verification timestamps
- [ ] T108 [US6] Create ClientAuthAccountService in backend/src/modules/clients/client-auth-account.service.ts — basic CRUD: create (link to existing client), findByClientId, update, deactivate (NOT login/OTP — future scope)
- [ ] T109 [US6] Create ClientAuthAccountController in backend/src/modules/clients/client-auth-account.controller.ts — Admin-only CRUD for activating/deactivating client auth accounts (minimal, future-proof)
- [ ] T110 [US6] Generate and run migration for ClientAuthAccount — `npm run migration:generate -- database/migrations/AddClientAuthAccount` then `npm run migration:run`
- [ ] T111 [US6] Ensure zero overlap between ClientAuthAccount auth and User (admin) auth — separate tables, separate JWT strategies, separate login endpoints

**Checkpoint**: Client auth data model ready. No auth endpoints implemented (deferred to future app phase).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T112 [P] Add error handling standardization — consistent error response format across all controllers (HttpException filter or interceptor)
- [ ] T113 [P] Add audit logging for all state transitions — log opportunity/sale/client/subscription status changes with userId and timestamp
- [ ] T114 [P] Add input sanitization for search/filter endpoints — prevent SQL injection, XSS
- [ ] T115 Run `npm run lint` and `npm run typecheck` in both backend/ and frontend/ — fix all issues
- [ ] T116 Run full quickstart.md validation — follow quickstart end-to-end, verify all steps work
- [ ] T117 [P] Add loading states and error boundaries to all frontend pages
- [ ] T118 [P] Add responsive adjustments for all list/detail pages (sidebar collapse, mobile tables)
- [ ] T119 Performance check — verify opportunity list <1s, client list <2s, dashboard <3s with 10k+ records
- [ ] T120 [P] Run concurrent load test in backend/tests/performance/concurrent-units.perf.ts — seed 50 units with 100 clients each, measure p95 response time for GET /api/opportunities, GET /api/clients, GET /api/sales; verify all below 2s p95 and detail endpoints below 500ms p95

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — No other story dependencies
- **US2 (Phase 4)**: Depends on Foundational + US1 (needs Super Admin auth for plan management)
- **US3 (Phase 5)**: Depends on Foundational + US2 (needs plans for checkout) + US1 (needs auth/roles)
- **US4 (Phase 6)**: Depends on US3 (needs clients created from sales flow)
- **US5 (Phase 7)**: Depends on US3 + US4 (needs client/sales data for reports)
- **US6 (Phase 8)**: Depends on US3 (needs client entities to link auth accounts)
- **Polish (Phase 9)**: Depends on all desired user stories complete

### User Story Dependencies

```
Phase 1 (Setup) ──> Phase 2 (Foundational) ──> US1 ──> US2 ──> US3 ──> US4 ──> US5
                                                                         └──> US6
```

- US4 and US6 can be done in parallel after US3
- US5 requires US4 data

### Within Each User Story

1. Tests (if included) MUST be written and FAIL before implementation
2. Entities → DTOs → Migration (run before service code)
3. Services → Controllers → Module wiring → Roles/guards
4. Backend complete → Frontend pages
5. Story complete before moving to next priority

### Parallel Opportunities

- **Phase 2**: T008, T009, T010, T011 all touch different files — can run in parallel
- **US1 tests**: T015, T016, T017 — parallel
- **US2 tests**: T029, T030, T031 — parallel  
- **US3 entities**: T048, T049, T050, T051, T052 — parallel (different entity files)
- **US3 tests**: T044, T045, T046, T047 — parallel
- **US4 tests**: T084, T085, T086 — parallel
- **US5 tests**: T098, T099 — parallel
- **Polish**: T112, T113, T114, T117, T118 — parallel

---

## Parallel Example: User Story 3

```bash
# Launch all entity files together:
Task: "Create Opportunity entity in backend/src/modules/opportunities/opportunity.entity.ts"
Task: "Create OpportunityDependent entity in backend/src/modules/opportunities/opportunity-dependent.entity.ts"
Task: "Create Sale entity in backend/src/modules/sales/sale.entity.ts"
Task: "Create Client entity in backend/src/modules/clients/client.entity.ts"
Task: "Create Subscription entity in backend/src/modules/subscriptions/subscription.entity.ts"

# Launch all DTOs together:
Task: "Create DTOs for Opportunity in backend/src/modules/opportunities/dto/"
Task: "Create DTOs for Sale in backend/src/modules/sales/dto/"
Task: "Create DTOs for Client in backend/src/modules/clients/dto/"
Task: "Create DTOs for Subscription"

# Launch all contract tests together:
Task: "Contract test for opportunity CRUD in backend/tests/contract/"
Task: "Contract test for checkout generation in backend/tests/contract/"
Task: "Contract test for webhook processing in backend/tests/contract/"
Task: "Integration test for full sales flow in backend/tests/integration/"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 = Full Sales Cycle)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 (Tenants & Users)
4. Complete Phase 4: US2 (Plans)
5. Complete Phase 5: US3 (Sales Cycle)
6. **STOP and VALIDATE**: Full end-to-end: create opportunity → generate checkout → simulate payment → verify client created
7. Deploy/demo — this is the core business operational!

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. + US1 → Tenant/user management → Demo to Super Admin
3. + US2 → Plan configuration → Demo plan creation
4. + US3 → Full sales cycle → **MVP deployed!** (core business value)
5. + US4 → Client management + finance → Enhanced operations
6. + US5 → Dashboards → Business intelligence
7. + US6 → Future auth prep → Ready for mobile app phase

### Parallel Team Strategy

With multiple developers after Foundational:
- Developer A: US1 + US2 (sequential, same domain: admin)
- Developer B: US3 preparation (entities + DTOs while US2 completes)
- Once US1+US2 done: Dev A continues US4, Dev B does US3
- Dev C joins for US5 and US6 in parallel after US3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify contract tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Migrations: generate → review → apply cycle per constitutional requirement
- All entities use `@Column({ name: 'tenant_id' })` for multi-tenant isolation
- All DTOs use `class-validator` decorators per constitutional requirement
- All protected routes use `@UseGuards(AuthGuard('jwt'))` per constitutional requirement
- Native `fetch` (Node 18+) for Asaas HTTP calls — no new dependency
- `synchronize: false` always — migrations only
