# API Contracts: Opportunities

**Base URL**: `/api/opportunities`  
**Roles**: Representante (own), Gerente (team), Admin (all unit), Super Admin (global)  
**Authentication**: JWT required on all endpoints

---

## GET /api/opportunities

List opportunities with filters.

**Query Params**:
- `status`: aberta | checkout_gerado | convertida | cancelada
- `sellerId`: uuid
- `search`: text search by name or document
- `page`: number (default 1)
- `limit`: number (default 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "document": "string (masked)",
      "status": "string",
      "sellerName": "string",
      "planName": "string | null",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

## POST /api/opportunities

Create a new opportunity.

**Roles**: Representante

**Request**:
```json
{
  "name": "string (required)",
  "document": "string (required, CPF or CNPJ)"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "document": "string (masked)",
  "documentNormalized": "string",
  "status": "aberta",
  "sellerId": "uuid",
  "createdAt": "string (ISO 8601)"
}
```

**Errors**: 409 Document already registered in this unit (with link to existing record)

---

## GET /api/opportunities/:id

Get full opportunity details.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Response 200**:
```json
{
  "id": "uuid",
  "name": "string",
  "document": "string",
  "documentNormalized": "string",
  "phone": "string | null",
  "email": "string | null",
  "birthDate": "string | null",
  "postalCode": "string | null",
  "address": "string | null",
  "addressNumber": "string | null",
  "addressComplement": "string | null",
  "neighborhood": "string | null",
  "city": "string | null",
  "state": "string | null",
  "planVersionId": "uuid | null",
  "paymentMethod": "CREDIT_CARD | BOLETO | null",
  "status": "string",
  "sellerId": "uuid",
  "sellerName": "string",
  "cancelReason": "string | null",
  "cancelledBy": "string | null",
  "cancelledAt": "string | null",
  "asaasCustomerId": "string | null",
  "dependents": [
    {
      "id": "uuid",
      "name": "string",
      "document": "string (masked)"
    }
  ],
  "sale": {
    "id": "uuid",
    "status": "string",
    "totalValue": "number"
  } | null,
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

---

## PATCH /api/opportunities/:id

Update opportunity data.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Request**:
```json
{
  "name": "string (optional)",
  "document": "string (optional, validates uniqueness)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "birthDate": "string (optional, YYYY-MM-DD)",
  "postalCode": "string (optional)",
  "address": "string (optional)",
  "addressNumber": "string (optional)",
  "addressComplement": "string (optional)",
  "neighborhood": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "planVersionId": "uuid (optional)",
  "paymentMethod": "CREDIT_CARD | BOLETO (optional)"
}
```

**Response 200**: Updated opportunity object

**Errors**: 409 Cannot edit converted or cancelled opportunities

---

## POST /api/opportunities/:id/dependents

Add a dependent to the opportunity.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Request**:
```json
{
  "name": "string (required)",
  "document": "string (required, CPF)"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "document": "string (masked)",
  "opportunityId": "uuid"
}
```

**Errors**: 409 Dependent already exists in opportunity, 409 Document already exists in unit

---

## DELETE /api/opportunities/:id/dependents/:dependentId

Remove a dependent from the opportunity.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Response 200**: `null`

---

## POST /api/opportunities/:id/cancel

Cancel the opportunity.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Request**:
```json
{
  "reason": "string (required, min 20 chars)"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "status": "cancelada",
  "cancelReason": "string",
  "cancelledAt": "string (ISO 8601)",
  "cancelledBy": "uuid",
  "saleStatus": "cancelled_before_payment | null"
}
```

**Errors**: 409 Cannot cancel already converted or cancelled opportunity, 400 Reason too short

---

## POST /api/opportunities/:id/generate-checkout

Generate checkout or invoice (boleto).

**Roles**: Representante (own), Gerente (team), Admin (all)

**Request**:
```json
{
  "planVersionId": "uuid (required)",
  "paymentMethod": "CREDIT_CARD | BOLETO (required)"
}
```

**Response 200** (Credit Card):
```json
{
  "saleId": "uuid",
  "status": "pending_payment",
  "checkoutUrl": "string (Asaas checkout URL)",
  "totalValue": "number",
  "calculationMemory": "object"
}
```

**Response 200** (Boleto):
```json
{
  "saleId": "uuid",
  "status": "pending_payment",
  "bankSlipUrl": "string (Asaas boleto URL)",
  "dueDate": "string (YYYY-MM-DD)",
  "totalValue": "number",
  "calculationMemory": "object"
}
```

**Errors**: 400 Missing required data (check FR-021 fields), 400 Invalid plan version, 409 Opportunity not in valid state

---

## GET /api/opportunities/:id/validate-checkout

Check if all required data is filled for checkout generation.

**Roles**: Representante (own), Gerente (team), Admin (all)

**Response 200**:
```json
{
  "canGenerate": "boolean",
  "missingFields": ["string"],
  "planSelected": "boolean",
  "paymentMethodSelected": "boolean"
}
```
