# API Contracts: Reports

**Base URL**: `/api/reports`  
**Roles**: Admin (own unit), Super Admin (global)  
**Authentication**: JWT required on all endpoints

---

## GET /api/reports/unit-dashboard

Get unit-level dashboard indicators.

**Roles**: Admin, Gerente

**Response 200**:
```json
{
  "period": {
    "from": "string (YYYY-MM-DD)",
    "to": "string (YYYY-MM-DD)"
  },
  "opportunities": {
    "total": "number",
    "aberta": "number",
    "checkoutGerado": "number",
    "convertida": "number",
    "cancelada": "number",
    "conversionRate": "number (percentage)"
  },
  "sales": {
    "pending": "number",
    "confirmed": "number",
    "cancelledBeforePayment": "number",
    "failed": "number",
    "totalValue": "number",
    "averageTicket": "number"
  },
  "clients": {
    "activeHolders": "number",
    "inactiveHolders": "number",
    "activeDependents": "number",
    "totalLives": "number",
    "delinquencyRate": "number (percentage)"
  },
  "performance": [
    {
      "sellerId": "uuid",
      "sellerName": "string",
      "opportunitiesCreated": "number",
      "salesConfirmed": "number",
      "totalValueSold": "number",
      "conversionRate": "number (percentage)"
    }
  ]
}
```

---

## GET /api/reports/global-dashboard

Super Admin global dashboard across all units.

**Roles**: Super Admin

**Response 200**:
```json
{
  "units": {
    "total": "number",
    "active": "number"
  },
  "aggregated": {
    "totalOpportunities": "number",
    "totalSales": "number",
    "totalRevenue": "number",
    "totalActiveLives": "number",
    "averageConversionRate": "number (percentage)",
    "averageDelinquencyRate": "number (percentage)"
  },
  "byPlan": [
    {
      "planId": "uuid",
      "planName": "string",
      "activeClients": "number",
      "totalRevenue": "number",
      "churnRate": "number (percentage)"
    }
  ],
  "byUnit": [
    {
      "tenantId": "uuid",
      "tenantName": "string",
      "activeClients": "number",
      "totalRevenue": "number",
      "conversionRate": "number (percentage)"
    }
  ]
}
```

---

## GET /api/reports/seller-performance

Get performance report by seller within a unit.

**Query Params**:
- `dateFrom`: YYYY-MM-DD
- `dateTo`: YYYY-MM-DD
- `teamId`: uuid (optional)

**Roles**: Admin, Gerente

**Response 200**:
```json
{
  "data": [
    {
      "sellerId": "uuid",
      "sellerName": "string",
      "teamName": "string",
      "opportunitiesCreated": "number",
      "checkoutsGenerated": "number",
      "salesConfirmed": "number",
      "salesValue": "number",
      "conversionRate": "number (percentage)",
      "cancellationsBySeller": "number"
    }
  ]
}
```

---

## GET /api/reports/plan-analytics

Get plan-level analytics.

**Query Params**: `planId`: uuid

**Roles**: Super Admin

**Response 200**:
```json
{
  "planId": "uuid",
  "planName": "string",
  "versions": [
    {
      "versionId": "uuid",
      "versionNumber": "number",
      "activeClients": "number",
      "totalRevenue": "number",
      "averageDependents": "number",
      "churnRate": "number (percentage)"
    }
  ],
  "totalActiveClients": "number",
  "totalRevenue": "number",
  "activeUnitsCount": "number"
}
```
