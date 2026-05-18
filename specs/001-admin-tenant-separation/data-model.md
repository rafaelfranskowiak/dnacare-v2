# Data Model: Platform Admin vs Tenant User Separation

## Entities

### User (modified)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, auto-generated | Existing |
| email | string | unique, not null | Existing |
| password | string | not null | Existing (bcrypt) |
| name | string | not null | Existing |
| tenantId | string | not null | Existing |
| is_platform_admin | boolean | not null, default false | **NEW** |
| active | boolean | default true | Existing |
| createdAt | timestamp | auto | Existing |
| updatedAt | timestamp | auto | Existing |

**Validation**: `is_platform_admin` defaults to `false`. Only seed scripts or
direct DB operations can set it to `true` (no self-service endpoint).

### TenantUser (new)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, auto-generated | |
| tenantId | string | not null, FK → tenants.id | Which tenant |
| userId | string | not null, FK → users.id | Which user |
| roleId | string | nullable, FK → roles.id | Future: tenant-level role |
| status | string | not null, default 'active' | active / inactive |
| createdAt | timestamp | auto | |
| updatedAt | timestamp | auto | |

**Validation**:
- `status` MUST be one of: `active`, `inactive`
- A user MUST NOT have duplicate `tenant_user` records for the same tenant
- `userId` + `tenantId` combination MUST be unique

## Relationships

```
User ──1:N──> TenantUser ──N:1── Tenant
```

- A User can belong to many Tenants (via TenantUser)
- A Tenant can have many Users (via TenantUser)
- A User always has a `tenantId` (the one they registered under), but
  platform admins (is_platform_admin=true) can access ALL tenants
- TenantUser records grant regular users access to ADDITIONAL tenants
  beyond their own

## Access Control Flow

```
Request → TenantMiddleware (extract x-tenant-id)
        → JWT Auth (authenticate user)
        → Tenant Access Check (NEW):
            if user.is_platform_admin → ALLOW any tenant
            else → check tenant_users for active link → ALLOW or REJECT
        → TenantQueryInterceptor (auto-filter GET by tenantId)
        → Controller
```

## State Transitions

### TenantUser status

```
CREATE(status: active) → active
active → inactive (admin disables access)
inactive → active (admin re-enables access)
active → DELETE (admin removes link)
```

### User is_platform_admin

```
CREATE(is_platform_admin: false) → regular user
regular user → SET is_platform_admin=true → platform admin
platform admin → SET is_platform_admin=false → regular user
```
