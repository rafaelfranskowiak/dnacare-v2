# Data Model: Clube de Assinatura Multitenant

**Feature**: 002-clube-assinatura  
**Date**: 2026-05-17  
**Source**: [spec.md](./spec.md) + [research.md](./research.md)

## Entity Relationship Overview

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Tenant  │────<│   Team   │────<│   User    │
│(unidade) │     │  (time)  │     │(usuário)  │
└────┬─────┘     └──────────┘     └─────┬─────┘
     │                                  │
     │ tenant_id                        │ seller_id
     ▼                                  ▼
┌──────────────┐    ┌──────────┐    ┌──────────┐
│ Opportunity  │───>│   Sale   │───>│  Client  │
│(oportunidade)│    │ (venda)  │    │(cliente) │
└──────┬───────┘    └────┬─────┘    └────┬─────┘
       │                 │               │
       │ plan_version_id │               │ holder_id
       ▼                 ▼               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PlanVersion  │    │ Subscription │    │  Dependent   │
│(versão_plano)│    │ (assinatura) │    │(dependente)  │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       │ plan_id
       ▼
┌──────────────┐
│     Plan     │
│   (plano)    │
└──────────────┘
```

## Entities (New)

### 1. Plan (`plans`)

Global entity — NOT tenant-scoped. Managed exclusively by Super Admin.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | e.g., "Plano Família PF" |
| `description` | TEXT | NULLABLE | |
| `type` | VARCHAR(2) | NOT NULL, CHECK IN ('PF','PJ') | Physical person or legal entity |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'rascunho' | rascunho, publicado, inativo, arquivado |
| `available_for_sale` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether current version is available |
| `internal_notes` | TEXT | NULLABLE | Super Admin notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### 2. PlanVersion (`plan_versions`)

Immutable after publication. Each version freezes a specific configuration.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `plan_id` | UUID | FK → plans.id, NOT NULL | Parent plan |
| `version` | INT | NOT NULL | Sequential version number within plan |
| `name` | VARCHAR(255) | NOT NULL | e.g., "Plano Família PF v1" |
| `base_value` | DECIMAL(10,2) | NOT NULL | Monthly base price |
| `billing_cycle` | VARCHAR(20) | NOT NULL, DEFAULT 'MONTHLY' | WEEKLY, BIWEEKLY, MONTHLY, etc. |
| `dependent_rule` | VARCHAR(20) | NOT NULL, DEFAULT 'none' | none, fixed, progressive, regressive, tiered |
| `included_dependents` | INT | NOT NULL, DEFAULT 0 | Dependents included in base value |
| `max_dependents` | INT | NULLABLE | NULL = unlimited |
| `min_dependents` | INT | NOT NULL, DEFAULT 0 | |
| `dependent_value` | DECIMAL(10,2) | NULLABLE | Value per additional dependent |
| `tiers_config` | JSONB | NULLABLE | Tier configuration for tiered pricing |
| `admission_fee` | DECIMAL(10,2) | NULLABLE | One-time admission fee |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'rascunho' | rascunho, publicado, inativo |
| `published_at` | TIMESTAMPTZ | NULLABLE | When published |
| `inactivated_at` | TIMESTAMPTZ | NULLABLE | When inactivated |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### 3. Opportunity (`opportunities`)

Tenant-scoped. Represents a potential client before payment.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `seller_id` | UUID | FK → users.id, NOT NULL | Representative who created |
| `name` | VARCHAR(255) | NOT NULL | |
| `document` | VARCHAR(18) | NOT NULL | Raw CPF/CNPJ input |
| `document_normalized` | VARCHAR(14) | NOT NULL | Digits only |
| `phone` | VARCHAR(20) | NULLABLE | |
| `email` | VARCHAR(255) | NULLABLE | |
| `birth_date` | DATE | NULLABLE | |
| `postal_code` | VARCHAR(9) | NULLABLE | CEP |
| `address` | VARCHAR(255) | NULLABLE | |
| `address_number` | VARCHAR(20) | NULLABLE | |
| `address_complement` | VARCHAR(100) | NULLABLE | |
| `neighborhood` | VARCHAR(100) | NULLABLE | |
| `city` | VARCHAR(100) | NULLABLE | |
| `state` | VARCHAR(2) | NULLABLE | UF |
| `plan_version_id` | UUID | FK → plan_versions.id, NULLABLE | Selected plan version |
| `payment_method` | VARCHAR(20) | NULLABLE | CREDIT_CARD, BOLETO |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'aberta' | aberta, checkout_gerado, convertida, cancelada |
| `cancel_reason` | VARCHAR(500) | NULLABLE | Justification (min 20 chars) |
| `cancelled_by_id` | UUID | FK → users.id, NULLABLE | Who cancelled |
| `cancelled_at` | TIMESTAMPTZ | NULLABLE | |
| `asaas_customer_id` | VARCHAR(50) | NULLABLE | Asaas customer ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique constraint**: `(tenant_id, document_normalized)` prevents duplicate documents within a tenant.

### 4. Sale (`sales`)

Tenant-scoped. Created when checkout/invoice is generated.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `opportunity_id` | UUID | FK → opportunities.id, NOT NULL | |
| `seller_id` | UUID | FK → users.id, NOT NULL | |
| `team_id` | UUID | FK → teams.id, NULLABLE | |
| `plan_id` | UUID | FK → plans.id, NOT NULL | |
| `plan_version_id` | UUID | FK → plan_versions.id, NOT NULL | |
| `plan_snapshot` | JSONB | NOT NULL | Frozen plan config at sale time |
| `dependent_count` | INT | NOT NULL, DEFAULT 0 | |
| `total_lives` | INT | NOT NULL | holder (1) + dependents |
| `base_value` | DECIMAL(10,2) | NOT NULL | |
| `dependents_value` | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | |
| `admission_fee` | DECIMAL(10,2) | NULLABLE | |
| `subtotal` | DECIMAL(10,2) | NOT NULL | |
| `discount` | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | |
| `total_value` | DECIMAL(10,2) | NOT NULL | |
| `calculation_memory` | JSONB | NOT NULL | Audit trail of pricing calculation |
| `payment_method` | VARCHAR(20) | NOT NULL | CREDIT_CARD, BOLETO |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'pending_payment' | pending_payment, confirmed, cancelled_before_payment, failed, refunded |
| `asaas_customer_id` | VARCHAR(50) | NULLABLE | |
| `asaas_payment_id` | VARCHAR(50) | NULLABLE | Payment/checkout ID |
| `asaas_checkout_url` | VARCHAR(500) | NULLABLE | Redirect URL for credit card |
| `asaas_bankslip_url` | VARCHAR(500) | NULLABLE | Boleto URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### 5. Client (`clients`)

Tenant-scoped. Created only after payment confirmation. Both holders and dependents.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `opportunity_id` | UUID | FK → opportunities.id, NOT NULL | Origin |
| `seller_id` | UUID | FK → users.id, NOT NULL | Original representative |
| `type` | VARCHAR(10) | NOT NULL, CHECK IN ('holder','dependent') | |
| `holder_id` | UUID | FK → clients.id, NULLABLE | For dependents: parent holder |
| `name` | VARCHAR(255) | NOT NULL | |
| `document` | VARCHAR(18) | NOT NULL | |
| `document_normalized` | VARCHAR(14) | NOT NULL | |
| `phone` | VARCHAR(20) | NULLABLE | |
| `email` | VARCHAR(255) | NULLABLE | |
| `birth_date` | DATE | NULLABLE | |
| `postal_code` | VARCHAR(9) | NULLABLE | |
| `address` | VARCHAR(255) | NULLABLE | |
| `address_number` | VARCHAR(20) | NULLABLE | |
| `address_complement` | VARCHAR(100) | NULLABLE | |
| `neighborhood` | VARCHAR(100) | NULLABLE | |
| `city` | VARCHAR(100) | NULLABLE | |
| `state` | VARCHAR(2) | NULLABLE | |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'ativo' | ativo, inativo, inadimplente, cancelamento_pendente, vinculado_a_titular_inativo, removido |
| `asaas_customer_id` | VARCHAR(50) | NULLABLE | Only for holders |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique constraint**: `(tenant_id, document_normalized)` — same as opportunities, enforces uniqueness across the unit.

### 6. Subscription (`subscriptions`)

Tenant-scoped. Represents the active recurring plan for a holder.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `client_id` | UUID | FK → clients.id, NOT NULL, UNIQUE | One subscription per holder |
| `sale_id` | UUID | FK → sales.id, NOT NULL | Originating sale |
| `plan_id` | UUID | FK → plans.id, NOT NULL | |
| `plan_version_id` | UUID | FK → plan_versions.id, NOT NULL | |
| `plan_name` | VARCHAR(255) | NOT NULL | Frozen name at contracting |
| `recurring_value` | DECIMAL(10,2) | NOT NULL | Contracted recurring value |
| `dependent_rule` | VARCHAR(20) | NOT NULL | Frozen dependent rule |
| `dependent_count` | INT | NOT NULL | Contracted dependent count |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'ativa' | ativa, inadimplente, inativa, cancelamento_pendente |
| `start_date` | DATE | NOT NULL | |
| `cancel_reason` | VARCHAR(500) | NULLABLE | |
| `cancelled_by_id` | UUID | FK → users.id, NULLABLE | |
| `cancelled_at` | TIMESTAMPTZ | NULLABLE | |
| `asaas_subscription_id` | VARCHAR(50) | NULLABLE | Asaas subscription ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### 7. Document Registry (`document_registry`)

Tenant-scoped. Canonical document uniqueness control.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `document_normalized` | VARCHAR(14) | NOT NULL | Digits only |
| `entity_type` | VARCHAR(30) | NOT NULL | opportunity, client, client_auth_account |
| `entity_id` | UUID | NOT NULL | FK to the specific entity |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique constraint**: `(tenant_id, document_normalized)` — one document per unit across all entity types.

### 8. Webhook Event (`webhook_events`)

Tenant-scoped. Idempotency registry for Asaas webhooks.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `asaas_event_id` | VARCHAR(50) | NOT NULL, UNIQUE | Asaas event ID (evt_...) |
| `event_type` | VARCHAR(50) | NOT NULL | PAYMENT_CONFIRMED, etc. |
| `payload` | JSONB | NOT NULL | Full webhook payload |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'received' | received, processing, processed, failed |
| `processed_at` | TIMESTAMPTZ | NULLABLE | |
| `error_message` | TEXT | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### 9. Client Auth Account (`client_auth_accounts`) — Future

Tenant-scoped. Future mobile app authentication for clients. Not fully implemented in MVP.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `client_id` | UUID | FK → clients.id, NOT NULL | Any client (holder or dependent) |
| `email` | VARCHAR(255) | NULLABLE | |
| `phone` | VARCHAR(20) | NULLABLE | |
| `document_normalized` | VARCHAR(14) | NOT NULL | |
| `password_hash` | VARCHAR(255) | NULLABLE | bcrypt |
| `auth_provider` | VARCHAR(20) | NULLABLE | email, phone_otp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `last_login_at` | TIMESTAMPTZ | NULLABLE | |
| `email_verified_at` | TIMESTAMPTZ | NULLABLE | |
| `phone_verified_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

