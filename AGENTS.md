# base-multi-tenancy — AGENTS.md

## Stack
- **Backend:** NestJS 10 + TypeORM 0.3 + PostgreSQL (`backend/`)
- **Frontend:** Next.js 14 App Router + Tailwind (`frontend/`)
- **Auth:** JWT (passport-jwt), bcrypt — login only, no signup
- **Multi-tenancy:** `x-tenant-id` header on every request; `tenantId` column on entities

## Dev setup
```bash
# Backend
cd backend
cp .env.example .env        # ajustar DATABASE_URL, JWT_SECRET
npm install
npm run migration:run       # apply schema
npm run seed                # creates suporte@wizer.digital / Foco@ia8992! (tenant: default)
npm run start:dev           # http://localhost:4003

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:4002
```

## Key commands
| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (both apps) |
| `npm run lint` | ESLint (both apps) |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:generate -- database/migrations/Name` | Generate migration from entity changes |
| `npm run migration:create -- database/migrations/Name` | Create empty migration file |
| `npm run migration:revert` | Roll back last migration |
| `npm run seed` | Insert dev seed user (tenant: default) |
| `npm run seed:revert` | Delete seed data |
| `npm run start:worker` | Run transcode worker (standalone, NOT NestJS) |

Pre-commit order: `npm run lint && npm run typecheck`

## Architecture
- **Modules** in `backend/src/modules/<domain>/` — controller, service, entity, dto
- **Migrations** in `backend/database/migrations/` (CLI reads `backend/src/database/datasource.ts`)
- **Seeds** in `backend/database/seeds/seed.ts`
- **Worker** in `backend/workers/transcode.worker.ts` — standalone ts-node, no NestJS
- **API prefix:** `/api` (set in `main.ts`)
- **Auth modules:** auth, users, tenant (registered in `app.module.ts`)
- **No tests yet** — no `*.spec.ts` files exist

## Multi-tenancy
1. `TenantMiddleware` extracts `x-tenant-id` (skips check for `/api/auth/login`)
2. Login validates user.tenantId matches `x-tenant-id`
3. All entities use `@Column({ name: 'tenant_id' })` — queries must filter by tenantId
4. `@Tenant()` param decorator injects tenantId in controllers
5. `TenantQueryInterceptor` auto-filters GET queries by tenantId

## Entities
- **Tenant** (`tenants`): id (uuid), slug (unique), name
- **User** (`users`): id (uuid), email (unique), password (bcrypt), name, tenantId, active

## Frontend conventions
- JWT in `localStorage('accessToken')`; `src/lib/api.ts` auto-injects Bearer + `x-tenant-id`, redirects on 401
- Auth guard in dashboard pages: check token in useEffect, redirect to `/login`
- Design system: custom Tailwind tokens `surface/*`, `ink/*`, `edge/*`, `brand`, `success/warning/danger/info` in `tailwind.config.ts` + CSS vars in `globals.css`
- Sidebar collapses to icon-only (`w-64`/`w-16` toggle), same bg as canvas with `border-r`

## Backend quirks
- `synchronize: false` — always generate + run migrations explicitly
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` — rejects unknown props globally
- DB password with `@` → URL-encode as `%40` in `DATABASE_URL`
- Config loaded via `@nestjs/config` from `backend/src/config/` (database + s3)
- No AuthGuard registered globally — each route must use `@UseGuards(AuthGuard('jwt'))` or similar

## Design system (`.interface-design/system.md`)
- Depth: borders + `shadow-sm` (no layered shadows)
- Sidebar: same bg as canvas, `border-r` only
- Spacing: Tailwind default scale (4px base)
- Typography: system font stack (no custom font)

<!-- SPECKIT START -->
Active feature plan: `specs/001-admin-tenant-separation/plan.md`
Spec: `specs/001-admin-tenant-separation/spec.md`
Data model: `specs/001-admin-tenant-separation/data-model.md`
Contracts: `specs/001-admin-tenant-separation/contracts/`
<!-- SPECKIT END -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **base-multi-tenancy** (377 symbols, 551 relationships, 1 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/base-multi-tenancy/context` | Codebase overview, check index freshness |
| `gitnexus://repo/base-multi-tenancy/clusters` | All functional areas |
| `gitnexus://repo/base-multi-tenancy/processes` | All execution flows |
| `gitnexus://repo/base-multi-tenancy/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
