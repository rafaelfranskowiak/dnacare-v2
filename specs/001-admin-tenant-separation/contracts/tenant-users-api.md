# Tenant Users API

**Auth Required**: All endpoints require `AuthGuard('jwt')` + platform admin
(`is_platform_admin = true`).

## List Tenant Users

```
GET /api/tenant-users?tenant_id=<tenantId>
```

**Query params**: `tenant_id` (optional, filter by tenant)

**Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "role_id": null,
      "status": "active",
      "created_at": "2026-05-14T00:00:00Z"
    }
  ]
}
```

## Create Tenant User Link

```
POST /api/tenant-users
```

**Body**:

```json
{
  "tenant_id": "uuid",
  "user_id": "uuid",
  "status": "active"
}
```

**Validation**: `tenant_id` and `user_id` are required. Duplicate
(tenant_id + user_id) rejected with 409 Conflict.

**Response 201**:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "status": "active",
  "created_at": "2026-05-14T00:00:00Z"
}
```

## Update Tenant User Status

```
PATCH /api/tenant-users/:id
```

**Body**:

```json
{
  "status": "inactive"
}
```

**Validation**: `status` must be `active` or `inactive`.

**Response 200**:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "status": "inactive",
  "updated_at": "2026-05-14T00:00:00Z"
}
```

## Delete Tenant User Link

```
DELETE /api/tenant-users/:id
```

**Response 204**: No content
