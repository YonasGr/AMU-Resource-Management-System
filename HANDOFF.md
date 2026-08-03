# University ERP — Developer Handoff

**Project**: Inventory, Store, Asset and Workflow Management System for Arba Minch University
**Status as of this document**: Phases 0–5 of 9 complete and tested end-to-end. Phase 6 not started.
**Audience**: any developer or AI tool picking this up next.

Read this whole document before touching code. The business rules section especially — several design decisions here aren't obvious from the code alone and exist because of a real bug we hit and fixed.

---

## 1. What this system is

A modular ERP for a university where **every college, department, office, and directorate can have its own store**, and **every inventory-affecting action must go through a request → approval → execution → audit trail**, never a direct edit. That last rule is the spine of the whole system — see section 5.

Full original spec: `docs/build-plan.md` in this repo (or ask whoever has the original project brief).

---

## 2. Tech stack

- **Backend**: NestJS + TypeScript, Prisma ORM, PostgreSQL, JWT auth (access + refresh tokens), Swagger at `/api/docs`
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, TanStack Query, Zustand, React Router, React Hook Form + Zod
- **Infra**: Docker Compose (postgres, redis, backend, frontend, nginx reverse proxy). Redis is provisioned but **not yet used for anything** (BullMQ background jobs are a stack decision from the original spec, not yet needed by any built feature).
- **Monorepo**: pnpm workspaces, `backend/` and `frontend/` as separate packages.

### Running it
```bash
docker compose up --build
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev --name <whatever>
docker compose exec backend pnpm prisma:seed
```
Frontend: `http://localhost:5173`. Backend/Swagger: `http://localhost:3000/api/docs`. Via nginx: `http://localhost:8080`.