## Entities (Modified)

### Tenant (`tenants`)

Add Asaas configuration columns:

| Column | Type | Description |
|--------|------|-------------|
| `asaas_api_key` | VARCHAR(255) | Encrypted Asaas API key |
| `asaas_sandbox` | BOOLEAN | Use sandbox environment |
| `asaas_webhook_url` | VARCHAR(500) | Webhook URL for this unit |
| `asaas_webhook_id` | VARCHAR(50) | Asaas webhook config ID |

### Users (`users`) — No structural changes

User role is determined via `TenantUser` join table's `role_id`.

### Tenanted User (`tenant_users`) — Modified

Add `team_id` FK and `role` column to the existing join table:

| Column | Type | Description |
|--------|------|-------------|
| `team_id` | UUID | FK → teams.id, NULLABLE |
| `role` | VARCHAR(20) | ENUM: admin, gerente, representante |

---

### Team (`teams`) — New

Tenant-scoped. Groups users under a manager for access control and reporting.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK → tenants.id, NOT NULL | |
| `name` | VARCHAR(100) | NOT NULL | Team display name |
| `manager_id` | UUID | FK → users.id, NOT NULL | Gerente responsible |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

## State Machines

### Opportunity Status Transitions

```
aberta ──────────> checkout_gerado ──────────> convertida
  │                       │
  └───────> cancelada <───┘
```

