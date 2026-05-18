# Research: Platform Admin vs Tenant User Separation

**Phase**: 0 — Outline & Research
**Date**: 2026-05-14

## Overview

No NEEDS CLARIFICATION markers were present in the Technical Context. All
technology choices are locked by the project constitution (NestJS, TypeORM,
PostgreSQL, Next.js, JWT). This document confirms design decisions and
documents any project patterns relevant to the implementation.

## Decisions

### Tenant Access Enforcement Pattern

**Decision**: Extend the existing `TenantMiddleware` to check both
`x-tenant-id` presence AND user access authorization.

**Rationale**: The existing middleware already intercepts all routes and
extracts `x-tenant-id`. Adding the access check here avoids a separate
interceptor and keeps the enforcement consistent — one place to validate
tenant access for every request.

**Alternatives considered**:
- New dedicated guard: Would work but duplicates the extraction logic
  already in `TenantMiddleware`
- Interceptor-only: Would add access check after middleware, but
  interceptor doesn't have access to the user context naturally

### is_platform_admin Storage

**Decision**: Add boolean column `is_platform_admin` directly on `users`
table, default `false`.

**Rationale**: The user record is always loaded during JWT authentication
(via passport strategy), so the flag is available at request time without
extra queries. Mapping via a separate table would add joins on every request.

**Alternatives considered**:
- Separate `platform_admins` table: More normalized but requires a join
  on every authenticated request for no benefit
- Claim in JWT payload: The flag is already available from the user entity
  loaded by the passport strategy, so JWT claims would be redundant

### TenantUser Status Values

**Decision**: Use string enum: `active`, `inactive`.

**Rationale**: Boolean (`is_active`) would require a separate column to
store the reason for deactivation later. String enum allows future
extensions (`suspended`, `pending`) without schema changes.

**Alternatives considered**:
- Boolean `is_active`: Simpler but less extensible
- Integer status codes: Requires a lookup table or constants — overkill
  for the current scope

### Tenant Access Logic

**Decision**: Implement as middleware that runs after JWT authentication,
checking:
1. If `user.is_platform_admin` → allow access to any tenant
2. If not → query `tenant_users` for an active link to the requested tenant

**Rationale**: Clean separation of concerns — auth happens first (is this
user valid?), then tenant access (does this user have access to this tenant?).

## New Dependencies

None. All required capabilities exist in the current stack (TypeORM for
the new entity, NestJS modules for the new controller/service).
