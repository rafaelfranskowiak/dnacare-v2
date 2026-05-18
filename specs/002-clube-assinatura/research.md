# Research Document: Clube de Assinatura Multitenant

**Feature**: 002-clube-assinatura  
**Date**: 2026-05-17  
**Status**: Complete

## 1. Asaas API Integration

### Decision: Direct REST API integration (Asaas v3)

The Asaas API v3 provides all required capabilities: customer management, payment creation (boleto/PIX/credit card), hosted checkout with subscription support, subscription lifecycle management, and webhook event delivery.

**Authentication**: API key sent via `access_token` header (not Bearer token). Each unit stores its own API key in the tenant configuration.

**Base URLs**:
- Sandbox: `https://api-sandbox.asaas.com`
- Production: `https://api.asaas.com`

**Key endpoints for the subscription flow**:

| Endpoint | Purpose | Used In |
|----------|---------|---------|
| `POST /v3/customers` | Create customer (name + cpfCnpj) | Checkout/fatura generation |
| `GET /v3/customers` | List customers by CPF/CNPJ | Deduplication before creation |
| `POST /v3/payments` | Create boleto/PIX invoice | Boleto payment flow |
| `POST /v3/checkouts` | Create hosted checkout page | Credit card flow with subscription |
| `POST /v3/subscriptions` | Create subscription directly | Direct subscription (no checkout) |
| `GET /v3/subscriptions/{id}/payments` | List subscription payments | Financial data on holder route |
| `DELETE /v3/subscriptions/{id}` | Cancel subscription | Plan cancellation |
| `GET /v3/payments` | List payments by customer/subscription | Financial history |
| `POST /v3/webhooks` | Configure webhook per unit | Unit onboarding |

**Rationale**: Asaas is the business-defined gateway. Direct REST API is simpler than SDK dependency. The v3 API has mature webhook support with event types covering the full payment lifecycle.

**Alternatives considered**: Asaas Node.js SDK — rejected because it adds a dependency and the REST API is well-documented and straightforward.

### Decision: Webhook event strategy

The system will subscribe to these Asaas webhook events per unit:

| Event | Internal Action |
|-------|----------------|
| `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` | Confirm sale, convert opportunity, create clients |
| `PAYMENT_OVERDUE` | Mark subscription as `inadimplente` |
| `PAYMENT_REFUNDED` | Mark sale as `refunded` |
| `PAYMENT_DELETED` | Mark sale as `failed` (if pending) |
| `SUBSCRIPTION_INACTIVATED` | Mark subscription as `inativa`, update client statuses |
| `SUBSCRIPTION_DELETED` | Mark subscription as `inativa` |
| `CHECKOUT_PAID` | Same as payment confirmed (checkout-based flow) |

**Important**: Subscription events don't have dedicated webhooks — subscription status is tracked via payment webhooks. Each payment event includes a `subscription` field linking to the parent subscription.

### Decision: Webhook security

