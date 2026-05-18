# Implementation Plan: Clube de Assinatura Multitenant

**Branch**: `002-clube-assinatura` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-clube-assinatura/spec.md`

## Summary

Build a multi-tenant subscription club platform on top of the existing NestJS + Next.js stack. The system enables a Super Admin to manage tenants (units) and centrally define subscription plans with versioning and dependent pricing rules. Unit operators (Admins, Managers, Representatives) create opportunities, generate checkouts/invoices via the Asaas payment gateway, and convert paid opportunities into clients (holders + dependents). Clients are created only after payment confirmation via idempotent webhook processing. The platform includes client management, financial tracking, plan cancellation, debt settlement, and operational reports. The data model prepares for future client-facing mobile app authentication via a separate identity layer.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: NestJS 10, TypeORM 0.3, PostgreSQL, Next.js 14 App Router, React 18, Tailwind CSS, Passport-JWT, bcrypt, class-validator  
**Storage**: PostgreSQL (via TypeORM, synchronize: false, migration-driven)  
**Testing**: Jest + Supertest (backend contract/integration), Jest + React Testing Library (frontend)  
**Target Platform**: Linux server (backend API + Next.js SSR), modern browsers (frontend)  
**Project Type**: Web application (NestJS API backend + Next.js frontend)  
**Performance Goals**: 50+ concurrent units, webhook processing <5s, checkout generation <3s, opportunity creation <30s  
**Constraints**: Multi-tenant isolation via tenant_id column on all entities, idempotent webhook handling, no hard deletes (status-based lifecycle), migration-driven schema changes only  
**Scale/Scope**: 50+ units, 100+ users per unit, 10k+ clients, 10 new NestJS modules, 20+ new frontend pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Multi-Tenancy by Design (NON-NEGOTIABLE) ✓

- [x] All new entities WILL include `tenantId` column with `@Column({ name: 'tenant_id' })`
- [x] `x-tenant-id` header already enforced by `TenantMiddleware` on all routes except `/api/auth/login`
- [x] `@Tenant()` decorator available for controller injection
- [x] `TenantQueryInterceptor` pattern will be extended to new modules
- [x] Plan entities (global, managed by Super Admin) are cross-tenant — explicit exemption documented

### II. Migration-Driven Schema ✓

- [x] `synchronize: false` remains untouched
- [x] All new entities will have migrations generated via `npm run migration:generate`
- [x] Migration files stored in `backend/database/migrations/`
- [x] No manual migration editing after generation

### III. API Validation & Type Safety ✓

- [x] `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` remains global
- [x] All DTOs will use `class-validator` decorators
- [x] TypeScript strict mode enabled

### IV. Security by Default ✓

- [x] `@UseGuards(AuthGuard('jwt'))` applied to every protected route
- [x] Passwords hashed with bcrypt (existing pattern in UsersService)
- [x] No public signup — user provisioning is admin-only
- [x] Client auth accounts (future) are separate from admin users

### V. Clean Module Architecture ✓

- [x] New modules follow `backend/src/modules/<domain>/` structure
- [x] Frontend pages in `frontend/src/app/(dashboard)/` following App Router conventions
- [x] No new major dependencies without justification
- [x] Standalone workers (webhook consumer, if needed) in `workers/` outside NestJS DI

### Additional Gates

- [x] **Pre-commit gate**: `npm run lint && npm run typecheck` must pass in both `backend/` and `frontend/`
- [x] **Feature branch**: `002-clube-assinatura` follows convention
- [x] **Testing**: Contract/integration tests to be written for each module

## Project Structure

### Documentation (this feature)

```text
specs/002-clube-assinatura/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   ├── auth-api.md
│   ├── tenants-api.md
│   ├── plans-api.md
│   ├── opportunities-api.md
│   ├── sales-api.md
│   ├── clients-api.md
│   ├── subscriptions-api.md
│   ├── reports-api.md
│   └── webhooks-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/            # Existing — login, JWT strategy
│   │   ├── users/           # Existing — user CRUD, bcrypt
│   │   ├── tenant/          # Existing — tenant CRUD, middleware, guards
│   │   ├── plans/           # NEW — plan + plan-version CRUD (Super Admin)
│   │   ├── opportunities/   # NEW — opportunity CRUD, dependent management
│   │   ├── sales/           # NEW — sale entity, checkout/fatura generation
│   │   ├── clients/         # NEW — client (holder/dependent) CRUD, routes
│   │   ├── subscriptions/   # NEW — subscription lifecycle
│   │   ├── asaas/          # NEW — Asaas API client, webhook handler
│   │   ├── webhooks/       # NEW — webhook receiver, idempotency
│   │   └── reports/        # NEW — dashboard indicators, report data
│   ├── config/
│   │   ├── asaas.config.ts  # NEW — Asaas API configuration
│   │   └── ...
│   ├── database/
│   │   ├── datasource.ts    # Existing
│   │   └── interceptors/
│   │       └── tenant-query.interceptor.ts  # NEW — auto-filter GET by tenantId
│   └── common/
│       ├── decorators/
│       │   └── roles.decorator.ts  # NEW — role-based access
│       └── guards/
│           └── roles.guard.ts      # NEW — role authorization
├── database/
│   └── migrations/         # Generated migrations
├── workers/
│   └── webhook-consumer.worker.ts  # NEW (if async needed)
└── tests/
    ├── contract/           # API contract tests
    └── integration/        # Integration tests

frontend/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── oportunidades/     # NEW — list, create, detail
│   │   │   ├── clientes/          # NEW — list, holder detail, dependent detail
│   │   │   ├── vendas/            # NEW — sales list, detail
│   │   │   ├── assinaturas/       # NEW — subscriptions
│   │   │   ├── relatorios/        # NEW — dashboards
│   │   │   ├── equipe/            # NEW — team/users management
│   │   │   └── config/            # NEW — unit settings, Asaas config
│   │   └── admin/
│   │       ├── planos/            # NEW — Super Admin plan management
│   │       └── unidades/          # Existing — tenant management
│   ├── components/
│   │   ├── ui/                    # Shared UI components
│   │   └── ...                    # Existing components
│   └── lib/
│       ├── api.ts                 # Existing — fetch wrapper
│       └── asaas-api.ts           # NEW — Asaas-specific API helpers (if frontend needs)
└── tests/                         # Frontend tests
```

**Structure Decision**: Web application (Option 2) — the project already has `backend/` and `frontend/`. All new modules follow the existing NestJS conventions. Frontend uses Next.js 14 App Router with `(dashboard)` route group for authenticated pages.

## Complexity Tracking

No constitutional violations. All new modules follow existing patterns:

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Asaas HTTP client | Use Node.js native `fetch` (available in Node 18+) | Avoids adding axios/got dependency; project already uses fetch on frontend |
| Plan versioning | Separate `plans` + `plan_versions` entities | Required by business rules (immutable published versions) |
| Role-based access | `@Roles()` decorator + `RolesGuard` (new) | Extends existing JWT auth pattern; constitution allows new guards |
| State machine | Status columns with enum validated in service layer | Simple enough to not warrant a state machine library |
| Webhook idempotency | `asaas_event_id` unique column + transaction | Database-level guarantee, no external dependency |
| CPF/CNPJ normalization | Service-level normalization with unique index | No external validation library needed |