### Sale Status Transitions

```
pending_payment ──────────> confirmed ──────────> refunded
       │
       ├──────────> cancelled_before_payment
       │
       └──────────> failed
```

### Client (Holder) Status Transitions

```
ativo ──────────> inadimplente ──────────> ativo
  │                     │
  ├──> cancelamento_pendente ──> inativo
  │                                      │
  └──────────────────────────────────────┘
```

### Client (Dependent) Status Transitions

```
ativo ──────────> vinculado_a_titular_inativo ──────────> ativo
  │
  ├──> removido ──────────> ativo
  │
  └──> inativo
```

### Subscription Status Transitions

```
ativa ──────────> inadimplente ──────────> ativa
  │                     │
  ├──> cancelamento_pendente ──> inativa
  │                                        │
  └────────────────────────────────────────┘
```

## Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `opportunities` | `(tenant_id, document_normalized)` | UNIQUE | Document uniqueness per unit |
| `opportunities` | `(tenant_id, status)` | BTREE | List filtering |
| `opportunities` | `(tenant_id, seller_id)` | BTREE | Performance by seller |
| `clients` | `(tenant_id, document_normalized)` | UNIQUE | Document uniqueness per unit |
| `clients` | `(tenant_id, holder_id)` | BTREE | Dependents by holder |
| `clients` | `(tenant_id, status)` | BTREE | List filtering |
| `sales` | `(tenant_id, opportunity_id)` | BTREE | Sale by opportunity |
| `subscriptions` | `(tenant_id, client_id)` | UNIQUE | One subscription per holder |
| `subscriptions` | `(tenant_id, status)` | BTREE | Active subscriptions |
| `document_registry` | `(tenant_id, document_normalized)` | UNIQUE | Canonical uniqueness |
| `webhook_events` | `(asaas_event_id)` | UNIQUE | Idempotency |
| `plan_versions` | `(plan_id, version)` | UNIQUE | Version numbering |