- Validate `asaas-access-token` header against the configured `authToken` per webhook
- Only process events from [Asaas official IPs](https://docs.asaas.com/docs/ips-oficiais-do-asaas)
- Return HTTP 200 immediately to avoid queue backoff; process asynchronously if heavy

**Rationale**: Required by Asaas best practices to prevent spoofed webhooks and avoid delivery backoff.

---

## 2. Idempotent Webhook Processing

### Decision: Database-level idempotency via unique `asaas_event_id` column

Each incoming webhook event has a unique `id` (e.g., `evt_...`). The system stores this in a `webhook_events` table with a UNIQUE constraint on `asaas_event_id`. Processing is wrapped in a database transaction:

1. Attempt INSERT into `webhook_events` with `asaas_event_id` and status `processing`
2. If UNIQUE constraint fails → event already processed → return 200 (idempotent)
3. Process business logic (confirm sale, create clients, update statuses)
4. Update webhook event status to `processed`

**Rationale**: Database-level guarantee is simpler and more reliable than distributed locks or Redis. PostgreSQL UNIQUE constraints are ACID-compliant. No external dependency needed.

**Alternatives considered**:
- Redis-based deduplication with TTL — adds infrastructure dependency, less reliable
- Application-level map — not persistent across restarts
- Asaas `event.id` + status check on entities — fragile, doesn't prevent race conditions

---

## 3. Plan Versioning Strategy

### Decision: Separate `plans` and `plan_versions` entities

Following the escopo.md specification, plans have two layers:

- **`plans`**: The commercial product (e.g., "Plano Família PF"). Has name, type (PF/PJ), and status (rascunho/publicado/inativo/arquivado).
- **`plan_versions`**: A specific configuration at a point in time. Has value, dependent rules, limits. Immutable after publication. Linked to `plans` via FK.

**Versioning rules**:
- Creating a new version generates a draft `plan_version` linked to the same `plan`
- Publishing a version sets `published_at` and makes it available for sale
- A plan can have only one "published" version for new sales at any time (enforced at application level)
- Sales and subscriptions reference `plan_version_id`, not `plan_id` directly
- Sales also store a "snapshot" of plan configuration at time of contracting (denormalized JSON)

**Rationale**: This design preserves historical accuracy — existing clients keep their contracted version while new sales use the latest. The snapshot on sales provides defense-in-depth against any future data integrity issues.

**Alternatives considered**:
- Single table with version column — wouldn't work because versions have different sets of rules/values
- JSON field for version history — querying and enforcing foreign keys would be difficult
- Event sourcing — overkill for this business domain

---

## 4. CPF/CNPJ Normalization and Uniqueness

### Decision: Service-level normalization with database unique index

**Normalization**: Strip non-numeric characters, validate check digits. Store both raw input and normalized value.

**Uniqueness**: A composite unique index on `(tenant_id, document_normalized)` across all entities that store documents. However, since documents span multiple tables (opportunities, clients, client_auth_accounts), the practical approach is:

1. A `document_registry` table per tenant: `(tenant_id, document_normalized, entity_type, entity_id)` with UNIQUE on `(tenant_id, document_normalized)`
2. On opportunity creation: check `document_registry` → if exists, block and show existing record
3. On client creation: insert into `document_registry`
4. On opportunity cancellation: remove from `document_registry` (the document becomes available again)

**Rationale**: A document registry provides a single source of truth for uniqueness across all entities. The unique constraint prevents race conditions at the database level.

**Alternatives considered**:
- Application-level check across all tables — race condition between concurrent requests
- Single `persons` table — would mix opportunities (pre-payment) with clients (post-payment), violating the business rule that clients only exist after payment

---

## 5. ViaCEP Integration

### Decision: Direct HTTP call to ViaCEP API

The ViaCEP API is a free Brazilian ZIP code lookup service. Endpoint: `https://viacep.com.br/ws/{cep}/json/`

**Response fields**: `logradouro`, `bairro`, `localidade`, `uf`, `cep`, `complemento`, `erro` (boolean if not found)

**Implementation**: Called from the backend opportunity service when CEP is filled. Returns address fields that auto-populate the form. Falls back gracefully (allows manual entry) on API failure or CEP not found.

**Rationale**: Simple GET request, no auth required. The API is stable and widely used in Brazilian systems. The escopo.md explicitly requires this integration.

**Alternatives considered**:
- Frontend-only call — rejected because CORS restrictions on ViaCEP API
- Correios SOAP API — more complex, requires contract
- BrasilAPI — alternative but ViaCEP is more established

---

## 6. State Machine Implementation

### Decision: Service-level validation with enum columns

State machines are implemented as TypeScript enums for status values and service-layer validation for allowed transitions. No external state machine library.

**Pattern**:
```typescript
enum OpportunityStatus { ABERTA = 'aberta', CHECKOUT_GERADO = 'checkout_gerado', ... }

const ALLOWED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  [OpportunityStatus.ABERTA]: [OpportunityStatus.CHECKOUT_GERADO, OpportunityStatus.CANCELADA],
  // ...
};

// In service:
if (!ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
  throw new BadRequestException(`Transição inválida: ${currentStatus} → ${newStatus}`);
}
```

**Rationale**: The state machines have few states (4-5 per entity) and simple transition rules. A library would add complexity without benefit. Service-level validation keeps the logic explicit and testable.

**Alternatives considered**:
- XState / state machine libraries — overkill for 4-5 states with simple rules
- Database-level CHECK constraints — harder to maintain and test

---

## 7. Asaas HTTP Client in NestJS

### Decision: Dedicated `AsaasService` with per-tenant API key resolution

The Asaas HTTP client will be a NestJS `@Injectable()` service that:
1. Resolves the API key from the current tenant's configuration
2. Uses Node.js native `fetch` (available in Node 18+) for HTTP calls
3. Provides typed methods: `createCustomer()`, `createPayment()`, `createCheckout()`, `createSubscription()`, `cancelSubscription()`, `getPayments()`
4. Handles Asaas error responses with proper NestJS exceptions

**Configuration**: API key per tenant stored in `tenants` table (`asaas_api_key` column, encrypted). Sandbox mode controlled by environment variable `ASAAS_SANDBOX` + per-tenant override.

**Rationale**: Native `fetch` avoids adding axios/got dependencies. Per-tenant API key resolution is required by the multi-tenancy architecture (each unit has its own Asaas account).

---

## 8. Role-Based Access Control

### Decision: `@Roles()` decorator + `RolesGuard`

Extend the existing JWT auth with role-based authorization:
- `@Roles('super_admin', 'admin', 'gerente', 'representante')` decorator on controllers/routes
- `RolesGuard` checks the user's role (stored on `TenantUser` join table) against required roles
- Applied alongside existing `@UseGuards(JwtAuthGuard, TenantAccessGuard)`

**Role hierarchy** (from escopo.md):
- **Super Admin**: Global access, plan management, tenant creation
- **Administrador**: Unit management, team, clients, financial data
- **Gerente**: Team oversight, indicators
- **Representante**: Opportunities, own clients

**Rationale**: Follows existing guard pattern in the codebase. Role hierarchy matches the business specification exactly.

---

## 9. Frontend Architecture

### Decision: Server components with client interactivity where needed

Following Next.js 14 App Router conventions:
- List pages as server components with search params for filtering
- Detail pages as server components with client island for interactive elements
- Modals for create/edit forms (client components)
- `api.ts` wrapper already auto-injects `x-tenant-id` and Bearer token

**New pages structure**:
- `(dashboard)/oportunidades/` — list, create, [id] detail
- `(dashboard)/clientes/` — list, [id] holder detail, [id]/dependentes/[dependentId]
- `(dashboard)/relatorios/` — dashboards
- `(dashboard)/equipe/` — team management
- `admin/planos/` — Super Admin plan CRUD

**Rationale**: Leverages existing patterns (AuthProvider, Sidebar, Header, api.ts). No new UI library needed — Tailwind + existing design tokens cover all interface needs.

---

## 10. Motor de Cálculo (Plan Pricing Engine)

### Decision: Pure function with typed inputs/outputs

The pricing engine is a deterministic function that takes plan version configuration + dependent count and returns the calculated values:

```typescript
interface PricingInput {
  baseValue: number;
  dependentRule: 'none' | 'fixed' | 'progressive' | 'regressive' | 'tiered';
  includedDependents: number;
  dependentValue: number;
  tiers?: TierConfig[];
  admissionFee?: number;
  discount?: number;
  dependentCount: number;
}

interface PricingOutput {
  baseValue: number;
  dependentsValue: number;
  admissionFee: number;
  subtotal: number;
  discount: number;
  total: number;
  calculationMemory: string; // JSON for audit
}
```

**Rationale**: Pure function is testable, deterministic, and doesn't require framework injection. The calculation memory (JSON) is stored on sales for audit trail.
