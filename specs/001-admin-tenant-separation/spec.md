# Feature Specification: Platform Admin vs Tenant User Separation

**Feature Branch**: `001-admin-tenant-separation`
**Created**: 2026-05-14
**Status**: Draft
**Input**: User description: "Regras para separarmos o super admin dos tenancies"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform admin can access any tenant (Priority: P1)

As a platform administrator, I want to access resources across all tenants
without needing an explicit user-to-tenant link, so that I can manage the
entire platform from a single account.

**Why this priority**: This is the core of the feature — defining the
platform admin's elevated access is the primary goal.

**Independent Test**: Create a user with `is_platform_admin = true`. Verify
that this user can successfully fetch data from multiple tenants without any
`tenant_users` records. Can be tested with a single API call to any
tenant-scoped endpoint.

**Acceptance Scenarios**:

1. **Given** a user with `is_platform_admin = true` and no `tenant_users`
   records, **When** the user makes a request to Tenant A's resources,
   **Then** the request succeeds and returns Tenant A's data
2. **Given** a user with `is_platform_admin = true`, **When** the user makes
   a request to Tenant B's resources (different tenant), **Then** the request
   succeeds and returns Tenant B's data
3. **Given** a non-admin user with `is_platform_admin = false` and no
   `tenant_users` records, **When** the user makes any API request, **Then**
   the request is rejected with an unauthorized error

---

### User Story 2 - Tenant user can only access linked tenants (Priority: P1)

As a regular tenant user, I want to only access tenants where I have an
explicit, active link, so that tenant data isolation is preserved.

**Why this priority**: Equally critical — this enforces the security boundary
for non-admin users.

**Independent Test**: Create a user with `is_platform_admin = false` and a
single active `tenant_users` record for Tenant A. Verify this user can access
Tenant A but is blocked from accessing Tenant B. Can be tested with a single
API call to each tenant's endpoint.

**Acceptance Scenarios**:

1. **Given** a non-admin user with an active `tenant_users` link to Tenant A,
   **When** the user makes a request to Tenant A, **Then** the request succeeds
2. **Given** a non-admin user with an active `tenant_users` link to Tenant A
   only, **When** the user makes a request to Tenant B, **Then** the request is
   rejected with an unauthorized error
3. **Given** a non-admin user with an inactive `tenant_users` link to Tenant A
   (status = inactive), **When** the user makes a request to Tenant A, **Then**
   the request is rejected

---

### User Story 3 - Platform admin manages tenant user links (Priority: P2)

As a platform administrator, I want to create, update, and remove
`tenant_users` records, so that I can control which regular users have access
to which tenants.

**Why this priority**: Important but depends on the core access control
(Stories 1 and 2) being in place first.

**Independent Test**: Use the API to create a `tenant_users` record linking
a user to a tenant, then verify that user can access that tenant. Remove the
link and verify access is revoked.

**Acceptance Scenarios**:

1. **Given** a platform admin, **When** they create a `tenant_users` record
   linking User X to Tenant A with status `active`, **Then** User X can
   access Tenant A's resources
2. **Given** an existing `tenant_users` record linking User X to Tenant A,
   **When** the platform admin sets its status to `inactive`, **Then** User X
   can no longer access Tenant A's resources
3. **Given** an existing `tenant_users` record, **When** the platform admin
   deletes it, **Then** User X can no longer access that tenant

---

### Edge Cases

- What happens when a user has both `is_platform_admin = true` AND
  `tenant_users` records? Platform admin status takes precedence — the user
  can access any tenant regardless of tenant_users records.
- What happens when a user's `is_platform_admin` is toggled from `true` to
  `false`? The user immediately loses cross-tenant access and is restricted
  to their `tenant_users` links.
- What happens when a `tenant_users` record has `role_id = null`? The user
  can access the tenant but has no specific role assigned — roles are a
  future enhancement.
- What happens when a user tries to access a tenant that does not exist?
  The system returns a "not found" error (not unauthorized), to avoid
  revealing tenant existence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST distinguish platform administrators from regular
  users via an `is_platform_admin` boolean flag on the user record
- **FR-002**: System MUST allow platform administrators to access any
  tenant's resources without requiring a `tenant_users` record
- **FR-003**: System MUST restrict regular users (`is_platform_admin = false`)
  to only access tenants where they have an active `tenant_users` link
- **FR-004**: System MUST support creating, reading, updating, and deleting
  `tenant_users` records
- **FR-005**: System MUST enforce that `tenant_users.user_id` references an
  existing user and `tenant_users.tenant_id` references an existing tenant
- **FR-006**: System MUST include a `status` field on `tenant_users` to
  enable enabling/disabling access without deleting the record
- **FR-007**: System MUST NOT include a "global tenant" concept or a
  `super_admin` role within the tenant role system
- **FR-008**: System MUST return unauthorized errors for tenant access
  violations, and not-found errors for non-existent tenants

### Key Entities *(include if feature involves data)*

- **User (modified)**: Existing user entity gains `is_platform_admin` boolean.
  Represents any person who can authenticate — either a platform admin or a
  regular user.
- **TenantUser (new)**: Links a user to a tenant. Contains tenant_id, user_id,
  role_id (nullable, for future role system), and status. Represents the
  explicit permission for a regular user to access a specific tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Platform admin can access any tenant's resources with zero
  `tenant_users` records — verified with at least 3 different tenants
- **SC-002**: Regular user is blocked from accessing a tenant they have no
  active `tenant_users` link to — verified with both missing links and
  inactive status
- **SC-003**: Platform admin can create, update status, and delete
  `tenant_users` records through the API — each operation returns correct
  success/error response
- **SC-004**: Toggling a user's `is_platform_admin` from true to false
  immediately restricts their access to only linked tenants — verified with
  a before/after API call

## Assumptions

- Existing authentication system (JWT + `x-tenant-id`) will be reused
- The `role_id` field on `tenant_users` is nullable and reserved for a future
  tenant-level role system — no role-based access control is implemented in
  this feature
- Access control logic will be applied at the middleware/interceptor level
  (consistent with existing `TenantMiddleware` and `TenantQueryInterceptor`
  patterns)
- Platform admin accounts are provisioned via seed or direct database (no
  self-service admin registration)
