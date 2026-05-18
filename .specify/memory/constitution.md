<!-- SYNC IMPACT REPORT
Version change: (new) v0.0.0 → v1.0.0
Modified principles: N/A (first constitution)
Added sections:
  - I. Multi-Tenancy by Design (NON-NEGOTIABLE)
  - II. Migration-Driven Schema
  - III. API Validation & Type Safety
  - IV. Security by Default
  - V. Clean Module Architecture
  - Technology Stack & Design Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed (generic)
  - .specify/templates/spec-template.md ✅ no changes needed (generic)
  - .specify/templates/tasks-template.md ✅ no changes needed (generic)
  - .specify/templates/checklist-template.md ✅ no changes needed (generic)
  - .specify/extensions/git/commands/*.md ✅ no changes needed (generic git commands)
Follow-up TODOs: none
-->

# DNA Care v2 Constitution

## Core Principles

### I. Multi-Tenancy by Design (NON-NEGOTIABLE)

Multi-tenancy is the foundation of this project. Every entity MUST include a
`tenantId` column. The `x-tenant-id` header MUST be present on all API requests
except `/api/auth/login`. All queries MUST filter by tenantId — use the
`@Tenant()` decorator to inject tenantId in controllers and the
`TenantQueryInterceptor` for automatic GET filtering. Tenant isolation MUST
never be bypassed under any circumstance.

### II. Migration-Driven Schema

TypeORM `synchronize` MUST remain `false` at all times. Every schema change
MUST be generated as a TypeORM migration via `npm run migration:generate`,
reviewed, and then applied via `npm run migration:run`. Auto-syncing entities
to the database is FORBIDDEN. Migration files are stored in
`database/migrations/` and MUST NOT be edited after creation.

### III. API Validation & Type Safety

TypeScript strict mode MUST be enabled. The global `ValidationPipe` configured
in `main.ts` with `{ whitelist: true, forbidNonWhitelisted: true }` is MANDATORY
and MUST NOT be removed or weakened. All DTOs MUST use `class-validator`
decorators. The global pipe protects tenant boundary integrity by rejecting
unknown properties.

### IV. Security by Default

JWT authentication (`AuthGuard('jwt')`) MUST be applied explicitly to every
protected route — no global guard is registered. Passwords MUST be hashed with
bcrypt. CORS MUST restrict origins to `FRONTEND_URL` only. There is no public
signup endpoint; user provisioning is admin-only via seed script or direct
database. The login endpoint (`/api/auth/login`) is the sole unauthenticated
route.

### V. Clean Module Architecture

Backend modules follow the structure `modules/<domain>/` with standard files:
controller, service, entity, dto. Frontend follows Next.js 14 App Router
conventions — pages in `src/app/`, shared utilities in `src/lib/`. Standalone
workers (e.g., transcode worker) live in `workers/` and operate outside NestJS
dependency injection — they MUST NOT import NestJS modules. New dependencies
require justification and MUST NOT be added prematurely (YAGNI).

## Technology Stack & Design Constraints

The stack is locked and MUST NOT be changed without constitutional amendment:

- **Backend:** NestJS 10 + TypeORM 0.3 + PostgreSQL
- **Frontend:** Next.js 14 + Tailwind CSS + React 18
- **Auth:** JWT (passport-jwt) + bcrypt

Design system tokens (`surface/*`, `ink/*`, `edge/*`, `brand`,
`success/warning/danger/info`) are defined in `tailwind.config.ts` with
corresponding CSS vars in `globals.css`. Depth uses borders + `shadow-sm` only
(no layered shadows). The sidebar uses the canvas background with `border-r`
separation. Adding new major dependencies MUST be justified in the Complexity
Tracking section of the Implementation Plan.

## Development Workflow & Quality Gates

**Pre-commit gate:** `npm run lint && npm run typecheck` MUST pass in both
`backend/` and `frontend/` before every commit.

**Feature branches:** MUST follow speckit naming conventions
(`###-feature-name` or `YYYYMMDD-HHMMSS-feature-name`).

**Migrations:** generate → review → apply cycle MUST be followed. Migration
files MUST NOT be edited after generation.

**Testing:** No tests exist yet. New features MUST include contract and/or
integration tests written BEFORE implementation (test-first discipline).

## Governance

This Constitution supersedes all informal practices documented in README,
AGENTS.md, or any other file. Amendments require a documented proposal, team
review, and a migration plan. Versioning follows MAJOR.MINOR.PATCH:

- **MAJOR:** Backward-incompatible principle changes or removals
- **MINOR:** New principles or sections added
- **PATCH:** Clarifications, wording fixes, non-semantic refinements

The `AGENTS.md` file serves as the runtime development guidance document and
MUST be kept in sync with this Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14
