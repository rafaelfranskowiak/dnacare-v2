# API Contracts: Webhooks

**Base URL**: `/api/webhooks/asaas`  
**Authentication**: Asaas `asaas-access-token` header  
**Tenant**: Resolved from webhook URL (per-unit URL)  
**Note**: This is a public endpoint — NO JWT auth required. Secured via token + IP validation.

---

## POST /api/webhooks/asaas

Receive Asaas webhook events. Must return 200 quickly.

**Headers**:
- `asaas-access-token`: string (validate against configured token)
- No `x-tenant-id` required (tenant resolved from URL path or configured webhook)

**Request** (Asaas webhook payload):
```json
{
  "id": "string (evt_...)",
  "event": "PAYMENT_RECEIVED | PAYMENT_CONFIRMED | PAYMENT_OVERDUE | PAYMENT_DELETED | PAYMENT_REFUNDED | SUBSCRIPTION_INACTIVATED | SUBSCRIPTION_DELETED | CHECKOUT_PAID | ...",
  "dateCreated": "string (YYYY-MM-DD HH:mm:ss)",
  "payment": {
    "object": "payment",
    "id": "string (pay_...)",
    "customer": "string (cus_...)",
    "subscription": "string (sub_...) | null",
    "value": "number",
    "netValue": "number",
    "status": "string",
    "billingType": "BOLETO | CREDIT_CARD",
    "dueDate": "string (YYYY-MM-DD)",
    "paymentDate": "string (YYYY-MM-DD) | null",
    "invoiceUrl": "string"
  } | null,
  "subscription": {
    "object": "subscription",
    "id": "string (sub_...)",
    "customer": "string (cus_...)",
    "status": "ACTIVE | INACTIVE | EXPIRED",
    "value": "number",
    "cycle": "WEEKLY | BIWEEKLY | MONTHLY | ...",
    "nextDueDate": "string (YYYY-MM-DD)"
  } | null,
  "checkout": {
    "object": "checkout",
    "id": "string",
    "status": "ACTIVE | CANCELED | EXPIRED | PAID",
    "customer": "string (cus_...)"
  } | null
}
```

**Response 200**: `{ "received": true }`  (return immediately, processing may be async)

**Response 401**: Invalid `asaas-access-token`

**Processing logic**:

| Event | Action |
|-------|--------|
| `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` | 1. Check idempotency (asaas_event_id) → 2. Find sale by asaas_customer_id → 3. Confirm sale → 4. Convert opportunity → 5. Create holder + dependents → 6. Activate subscription |
| `PAYMENT_OVERDUE` | 1. Check idempotency → 2. Find subscription by payment.subscription → 3. Set subscription to `inadimplente` → 4. Set holder to `inadimplente` |
| `PAYMENT_DELETED` | 1. Check idempotency → 2. If sale is `pending_payment`, set to `failed` |
| `PAYMENT_REFUNDED` | 1. Check idempotency → 2. If sale is `confirmed`, set to `refunded` |
| `SUBSCRIPTION_INACTIVATED` | 1. Check idempotency → 2. Set subscription to `inativa` → 3. Set holder to `inativo` → 4. Set dependents to `vinculado_a_titular_inativo` |
| `SUBSCRIPTION_DELETED` | 1. Check idempotency → 2. Set subscription to `inativa` |
| `CHECKOUT_PAID` | 1. Check idempotency → 2. Find sale by checkout ID → 3. Same flow as PAYMENT_RECEIVED |
| `CHECKOUT_EXPIRED` / `CHECKOUT_CANCELED` | Log event, no status changes (opportunity stays in checkout_gerado) |

---

## POST /api/webhooks/asaas/configure/:tenantId

Configure webhook for a tenant's Asaas account.

**Roles**: Super Admin

**Request**:
```json
{
  "url": "string (webhook URL for this unit)",
  "email": "string (notification email)",
  "events": ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_DELETED", "CHECKOUT_PAID"]
}
```

**Response 200**:
```json
{
  "webhookId": "string (Asaas webhook config ID)",
  "url": "string",
  "authToken": "string (generated, stored for validation)"
}
```
