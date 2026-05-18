# API Contracts: Subscriptions

**Base URL**: `/api/subscriptions`  
**Roles**: Admin (all unit), Gerente (team)  
**Authentication**: JWT required on all endpoints

---

## GET /api/subscriptions

List subscriptions with filters.

**Query Params**:
- `status`: ativa | inadimplente | inativa | cancelamento_pendente
- `planId`: uuid
- `page`: number (default 1)
- `limit`: number (default 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "clientName": "string",
      "planName": "string",
      "recurringValue": "number",
      "status": "string",
      "startDate": "string (YYYY-MM-DD)",
      "asaasSubscriptionId": "string | null"
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

## GET /api/subscriptions/:id

Get subscription details.

**Response 200**:
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "clientName": "string",
  "saleId": "uuid",
  "planId": "uuid",
  "planVersionId": "uuid",
  "planName": "string",
  "recurringValue": "number",
  "dependentRule": "string",
  "dependentCount": "number",
  "status": "string",
  "startDate": "string (YYYY-MM-DD)",
  "cancelReason": "string | null",
  "cancelledBy": "string | null",
  "cancelledAt": "string | null",
  "asaasSubscriptionId": "string | null",
  "createdAt": "string (ISO 8601)"
}
```

---

## GET /api/subscriptions/:id/payments

Get payment history for this subscription from Asaas.

**Response 200**:
```json
{
  "data": [
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
