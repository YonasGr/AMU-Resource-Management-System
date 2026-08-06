# University ERP — Developer Handoff

**Project**: Inventory, Store, Asset and Workflow Management System for Arba Minch University
**Status as of this document**: Phases 0–8 of 9 complete and fully built end-to-end. Phase 9 (Hardening & Integration Testing) remaining.
**Audience**: any developer or AI tool picking this up next.

Read this whole document before touching code. The business rules section especially — several design decisions here aren't obvious from the code alone and exist because of a real bug we hit and fixed.

---

## 1. What this system is

A modular ERP for a university where **every college, department, office, and directorate can have its own store**, and **every inventory-affecting action must go through a request → approval → execution → audit trail**, never a direct edit. That last rule is the spine of the whole system — see section 5.

Full original spec: `docs/build-plan.md` in this repo.

---

## 2. Tech stack

- **Backend**: NestJS + TypeScript, Prisma ORM, PostgreSQL, JWT auth (access + refresh tokens), Swagger at `/api/docs`
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, TanStack Query, Zustand, React Router, React Hook Form + Zod
- **Infra**: Docker Compose (postgres, redis, backend, frontend, nginx reverse proxy).
- **Monorepo**: pnpm workspaces, `backend/` and `frontend/` as separate packages.

### Running it
```bash
docker compose up --build
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev --name <whatever>
docker compose exec backend pnpm prisma:seed
```
Frontend: `http://localhost:5173`. Backend/Swagger: `http://localhost:3000/api/docs`. Via nginx: `http://localhost:8080`.

**Known environment gotchas**:
- Inside Docker Compose, services reach each other by **service name** (`postgres`, `redis`, `backend`), never `localhost`.
- `backend/.dockerignore` and `frontend/.dockerignore` **must** exclude `node_modules`.
- `backend/package.json` has a `pnpm.onlyBuiltDependencies` allowlist (`prisma`, `@prisma/client`, `@prisma/engines`, `argon2`, `msgpackr-extract`, `@nestjs/core`).
- After any `schema.prisma` change: `pnpm prisma:generate` **then** `pnpm prisma migrate dev`, in that order.

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

Seeded org tree: Arba Minch University → College of Engineering (→ CS Dept, IT Dept), College of Medicine, Finance Office, Library, ICT Directorate, Administration Office.

Seeded stores: ICT Store, plus the two workflow-test stores.

Seeded catalog: 6 categories (IT Equipment, Furniture, Stationery, Laboratory Equipment, Vehicles, Consumables), 5 items (Dell Laptop, HP Printer, A4 Paper, Projector, Office Chair).

---

## 4. What's built (Phases 0–8)

Each phase's backend module lives at `backend/src/modules/<name>/`. Frontend pages at `frontend/src/pages/<name>/`.

| Phase | Module | Backend | Frontend |
|---|---|---|---|
| 0 | Foundation | NestJS+Prisma+Swagger scaffold, Docker Compose | Vite+React scaffold |
| 1.1 | Organization | `organization/` — self-referencing org tree, cycle-prevention on re-parent | `pages/organization/OrgTreePage.tsx` |
| 1.2 | Auth | `auth/` — JWT access+refresh, argon2 hashing, refresh rotation, password reset | `pages/LoginPage.tsx`, `store/auth.store.ts` |
| 1.3 | RBAC | `rbac/` — Role/Permission/UserRole, 3-tier scope (GLOBAL/ORGANIZATION/STORE), `AccessControlService` | `pages/rbac/RolesPermissionsPage.tsx` |
| 2.1 | Store | `store/` — scoped CRUD + `GET /stores/directory` | `pages/stores/StoreListPage.tsx`, `StoreDetailPage.tsx` |
| 2.2 | Item Catalog | `item-catalog/` — centralized catalog, categories + items, search | `pages/items/ItemCatalogPage.tsx` |
| 3 | Inventory Core | `inventory/` — `StoreInventory` + `InventoryMovement`. `MovementService` is single writer | `pages/inventory/InventoryDashboardPage.tsx` |
| 4 | Workflow Engine | `workflow/` — generic multi-step approval chains, 4 approver-resolution strategies | `pages/workflow/ApprovalsInboxPage.tsx` |
| 5 | Requests | `request/` — generic Request lifecycle, hands off to Workflow Engine | `pages/requests/{RequestsListPage,NewRequestPage,RequestDetailPage}.tsx` |
| 6 | Procurement & Distribution | `procurement/` (PO, Goods Receipts, Suppliers) & `distribution/` (multi-allocation plans) | `pages/procurement/ProcurementPage.tsx`, `pages/distribution/DistributionPage.tsx` |
| 7 | Asset Management | `asset/` — Asset registry, borrowing custody, returns, inspections, disposal certificates, maintenance lifecycle | `pages/assets/AssetsPage.tsx` |
| 8 | Audit, Notifications, Reports | `audit/` (unified timeline), `notification/` (in-app inbox + bell), `reporting/` (8 reports + PDF/CSV export), `users/` | `pages/audit/AuditLogPage.tsx`, `pages/notifications/NotificationsPage.tsx`, `pages/reports/ReportsPage.tsx`, `pages/users/UsersPage.tsx`, `TopBar.tsx` bell badge |

All request types (`ITEM_REQUEST`, `TRANSFER_REQUEST`, `PURCHASE_REQUEST`, `DISPOSAL_REQUEST`, `BORROW_REQUEST`, `DISTRIBUTION_REQUEST`, `EXTERNAL_REQUEST`) are fully wired up in `RequestService.execute()`.

---

## 5. Business rules that aren't obvious from the code

### 5.1 No direct inventory writes, ever
`StoreInventory.quantity` is only ever changed inside `MovementService.applyMovement()`/`applyTransfer()`, always in the same DB transaction as the `InventoryMovement` row that justifies it.

### 5.2 Two-part authorization: permission ≠ scope
Permission check (`@RequirePermission`) and scope check (`AccessControlService.hasScopeAccess`) are both required, separately, every time.

### 5.3 Workflow-authorized execution bypasses individual actor scope
When a movement is triggered by `RequestService.execute()` (i.e. a fully-approved workflow), pass `authorizedByWorkflow: true` to skip individual scope checks.

### 5.4 The store "directory" vs. scoped store list
`GET /stores` is for store management. `GET /stores/directory` is for pickers/dropdowns in request forms.

---

## 6. What's left (Phase 9 — Hardening & Final Polish)

- **RBAC endpoint audit & integration tests** for all end-to-end scenarios.
- **Production Docker multi-stage build**.
- **Prisma major version upgrade**.
- **Real SMTP email integration** for password reset & email notifications.
