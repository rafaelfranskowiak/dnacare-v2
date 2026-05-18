# Tenant Access Control Middleware

## Behavior

A new middleware/guard runs after JWT authentication on every protected
route (except `/api/auth/login` and `/api/tenant-users`).

**Logic**:

```
Request arrives with x-tenant-id = "tenant-x"
User from JWT: { id, email, tenantId: "tenant-y", is_platform_admin }

if user.is_platform_admin == true:
    → ALLOW request (bypass tenant_users check)

else:
    → Query tenant_users WHERE user_id = user.id
        AND tenant_id = "tenant-x"
        AND status = "active"
    → If found: ALLOW
    → If not found: REJECT 403 Forbidden
```

## JWT Strategy Update

The `validate()` method in `jwt.strategy.ts` MUST also return
`is_platform_admin`:

```ts
return {
  id: user.id,
  email: user.email,
  tenantId: payload.tenantId,
  is_platform_admin: user.is_platform_admin,
};
```
