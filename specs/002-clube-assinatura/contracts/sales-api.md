# API Contracts: Sales

**Base URL**: `/api/sales`  
**Roles**: Admin (all unit), Gerente (team), Representante (own)  
**Authentication**: JWT required on all endpoints

---

## GET /api/sales

List sales with filters.

**Query Params**:
- `status`: pending_payment | confirmed | cancelled_before_payment | failed | refunded
- `sellerId`: uuid
- `opportunityId`: uuid
- `planId`: uuid
- `dateFrom`: ISO 8601
- `dateTo`: ISO 8601
- `page`: number (default 1)
- `limit`: number (default 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "opportunityId": "uuid",
      "opportunityName": "string",
      "sellerName": "string",
      "planName": "string",
      "planVersionName": "string",
      "totalValue": "number",
      "paymentMethod": "CREDIT_CARD | BOLETO",
      "status": "string",
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

## GET /api/sales/:id

Get full sale details.

**Roles**: Admin (all), Gerente (team), Representante (own)

**Response 200**:
```json
{
  "id": "uuid",
  "opportunityId": "uuid",
  "sellerId": "uuid",
  "sellerName": "string",
  "teamId": "uuid | null",
  "planId": "uuid",
  "planVersionId": "uuid",
  "planName": "string",
  "planVersionName": "string",
  "planSnapshot": "object",
  "dependentCount": "number",
  "totalLives": "number",
  "baseValue": "number",
  "dependentsValue": "number",
  "admissionFee": "number",
  "subtotal": "number",
  "discount": "number",
  "totalValue": "number",
  "calculationMemory": "object",
  "paymentMethod": "CREDIT_CARD | BOLETO",
  "status": "string",
  "asaasCustomerId": "string",
  "asaasPaymentId": "string",
  "asaasCheckoutUrl": "string",
  "asaasBankSlipUrl": "string",
  "clientHolder": {
    "id": "uuid",
    "name": "string"
  } | null,
  "clientDependents": [
    {
      "id": "uuid",
      "name": "string"
    }
  ],
  "subscription": {
    "id": "uuid",
    "status": "string"
  } | null,
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

---

## GET /api/sales/:id/payments

Get payment history for this sale (from Asaas or local snapshots).

**Response 200**:
```json
{
  "data": [
    {
      "id": "string (Asaas payment ID)",
      "value": "number",
      "status": "PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED",
      "dueDate": "string (YYYY-MM-DD)",
      "paymentDate": "string (YYYY-MM-DD) | null",
      "billingType": "BOLETO | CREDIT_CARD",
      "bankSlipUrl": "string | null",
      "invoiceUrl": "string | null"
    }
  ]
}
```
