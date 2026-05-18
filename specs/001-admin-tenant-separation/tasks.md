---

description: "Task list for platform admin vs tenant user separation"
---

# Tasks: Platform Admin vs Tenant User Separation

**Input**: Design documents from `/specs/001-admin-tenant-separation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution requirement — new features MUST include
test tasks written before implementation.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/modules/<domain>/`
- **Frontend**: `frontend/src/`
- **Migrations**: `backend/database/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Verify TypeORM datasource in backend/src/database/datasource.ts
       is configured for migration generation

- [x] T002 [P] Create checklists directory structure in
       specs/001-admin-tenant-separation/checklists/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story
can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add `is_platform_admin` column (boolean, default false) to User
       entity in backend/src/modules/users/user.entity.ts

- [x] T004 [P] Create TenantUser entity with fields (id, tenantId, userId,
       roleId nullable, status default 'active') in
       backend/src/modules/tenant/tenant-user.entity.ts

- [x] T005 [P] Create TenantUserService with findByUserAndTenant(userId,
       tenantId) method in backend/src/modules/tenant/tenant-user.service.ts

- [x] T006 [P] Create TenantUser DTOs (CreateTenantUserDto, UpdateTenantUser-
       StatusDto) in backend/src/modules/tenant/dto/

- [x] T007 Generate TypeORM migration via `npm run migration:generate --`
       `database/migrations/AddPlatformAdminAndTenantUsers` from backend/

- [x] T008 Review generated migration in backend/database/migrations/ and
       apply via `npm run migration:run` from backend/

**Checkpoint**: Foundation ready — user story implementation can now begin
in parallel

---

## Phase 3: User Story 1 - Platform Admin Bypass (Priority: P1) MVP

**Goal**: Platform admin (is_platform_admin=true) can access any tenant's
resources without tenant_users records

**Independent Test**: Login as a platform admin, then make requests to
multiple different tenants. All requests succeed.

### Tests for User Story 1

- [ ] T009 [P] [US1] Contract test for admin login response includes
       is_platform_admin in backend/src/modules/auth/ (test file)

- [ ] T010 [P] [US1] Integration test: admin with is_platform_admin=true and
       no tenant_users can access any tenant's endpoint in
       backend/test/integration/ (test file)

### Implementation for User Story 1

- [x] T011 [US1] Update JwtStrategy.validate() to return is_platform_admin in
       backend/src/modules/auth/strategies/jwt.strategy.ts

- [x] T012 [US1] Update AuthService.login() to include is_platform_admin in
       the response user object in
       backend/src/modules/auth/auth.service.ts

- [x] T013 [US1] Create TenantAccessGuard in
       backend/src/modules/tenant/guards/tenant-access.guard.ts with admin
       bypass: if user.is_platform_admin → allow

- [x] T014 [US1] Register TenantAccessGuard in TenantModule and export it in
       backend/src/modules/tenant/tenant.module.ts

- [x] T015 [US1] Apply TenantAccessGuard to at least one existing protected
       route to validate the bypass works (e.g., a sample endpoint)

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - Tenant User Restriction (Priority: P1)

**Goal**: Regular users (is_platform_admin=false) can only access tenants
where they have an active tenant_users link

**Independent Test**: Create a regular user with a tenant_users link to
Tenant A. Verify access to Tenant A succeeds and access to Tenant B is
rejected with 403.

### Tests for User Story 2

- [ ] T016 [P] [US2] Contract test for 403 response when regular user
       accesses unlinked tenant in backend/test/integration/ (test file)

- [ ] T017 [P] [US2] Integration test for tenant_users status check:
       inactive link returns 403 in backend/test/integration/ (test file)

### Implementation for User Story 2

- [x] T018 [US2] Extend TenantAccessGuard with tenant_users check: if
       is_platform_admin is false, query TenantUserService to verify active
       link in backend/src/modules/tenant/guards/tenant-access.guard.ts

- [x] T019 [US2] Wire TenantUser entity and TenantUserService into
       TenantModule in backend/src/modules/tenant/tenant.module.ts

- [x] T020 [US2] Apply TenantAccessGuard to remaining protected routes in
       existing controllers

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 5: User Story 3 - TenantUser CRUD (Priority: P2)

**Goal**: Platform admin can create, read, update status, and delete
tenant_users records via API

**Independent Test**: Use the API to create a tenant_users link, verify the
user gains access, then disable/delete the link and verify access is revoked.

### Tests for User Story 3

- [ ] T021 [P] [US3] Contract test for POST /api/tenant-users creates link
       successfully in backend/test/integration/ (test file)

- [ ] T022 [P] [US3] Integration test for PATCH /api/tenant-users/:id sets
       status inactive and user loses access in backend/test/integration/
       (test file)

- [ ] T023 [P] [US3] Integration test for DELETE /api/tenant-users/:id
       removes link and user loses access in backend/test/integration/
       (test file)

### Implementation for User Story 3

- [x] T024 [P] [US3] Create TenantUserController with GET (list) endpoint in
       backend/src/modules/tenant/tenant-user.controller.ts

- [x] T025 [P] [US3] Create TenantUserController POST (create) endpoint with
       duplicate check (409 Conflict) in
       backend/src/modules/tenant/tenant-user.controller.ts

- [x] T026 [US3] Create TenantUserController PATCH (update status) endpoint
       in backend/src/modules/tenant/tenant-user.controller.ts

- [x] T027 [US3] Create TenantUserController DELETE endpoint in
       backend/src/modules/tenant/tenant-user.controller.ts

- [x] T028 [US3] Register TenantUserController in TenantModule and apply
       JwtAuthGuard + platform admin check in
       backend/src/modules/tenant/tenant.module.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T029 [P] Update frontend lib/auth.ts to surface is_platform_admin from
       login response in frontend/src/lib/auth.ts

- [x] T030 [P] Update frontend lib/api.ts to send is_platform_admin context
       where needed in frontend/src/lib/api.ts

- [x] T031 [P] Update seed script to create a platform admin user
       (is_platform_admin: true) in backend/database/seeds/seed.ts

- [x] T032 [P] Add is_platform_admin to JWT payload so it's available
       without a DB query in backend/src/modules/auth/auth.service.ts

- [x] T033 Run lint and typecheck on both backend/ and frontend/ to verify
       all changes pass quality gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all
  user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion — can run
  in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion AND US1
  (needs TenantAccessGuard) AND US2 (needs TenantUserService query logic)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on
  other stories
- **User Story 2 (P1)**: Can start after Foundational — No dependencies on
  other stories
- **User Story 3 (P2)**: Depends on US1 (TenantAccessGuard) and US2
  (TenantUserService query logic)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001 and T002 can run in parallel (Setup phase)
- T003, T004, T005, T006 can run in parallel (Foundational phase)
- US1 and US2 can run in parallel (different features, same guard file)
  — except T018 which modifies the same guard as T013, so those must be
  sequential
- T009 and T010 (US1 tests) can run in parallel
- T016 and T017 (US2 tests) can run in parallel
- T021, T022, T023 (US3 tests) can run in parallel
- T024 and T025 (US3 controllers) can run in parallel
- T029, T030, T031, T032 (Polish) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for admin login response in auth module"
Task: "Integration test for admin cross-tenant access"

# Launch all implementation for User Story 1 together:
Task: "Update JwtStrategy.validate()"
Task: "Update AuthService.login()"
Task: "Create TenantAccessGuard"
```

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Contract test for 403 on unlinked tenant"
Task: "Integration test for inactive status check"

# Launch all implementation for User Story 2 together:
Task: "Extend TenantAccessGuard with tenant_users check"
Task: "Wire TenantUser entity and service into TenantModule"
Task: "Apply TenantAccessGuard to remaining routes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test platform admin bypass independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Platform admin bypass → Deploy/Demo (MVP!)
3. Add User Story 2 → Tenant user restriction → Deploy/Demo
4. Add User Story 3 → TenantUser CRUD management → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that
  break independence
