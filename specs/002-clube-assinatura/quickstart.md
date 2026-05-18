# Quickstart: Clube de Assinatura Multitenant

**Feature**: 002-clube-assinatura  
**Date**: 2026-05-17

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ running locally
- Asaas sandbox account (free — https://sandbox.asaas.com)

## Development Setup

### 1. Clone and install dependencies

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm install

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
```

### 2. Configure Asaas sandbox

Create a free account at https://sandbox.asaas.com, then add your sandbox API key to `.env`:

```env
# backend/.env
ASAAS_SANDBOX=true
ASAAS_API_KEY=your_sandbox_api_key_here
```

### 3. Database setup

```bash
cd backend
npm run migration:run    # Apply all migrations
npm run seed             # Create default Super Admin user
```

Default credentials: `suporte@wizer.digital` / `Foco@ia8992!`

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend
npm run start:dev        # http://localhost:4003

# Terminal 2 — Frontend
cd frontend
npm run dev              # http://localhost:4002
```

## First Steps

### 1. Create a unit (tenant)

Login as Super Admin at `http://localhost:4002/admin/login`. Go to "Unidades" and create a new unit.

### 2. Configure Asaas webhook for the unit

In the Super Admin panel, configure the unit's Asaas API key. Then register the webhook URL.

### 3. Login as unit admin

Switch to tenant login at `http://localhost:4002/login`. Create team members (Gerentes, Representantes).

### 4. Create your first plan

As Super Admin, go to "Planos" and create a plan:
1. Fill plan metadata (name, type PF/PJ)
2. Configure pricing (base value, dependent rules)
3. Publish

### 5. Create an opportunity

As a Representante, go to "Oportunidades" and create one with name + CPF. Fill in the required data, select the plan, and generate checkout.

### 6. Simulate payment

Use Asaas sandbox test cards:
- Credit card: `4111 1111 1111 1111`, any future date, any CVV
- Boleto: mark as paid in Asaas sandbox dashboard

The webhook will trigger, converting the opportunity into clients.

## Key Commands

| Command | Where | Purpose |
|---------|-------|---------|
| `npm run start:dev` | backend | Start NestJS dev server |
| `npm run dev` | frontend | Start Next.js dev server |
| `npm run migration:generate -- database/migrations/Name` | backend | Generate migration from entity changes |
| `npm run migration:run` | backend | Apply pending migrations |
| `npm run migration:revert` | backend | Roll back last migration |
| `npm run seed` | backend | Insert dev seed data |
| `npm run lint` | backend / frontend | ESLint check |
| `npm run typecheck` | backend / frontend | TypeScript check |

## Architecture Notes

- **Backend modules**: `backend/src/modules/<domain>/` — controller, service, entity, dto
- **Frontend pages**: `frontend/src/app/(dashboard)/` — App Router page components
- **Multi-tenancy**: All entities use `tenant_id` column. `x-tenant-id` header on every request
- **Migrations**: Always run `npm run migration:run` after pulling new entity changes
- **State machines**: Status transitions validated in service layer (see data-model.md)
- **Webhooks**: Endpoint at `/api/webhooks/asaas` — idempotent via `webhook_events` table

## Testing

```bash
# Backend tests
cd backend
npm test                 # Unit tests
npm run test:e2e         # E2E tests

# Frontend tests
cd frontend
npm test                 # Component tests
```

## Troubleshooting

- **DB password with `@`**: URL-encode as `%40` in `DATABASE_URL`
- **Asaas 401 errors**: Verify API key is correct and sandbox/production mode matches
- **Webhook not received**: Check Asaas webhook configuration in sandbox dashboard
- **CPF/CNPJ duplicate**: Check `document_registry` table for existing records
- **TypeORM errors**: Ensure `synchronize: false` and run migrations after entity changes
