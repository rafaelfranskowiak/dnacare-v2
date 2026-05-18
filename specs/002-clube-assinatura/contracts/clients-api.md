# API Contracts: Clients

**Base URL**: `/api/clients`  
**Roles**: Admin (all unit), Gerente (team), Representante (own)  
**Authentication**: JWT required on all endpoints

---

## GET /api/clients

List clients with filters.

**Query Params**:
- `type`: holder | dependent
- `status`: ativo | inativo | inadimplente | cancelamento_pendente | vinculado_a_titular_inativo
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
      "type": "holder | dependent",
      "status": "string",
      "holderName": "string | null (only for dependents)",
      "dependentCount": "number | null (only for holders)",
      "sellerName": "string",
      "subscriptionStatus": "string | null (only for holders)",
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

## GET /api/clients/:id

Get client details — works for both holders and dependents.

**Roles**: Admin (all), Gerente (team), Representante (own)

**Response 200 (Holder)**:
```json
{
  "id": "uuid",
  "type": "holder",
  "name": "string",
  "document": "string",
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
  "status": "string",
  "opportunityId": "uuid",
  "sellerId": "uuid",
  "sellerName": "string",
  "asaasCustomerId": "string | null",
  "subscription": {
    "id": "uuid",
    "status": "string",
    "planName": "string",
    "recurringValue": "number",
    "startDate": "string (YYYY-MM-DD)",
    "asaasSubscriptionId": "string | null"
  },
  "dependents": [
    {
      "id": "uuid",
      "name": "string",
      "document": "string (masked)",
      "status": "string"
    }
  ],
  "createdAt": "string (ISO 8601)"
}
```

**Response 200 (Dependent)**:
```json
{
  "id": "uuid",
  "type": "dependent",
  "name": "string",
  "document": "string",
  "phone": "string | null",
  "email": "string | null",
  "birthDate": "string | null",
  "status": "string",
  "holderId": "uuid",
  "holderName": "string",
  "holderStatus": "string",
  "opportunityId": "uuid",
  "sellerId": "uuid",
  "sellerName": "string",
  "createdAt": "string (ISO 8601)"
}
```

---

## PATCH /api/clients/:id

Update client data (holder or dependent).

**Roles**: Admin (all), Gerente (team), Representante (own)

**Request**:
```json
{
  "phone": "string (optional)",
  "email": "string (optional)",
  "birthDate": "string (optional, YYYY-MM-DD)",
  "postalCode": "string (optional)",
  "address": "string (optional)",
  "addressNumber": "string (optional)",
  "addressComplement": "string (optional)",
  "neighborhood": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)"
}
```

**Response 200**: Updated client object

---

## GET /api/clients/:id/financial

Get financial data for a holder — fetched in real-time from Asaas.

**Roles**: Admin (all), Gerente (team)

**Response 200**:
```json
{
  "totalReceived": "number",
  "totalDue": "number",
  "overdueAmount": "number",
  "payments": [
    {
      "id": "string (Asaas payment ID)",
      "value": "number",
      "status": "string",
      "dueDate": "string (YYYY-MM-DD)",
      "paymentDate": "string (YYYY-MM-DD) | null",
      "billingType": "BOLETO | CREDIT_CARD",
      "bankSlipUrl": "string | null",
      "invoiceUrl": "string | null"
    }
  ]
}
```

---

## POST /api/clients/:id/cancel-plan

Cancel the holder's plan.

**Roles**: Admin (all), Gerente (team)

**Request**:
```json
{
  "reason": "string (required, min 20 chars)"
}
```

**Response 200**:
```json
{
  "clientStatus": "cancelamento_pendente | inativo",
  "subscriptionStatus": "cancelamento_pendente | inativa",
  "dependentsStatus": "vinculado_a_titular_inativo",
  "asaasCancellation": {
    "success": "boolean",
    "error": "string | null"
  }
}
```

---

## POST /api/clients/:id/settle-debts

Quitar débitos — consolidate overdue payments and generate settlement charge.

**Roles**: Admin (all)

**Response 200**:
```json
{
  "consolidatedValue": "number",
  "settlementPaymentId": "string (Asaas payment ID)",
  "settlementUrl": "string (boleto/checkout URL)",
  "debtsConsolidated": "number (count of overdue payments)"
}
```

**Errors**: 400 No overdue payments found
