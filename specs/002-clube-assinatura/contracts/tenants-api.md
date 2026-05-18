# API Contracts: Tenants

**Base URL**: `/api/tenants`  
**Roles**: Super Admin (all), Admin (own unit only)  
**Authentication**: JWT required on all endpoints

---

## GET /api/tenants

List all tenants (Super Admin only).

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string",
      "asaasConfigured": "boolean",
      "active": "boolean",
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```

---

## POST /api/tenants

Create a new tenant.

**Roles**: Super Admin

**Request**:
```json
{
  "name": "string (required)",
  "slug": "string (required, lowercase, hyphens only)"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "createdAt": "string (ISO 8601)"
}
```

**Errors**: 409 Slug already exists

---

## GET /api/tenants/:id

Get tenant details.

**Roles**: Super Admin, Admin (own unit)

**Response 200**:
```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "asaasApiKey": "string (masked)",
  "asaasSandbox": "boolean",
  "asaasWebhookUrl": "string",
  "asaasWebhookId": "string",
  "active": "boolean",
  "createdAt": "string (ISO 8601)"
}
```

---

## PATCH /api/tenants/:id

Update tenant configuration.

**Roles**: Super Admin, Admin (own unit, limited fields)

**Request**:
```json
{
  "name": "string (optional)",
  "asaasApiKey": "string (optional, Super Admin only)",
  "asaasSandbox": "boolean (optional, Super Admin only)"
}
```

**Response 200**: Updated tenant object

---

## DELETE /api/tenants/:id

Soft-deactivate a tenant.

**Roles**: Super Admin

**Response 200**: `null`

---

## GET /api/tenants/public

List public tenant info (no auth required, used by login page).

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string"
    }
  ]
}
```