**Known environment gotchas** (already hit and fixed, don't re-debug these):
- Inside Docker Compose, services reach each other by **service name** (`postgres`, `redis`, `backend`), never `localhost` — `backend/.env`'s `DATABASE_URL`/`REDIS_HOST` and `frontend/vite.config.ts`'s proxy target both depend on this.
- `backend/.dockerignore` and `frontend/.dockerignore` **must** exclude `node_modules` — without it, a stale host-installed `node_modules` gets copied over the container's freshly-installed one during `COPY . .`, silently breaking things that look like they installed fine.
- `backend/package.json` has a `pnpm.onlyBuiltDependencies` allowlist (`prisma`, `@prisma/client`, `@prisma/engines`, `argon2`, `msgpackr-extract`, `@nestjs/core`) — pnpm v10 skips postinstall scripts by default, and Prisma's CLI genuinely won't work without this.
- After any `schema.prisma` change: `pnpm prisma:generate` **then** `pnpm prisma migrate dev`, in that order, or TypeScript won't see the new Prisma types.

---

## 3. Login / test accounts

Seed script (`backend/prisma/seed.ts`) creates:

| Account | Password | Role | Scope |
|---|---|---|---|
| `admin@amu.edu.et` | `ChangeMe123!` | SYSTEM_ADMINISTRATOR | GLOBAL (sees/does everything) |
| `wftest.depthead@amu.edu.et` | `ChangeMe123!` | DEPARTMENT_HEAD | ORGANIZATION → CS Department |
| `wftest.requester@amu.edu.et` | `ChangeMe123!` | REQUESTER | ORGANIZATION → CS Department |
| `wftest.sourcemanager@amu.edu.et` | `ChangeMe123!` | STORE_MANAGER | STORE → Workflow Test Source Store |
| `wftest.destmanager@amu.edu.et` | `ChangeMe123!` | STORE_MANAGER | STORE → Workflow Test Destination Store |

**Change these before any real deployment.** They exist purely so the Transfer Request scenario (see section 6) is testable without manually wiring up users every time.

Seeded org tree: Arba Minch University → College of Engineering (→ CS Dept, IT Dept), College of Medicine, Finance Office, Library, ICT Directorate, Administration Office.

Seeded stores: ICT Store, plus the two workflow-test stores above (and possibly a manually-created "CS Store" from early manual testing — check before assuming it's meaningful).

Seeded catalog: 6 categories (IT Equipment, Furniture, Stationery, Laboratory Equipment, Vehicles, Consumables), 5 items (Dell Laptop, HP Printer, A4 Paper, Projector, Office Chair).

---

## 4. What's built (Phases 0–5)

Each phase's backend module lives at `backend/src/modules/<name>/`. Frontend pages at `frontend/src/pages/<name>/`.

| Phase | Module | Backend | Frontend |
|---|---|---|---|
| 0 | Foundation | NestJS+Prisma+Swagger scaffold, Docker Compose | Vite+React scaffold |
| 1.1 | Organization | `organization/` — self-referencing org tree, cycle-prevention on re-parent | `pages/organization/OrgTreePage.tsx` — expandable tree, inline add-child |
| 1.2 | Auth | `auth/` — JWT access+refresh, argon2 hashing, refresh rotation, password reset (dev-only: token returned directly, no email yet) | `pages/LoginPage.tsx`, `store/auth.store.ts` (Zustand, persisted) |
| 1.3 | RBAC | `rbac/` — Role/Permission/UserRole, 3-tier scope (GLOBAL/ORGANIZATION/STORE), `AccessControlService` is the single source of truth for all authorization | `pages/rbac/RolesPermissionsPage.tsx` |
| 2.1 | Store | `store/` — scoped CRUD + **`GET /stores/directory`** (unscoped id/name/code, see section 5) | `pages/stores/StoreListPage.tsx`, `StoreDetailPage.tsx` |
| 2.2 | Item Catalog | `item-catalog/` — centralized catalog, categories + items, search | `pages/items/ItemCatalogPage.tsx` |
| 3 | Inventory Core | `inventory/` — `StoreInventory` + `InventoryMovement`. **`MovementService` is the only code allowed to write a quantity**, always inside a transaction with the movement row | `pages/inventory/InventoryDashboardPage.tsx` — stock + movement history tabs |
| 4 | Workflow Engine | `workflow/` — generic multi-step approval chains, 4 approver-resolution strategies, all built on top of `AccessControlService` (no separate auth system) | `pages/workflow/ApprovalsInboxPage.tsx` |
| 5 | Requests | `request/` — generic Request lifecycle (Draft→Submitted→Pending Approval→Approved→Completed/Rejected/Cancelled), hands off to Workflow Engine, executes the real action on final approval | `pages/requests/{RequestsListPage,NewRequestPage,RequestDetailPage}.tsx` |

**Only 2 of 7 request types are fully implemented**: `ITEM_REQUEST` and `TRANSFER_REQUEST`. `PURCHASE_REQUEST`, `DISPOSAL_REQUEST`, `BORROW_REQUEST` have workflow templates seeded already (see `WORKFLOW_TEMPLATES` in seed.ts) but no `RequestService` execution logic yet. `DISTRIBUTION_REQUEST` and `EXTERNAL_REQUEST` have neither.

---

## 5. Business rules that aren't obvious from the code

These are decisions baked into the architecture. Don't "fix" them without understanding why they're there.

### 5.1 No direct inventory writes, ever
`StoreInventory.quantity` is only ever changed inside `MovementService.applyMovement()`/`applyTransfer()`, always in the same DB transaction as the `InventoryMovement` row that justifies it. Even the seed script bootstraps stock this way (see `seedSampleInventory` in seed.ts) rather than a bare insert. **If you ever see code that does `prisma.storeInventory.update(...)` outside `movement.service.ts`, that's a bug.**

### 5.2 Two-part authorization: permission ≠ scope
`@RequirePermission('inventory.issue')` only checks *does this user hold this permission at all*. It does NOT check *at which store*. That's `AccessControlService.hasScopeAccess()`'s job, called separately inside the service layer. A Store Manager's `inventory.issue` permission is useless unless their `UserRole` scope also covers the specific store in question. Both checks are required, separately, every time.

### 5.3 Workflow-authorized execution bypasses the *individual* actor's scope — deliberately
This one bit us: `MovementService.applyTransfer()` used to check that the *calling user* had scope over **both** stores in a transfer. But no single person in a 3-step transfer chain (dept head → source manager → destination manager) ever has scope over both sides — the destination manager only manages the destination store. When their approval triggered execution, it 403'd internally and silently left the Request stuck at `APPROVED` instead of `COMPLETED`.

**Fix, and the rule going forward**: when a movement is triggered by `RequestService.execute()` (i.e., a fully-approved workflow), pass `authorizedByWorkflow: true`. This skips the personal-scope check, because **the completed multi-step approval chain is the authorization at that point — not whoever happened to click the last "approve."** Direct calls to `POST /inventory/movements/*` (a human acting outside any request) never set this flag and stay fully scope-checked. If you add new request types with execution logic, follow this same pattern — don't scope-check the executing user against stores/orgs unrelated to their own approval step.

### 5.4 The store "directory" vs. scoped store list — two different concerns
`GET /stores` is scoped (`store.view` permission + org/store scope) — it's for **managing** stores. `GET /stores/directory` is deliberately unscoped (any authenticated user, no permission check) — id/name/code only, no management data. It exists because **naming a store you don't manage is the entire point of creating a request**. A Store Manager or Requester who lacks `store.view` still needs to be able to pick "Central Library Store" from a dropdown when filing a transfer request.

**Anywhere you build a picker/dropdown for choosing a store in a create-request-type form, use `/stores/directory`, not `/stores`.** Anywhere you're building actual store management UI, use the scoped `/stores`. Same principle will likely apply to a future "pick an organization unit" picker if one's ever needed outside the Organization page itself.

**Related trap already hit**: don't auto-select `directory[0]` as a default selection anywhere — it's alphabetical/creation-order, not access-aware, and will frequently default to a store the current user has zero access to, causing a confusing silent-looking failure on whatever scoped endpoint reads that default. Require explicit selection instead (see `InventoryDashboardPage.tsx` for the pattern: blank default + placeholder option, only auto-select when there's exactly one option total).

### 5.5 A request's routing depends on the *requester's own organization*, not whoever's testing
`Request.organizationId` is set from `requester.organizationId` at creation time — this is what "requester's department head" workflow steps resolve against. If you submit a request as `admin` (home org: ICT Directorate) expecting it to route to a CS Department head, it won't — admin's own org doesn't match. Always create test requests as a user who actually belongs to the org you're trying to test routing for. `wftest.requester@amu.edu.et` exists specifically for this.

### 5.6 Org-scoped roles cascade down the tree; store-scoped roles don't cascade at all
A `DEPARTMENT_HEAD` (or any role) with `ORGANIZATION` scope on "College of Engineering" automatically covers every department under it — `AccessControlService.isOrgWithinScope()` walks the ancestor chain. A `STORE` scope is an exact match only; stores have no hierarchy to cascade through.

### 5.7 Soft-delete / deactivate, never hard-delete, for anything with history
Organization units, users, stores, items — deactivated via a `status` field, never actually deleted, because inventory movements, audit history, and workflow history all reference them and must stay intact. The only hard-delete in the system is `ItemCategory` (only allowed while empty) and custom (non-system) `Role`s.

### 5.8 React Query cache is not scoped by user
`queryClient.clear()` runs on every logout (`TopBar.tsx`) specifically because query keys like `['stores']`, `['my-pending-approvals']` aren't namespaced by user id. Without the clear, switching accounts in the same browser tab can briefly show the previous account's cached data. If you add new global-ish queries, either keep relying on the logout-clear, or namespace the key by user id if the data is sensitive enough to warrant it regardless of logout timing.

---

## 6. The two things everything else is tested against

If you're not sure whether a change broke something, these two flows are the load-bearing tests:

**Item Request**: create as any user with `request.create` → submit → Department Head approves → Store Manager approves → `MovementService` issues stock (`ISSUE`) → Request status `COMPLETED`.

**Transfer Request** ("CS needs 10 chairs", spec section 14, exactly as written): create as `wftest.requester` → submit → `wftest.depthead` approves (step 1: `ORG_ROLE_AT_CONTEXT_ORG`) → `wftest.sourcemanager` approves (step 2: `STORE_ROLE_AT_CONTEXT_STORE`, source) → `wftest.destmanager` approves (step 3: same, destination) → `applyTransfer()` fires with `authorizedByWorkflow: true` → both stores' `StoreInventory` update atomically, paired `TRANSFER_OUT`/`TRANSFER_IN` movement rows share a `referenceId` equal to the Request's own id → Request status `COMPLETED`.

If either of these breaks, something regressed. Re-run before merging anything that touches `workflow/`, `request/`, or `inventory/`.

---

## 7. Known issues / rough edges (not bugs, just incomplete)

- **A few create-forms still take raw UUIDs in text inputs** (assign-role, assign-store-manager) rather than a searchable picker. Deliberately deferred rather than building full search-select components for every form this early.
- **`RequestService.findAll()`'s non-global-user path is just an alias for `findMine()`** — a Department Head can't yet see "everything I could approve, across my department," only their own submitted requests + whatever shows in the Approvals inbox (which only shows the *current* pending step, not a browsable history of everything they've ever touched).
- **No email delivery anywhere yet.** Password reset returns the raw token directly in the API response (clearly commented as dev-only in `auth.service.ts`) instead of emailing it. Notification module (Phase 8) hasn't been built.
- **Redis/BullMQ are provisioned but unused.** No background jobs exist yet.
- **`RequestService.findOne()`'s access check is coarse**: requester-or-global-only. An eligible-approver-for-the-current-step should arguably also be able to view the request detail page directly (not just via the inbox), but that's not wired up.
- **Prisma is on 5.22.0; 7.9.1 is available.** Deliberately not upgraded mid-build to avoid an unplanned breaking-change debugging session. Worth doing as its own dedicated task, not as a drive-by change.
- One truly stuck test artifact may exist in the DB: an early manually-created Transfer Request (`admin` as requester) that hit the bug in 5.3 before it was fixed — its `WorkflowInstance` is permanently `APPROVED` with the `Request` stuck at `APPROVED` (never `COMPLETED`), and it can't be re-approved through the normal API since the workflow instance is already in a terminal state. Harmless; just don't mistake it for a live bug if you stumble on it while browsing `GET /requests?scope=all`.

---

## 8. What's left (Phases 6–9, not started)

Full detail in `docs/build-plan.md`. Summary:

- **Phase 6 — Procurement + Distribution**: `PURCHASE_REQUEST` execution logic (supplier info, central receiving via `PURCHASE_RECEIVE` movement), `DISTRIBUTION_REQUEST` (split one purchase across multiple departments, each confirms receipt — this is genuinely new: it's the first request type where "approval" and "execution" aren't 1:1, since distribution to N departments needs N confirmations).
- **Phase 7 — Assets, Borrowing, Disposal**: `Asset` model (serial/asset-tag tracking, hooks onto `Item.assetType === FIXED_ASSET` from Phase 2.2), `BORROW_REQUEST` execution (issue → track → return, workflow template already seeded), `DISPOSAL_REQUEST` execution (workflow template already seeded — 2 steps: store manager inspection, then university admin approval; needs a way to remove an asset from inventory permanently + generate a disposal record).
- **Phase 8 — Reporting, Notifications, Audit**: a real `AuditLog` (currently the workflow's `ApprovalHistory` + inventory's `InventoryMovement` cover a lot of this implicitly, but there's no unified cross-entity audit view yet), in-app notifications (nothing exists — no `Notification` model at all yet), report exports (PDF/Excel/CSV — nothing built).
- **Phase 9 — Hardening**: full RBAC endpoint audit, integration tests for the two DoD scenarios in section 6, production Dockerfile (currently dev-oriented — full `apk add` + `pnpm install` on every `--no-cache` build, no multi-stage build yet), the Prisma major-version upgrade, real email delivery, HTTPS/production nginx config.

---

## 9. Design patterns to keep following

- **Every new module**: Prisma schema addition → service (with scope checks via `AccessControlService`) → controller (`@RequirePermission` + Swagger `@ApiOperation`/`@ApiBearerAuth`) → module → register in `AppModule` → seed data if it needs test fixtures → frontend page(s) → nav entry in `Sidebar.tsx` → route in `main.tsx`.
- **New permissions**: add to `PERMISSION_KEYS` in seed.ts, grant to the roles that make sense in `ROLE_DEFINITIONS` — both re-sync automatically on every `pnpm prisma:seed` run (idempotent upsert + resync pattern, not insert-if-missing).
- **New workflow-driven request type**: add its template to `WORKFLOW_TEMPLATES` in seed.ts (reuse the 4 existing `ApproverResolutionType` strategies before inventing a 5th), add a `create<Type>Request` method + DTO to `RequestService`/`RequestController`, add its `contextData` shape to `buildContextData()`, add its execution logic to `execute()`. The `Request.details` JSON field doesn't need a schema change for a new type — only `RequestService` needs updating.
- **Any list/picker endpoint**: think about whether it's "for management" (scope-check it) or "for referencing in a request" (consider whether it needs a `/directory`-style unscoped variant, per section 5.4).
