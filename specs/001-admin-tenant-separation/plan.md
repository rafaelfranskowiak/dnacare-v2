# Implementation Plan: Platform Admin vs Tenant User Separation

**Branch**: `001-admin-tenant-separation` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-admin-tenant-separation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Separate platform administrators from regular tenant users by adding an
`is_platform_admin` flag on users and creating a `tenant_users` join table
that links regular users to tenants. Platform admins bypass tenant access
checks; regular users are restricted to tenants where they have an active
link. No "global tenant" or `super_admin` tenant role is created.

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js 20  
**Primary Dependencies**: NestJS 10, TypeORM 0.3, PostgreSQL, Next.js 14  
**Storage**: PostgreSQL  
**Testing**: Jest (backend)  
**Target Platform**: Linux server (Docker)  
**Project Type**: web-service (NestJS backend) + web-app (Next.js frontend)  
**Performance Goals**: Access control check adds <50ms overhead per request  
**Constraints**: Multi-tenancy isolation must never be bypassed; tenant access
logic must be at middleware/interceptor level, consistent with existing
`TenantMiddleware` pattern  
**Scale/Scope**: Initial multi-tenancy with platform admin + regular users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Violation? |
|-----------|-----------|------------|
| I. Multi-Tenancy by Design | Feature formalizes admin vs tenant user separation, strengthening tenant isolation | ✅ None |
| II. Migration-Driven Schema | New `is_platform_admin` column + `tenant_users` table require a generated migration | ✅ None |
| III. API Validation & Type Safety | DTOs will use `class-validator` with `ValidationPipe` | ✅ None |
| IV. Security by Default | Access control is the core of this feature — authorization enforced per-route | ✅ None |
| V. Clean Module Architecture | New entity/service fits in existing `modules/tenant/` domain | ✅ None |

All gates pass. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-tenant-separation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       ├── tenant/
│       │   ├── tenant-user.entity.ts        (new)
│       │   ├── tenant-user.service.ts       (new)
│       │   └── tenant-user.controller.ts    (new)
│       └── users/
│           └── user.entity.ts               (modified: add is_platform_admin)
├── database/
│   └── migrations/
│       └── <timestamp>-AddPlatformAdminAndTenantUsers.ts  (new migration)

frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── users/
│   │   │       └── page.tsx                (new: manage tenant_users)
│   │   └── dashboard/
│   │       └── page.tsx                    (modified: platform admin badge)
│   └── lib/
│       └── api.ts                          (modified: admin-aware headers)
```

**Structure Decision**: Web application with `backend/` + `frontend/` split
as detected in the repository. Backend follows NestJS module conventions
per Constitution principle V. TenantUser entity lives in the existing
`modules/tenant/` domain since it represents a tenant-to-user relationship.

## Complexity Tracking

No Constitution violations, so no complexity justification required.
