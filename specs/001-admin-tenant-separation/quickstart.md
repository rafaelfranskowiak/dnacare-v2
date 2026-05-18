# Quickstart: Platform Admin vs Tenant User Separation

## Setup

1. Generate migration:
   ```bash
   cd backend
   npm run migration:generate -- database/migrations/AddPlatformAdminAndTenantUsers
   ```

2. Review the generated migration file in `database/migrations/`

3. Apply migration:
   ```bash
   npm run migration:run
   ```

4. Update seed script to create a platform admin user:
   ```bash
   # Edit database/seeds/seed.ts — set is_platform_admin: true on the admin user
   npm run seed
   ```

## Test Scenarios

### Platform Admin Access

```bash
# Login as platform admin (use the seeded admin)
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default" \
  -d '{"email": "suporte@wizer.digital", "password": "Foco@ia8992!"}'

# Use the returned token to access any tenant
curl http://localhost:4003/api/some-resource \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: other-tenant"
```

### Tenant User Access

```bash
# Create a tenant user link
curl -X POST http://localhost:4003/api/tenant-users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default" \
  -d '{"tenant_id": "<tenant-id>", "user_id": "<user-id>", "status": "active"}'

# Login as the regular user
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <tenant-id>" \
  -d '{"email": "user@example.com", "password": "..."}'

# The user can now access that tenant's resources
curl http://localhost:4003/api/some-resource \
  -H "Authorization: Bearer <user-token>" \
  -H "x-tenant-id: <tenant-id>"

# But NOT other tenants
curl http://localhost:4003/api/some-resource \
  -H "Authorization: Bearer <user-token>" \
  -H "x-tenant-id: other-tenant"
# → 403 Forbidden
```

## Verification

- [ ] Login response includes `is_platform_admin`
- [ ] Platform admin can access any tenant's resources
- [ ] Regular user is blocked from unlinked tenants
- [ ] CRUD operations on tenant_users work correctly
- [ ] Disabling a tenant_users link immediately blocks access
