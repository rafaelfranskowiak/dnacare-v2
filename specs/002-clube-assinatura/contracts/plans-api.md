# API Contracts: Plans

**Base URL**: `/api/plans`  
**Roles**: Super Admin (all), Admin (GET only, available plans)  
**Authentication**: JWT required on all endpoints

---

## GET /api/plans

List all plans (Super Admin) or available-for-sale plans (Admin).

**Query Params**: `?status=published`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "type": "PF | PJ",
      "status": "rascunho | publicado | inativo | arquivado",
      "availableForSale": "boolean",
      "currentVersion": {
        "id": "uuid",
        "version": "number",
        "baseValue": "number",
        "dependentRule": "string"
      },
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```

---

## POST /api/plans

Create a new plan as draft.

**Roles**: Super Admin

**Request**:
```json
{
  "name": "string (required, unique)",
  "description": "string (optional)",
  "type": "PF | PJ (required)",
  "internalNotes": "string (optional)"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "type": "PF | PJ",
  "status": "rascunho",
  "createdAt": "string (ISO 8601)"
}
```

---

## GET /api/plans/:id

Get plan details with all versions.

**Roles**: Super Admin

**Response 200**:
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "type": "PF | PJ",
  "status": "string",
  "internalNotes": "string",
  "versions": [
    {
      "id": "uuid",
      "version": "number",
      "name": "string",
      "baseValue": "number",
      "billingCycle": "string",
      "dependentRule": "string",
      "includedDependents": "number",
      "maxDependents": "number",
      "dependentValue": "number",
      "tiersConfig": "object",
      "admissionFee": "number",
      "status": "rascunho | publicado | inativo",
      "publishedAt": "string (ISO 8601)"
    }
  ],
  "createdAt": "string (ISO 8601)"
}
```

---

## PATCH /api/plans/:id

Update plan metadata (name, description, etc.). Cannot change published plan's version directly.

**Roles**: Super Admin

**Request**:
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "internalNotes": "string (optional)"
}
```

---

## POST /api/plans/:id/publish

Publish the current draft version (or create first version from plan).

**Roles**: Super Admin

**Request**:
```json
{
  "baseValue": "number (required)",
  "billingCycle": "MONTHLY (required)",
  "dependentRule": "none | fixed | progressive | regressive | tiered (required)",
  "includedDependents": "number (default: 0)",
  "maxDependents": "number (optional)",
  "minDependents": "number (default: 0)",
  "dependentValue": "number (optional)",
  "tiersConfig": "object (optional)",
  "admissionFee": "number (optional)"
}
```

**Response 200**:
```json
{
  "planVersion": {
    "id": "uuid",
    "version": "number",
    "status": "publicado",
    "publishedAt": "string (ISO 8601)"
  }
}
```

---

## POST /api/plans/:id/versions

Create a new draft version (duplicate from latest).

**Roles**: Super Admin

**Response 201**:
```json
{
  "id": "uuid",
  "version": "number",
  "status": "rascunho"
}
```

---

## POST /api/plans/:id/inactivate

Inactivate plan (no longer available for new sales).

**Roles**: Super Admin

**Response 200**:
```json
{
  "id": "uuid",
  "status": "inativo"
}
```

---

## GET /api/plans/:id/clients

List clients linked to this plan (through versions).

**Roles**: Super Admin

**Response 200**:
```json
{
  "data": [
    {
      "clientId": "uuid",
      "clientName": "string",
      "planVersionId": "uuid",
      "planVersionName": "string",
      "subscriptionStatus": "string",
      "tenantId": "uuid",
      "tenantName": "string"
    }
  ]
}
```

---

## GET /api/plans/available

List plans available for sale (published status). Used by Representatives when creating opportunities.

**Roles**: Admin, Gerente, Representante

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "type": "PF | PJ",
      "currentVersion": {
        "id": "uuid",
        "version": "number",
        "baseValue": "number",
        "dependentRule": "string",
        "includedDependents": "number",
        "maxDependents": "number",
        "dependentValue": "number",
        "admissionFee": "number"
      }
    }
  ]
}
```
