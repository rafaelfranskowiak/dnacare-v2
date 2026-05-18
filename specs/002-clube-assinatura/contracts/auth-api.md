# API Contracts: Auth

**Base URL**: `/api/auth`  
**Authentication**: JWT (except login)  
**Tenant Header**: `x-tenant-id` (required except login)

---

## POST /api/auth/login

Authenticate a tenant user.

**Headers**: `x-tenant-id: {slug}`

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "super_admin | admin | gerente | representante",
    "tenantId": "uuid",
    "tenantName": "string"
  }
}
```

**Errors**: 401 Invalid credentials, 401 Invalid tenant

---

## GET /api/auth/me

Get current authenticated user profile.

**Headers**: `Authorization: Bearer {token}`, `x-tenant-id: {slug}`

**Response 200**:
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "super_admin | admin | gerente | representante",
  "isPlatformAdmin": "boolean",
  "tenantId": "uuid",
  "tenantName": "string"
}
```

---

## POST /api/auth/admin/login

Authenticate a Super Admin (platform admin).

**Headers**: None (no tenant required)

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "super_admin",
    "isPlatformAdmin": true
  }
}
```
