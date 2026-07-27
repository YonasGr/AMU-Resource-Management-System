# Arba Minch University Inventory, Store, Asset & Workflow Management System
## Master Build Plan & Execution Checklist

This document is the single source of truth for how we build this system. We will work through it **module by module, phase by phase** — nothing gets built out of order, because later modules (Requests, Workflow, Transfers) depend on earlier ones (Auth, Org, Stores, Inventory) being solid.

Each phase below ends with a **"Definition of Done"** — don't move to the next phase until it's satisfied. Each module has a checklist you can literally tick off as we go.

---

## 0. Working Agreement

- We build **one module at a time**, fully (schema → backend → API docs → frontend → basic tests) before moving to the next, unless a module is trivial enough to batch.
- Every module ends with: migrations run, Swagger updated, and a short manual test (via Swagger UI or Postman) proving it works.
- We do **not** skip Auth/RBAC/Org — everything else is built on top of data scoping from these three.
- I will flag any place where a decision from the original spec needs to be made more concrete (e.g., exact permission strings, exact workflow steps for a given request type) before coding it.

---

## Phase 0 — Foundation & Environment Setup

**Goal:** a working skeleton monorepo that runs locally, with CI-ready structure, before any business logic exists.

- [ ] Initialize monorepo structure (`/backend`, `/frontend`, `/docs`, `/infra`)
- [ ] Backend: NestJS project scaffold (TypeScript, ESLint, Prettier)
- [ ] Frontend: Vite + React + TypeScript scaffold
- [ ] Install & configure Tailwind CSS + shadcn/ui in frontend
- [ ] Set up pnpm workspaces
- [ ] PostgreSQL running via Docker Compose
- [ ] Redis running via Docker Compose
- [ ] Prisma installed, connected to Postgres, first empty migration
- [ ] Base Nginx reverse proxy config (dev mode ok for now)
- [ ] Winston/Pino logging configured in NestJS
- [ ] Swagger/OpenAPI wired up at `/api/docs`
- [ ] Global exception filter + standard API response format
- [ ] Environment config module (`.env` validation via class-validator or zod)
- [ ] Git repo initialized, `.gitignore`, initial commit, GitHub remote
- [ ] Jest test runner configured (backend)

**Definition of Done:** `docker-compose up` brings up API + DB + Redis + frontend dev server, Swagger loads, health-check endpoint returns 200.

---

## Phase 1 — Identity & Access Foundation

These three modules are the backbone every other module depends on. Build in this exact order.

### 1.1 Organization Module
- [ ] Prisma schema: `OrganizationUnit` (id, name, type, parent_id, status, timestamps)
- [ ] Self-referencing tree relationship + recursive query helper (get full subtree / full ancestry)
- [ ] CRUD API: create/update/deactivate org unit
- [ ] API: get org tree, get children, get ancestors
- [ ] Seed script: Arba Minch University sample tree (colleges → departments → offices)
- [ ] Frontend: org tree viewer (basic, admin-only)

### 1.2 Authentication Module
- [ ] Prisma schema: `User` (id, full_name, email, phone, password_hash, organization_id, status)
- [ ] Password hashing (argon2/bcrypt)
- [ ] Login endpoint → JWT access token + refresh token
- [ ] Refresh token endpoint + rotation
- [ ] Logout / token revocation
- [ ] Password reset flow (basic, email later)
- [ ] Auth guards + `@CurrentUser()` decorator
- [ ] Frontend: login page, auth store, protected route wrapper

### 1.3 Role, Permission & Data Scope Module
- [ ] Prisma schema: `Role`, `Permission`, `RolePermission`, `UserRole`
- [ ] Data scope model: scope type (Global / Organization / Store) + scope target id on `UserRole`
- [ ] Seed initial roles from spec (System Admin, University Admin, College Admin, Department Head, Store Manager, Store Keeper, Finance Officer, Procurement Officer, Requester, Auditor, External User)
- [ ] Seed initial permission list (namespaced: `inventory.view`, `inventory.issue`, `transfer.approve`, `request.approve`, etc.)
- [ ] `PermissionGuard` + `@RequirePermission()` decorator
- [ ] Data-scope enforcement helper (e.g., "can this user act on this store/org?")
- [ ] API: assign role to user, list user permissions/effective scope
- [ ] Frontend: basic role/permission admin screens

**Definition of Done:** you can log in as a seeded user, get a JWT, and hit a permission-protected endpoint that correctly allows/denies based on role + scope.

---

## Phase 2 — Master Data

### 2.1 Store Module
- [ ] Prisma schema: `Store` (id, organization_id, name, code, location, manager_id, status)
- [ ] CRUD API scoped to org hierarchy
- [ ] Assign store manager
- [ ] Frontend: store list/detail per organization

### 2.2 Item Catalog Module
- [ ] Prisma schema: `ItemCategory`, `Item` (name, category_id, description, unit, serial_required, asset_type, status)
- [ ] Seed categories (IT Equipment, Furniture, Stationery, Lab Equipment, Vehicles, Consumables)
- [ ] CRUD API for categories + items
- [ ] Frontend: item catalog browser/search

**Definition of Done:** stores exist under real org units, items exist under real categories, both manageable via API + basic UI.

---

## Phase 3 — Inventory Core

### 3.1 Inventory Module
- [ ] Prisma schema: `StoreInventory` (store_id, item_id, quantity, minimum_stock, location)
- [ ] Read APIs: inventory by store, inventory by item across stores, low-stock query

### 3.2 Inventory Movement Module
- [ ] Prisma schema: `InventoryMovement` (item_id, from_store, to_store, quantity, movement_type, reference_id, created_by, created_at)
- [ ] Movement types enum: PURCHASE_RECEIVE, TRANSFER_OUT, TRANSFER_IN, ISSUE, RETURN, DISPOSAL, ADJUSTMENT
- [ ] **Core rule:** all writes to `StoreInventory.quantity` happen only inside a DB transaction triggered by a movement record — never a direct update
- [ ] Movement service: `applyMovement()` used internally by every other module (Procurement, Transfer, Distribution, Disposal, Borrowing)
- [ ] API: movement history by item/store
- [ ] Frontend: inventory dashboard, movement history view

**Definition of Done:** you can trigger a manual `ADJUSTMENT` movement via API and see `StoreInventory.quantity` update correctly and atomically, with a movement record as proof.

---

## Phase 4 — Workflow Engine (build before Requests)

This is the hardest and most important module — Requests, Transfers, Procurement, Disposal, and Borrowing all plug into it.

- [ ] Prisma schema: `Workflow`, `WorkflowStep` (order, approver_role or approver_resolution_rule), `ApprovalRule`, `ApprovalHistory`
- [ ] Define step "approver resolution" strategies: fixed role, "requester's department head", "store manager of X store", "next org level up"
- [ ] Workflow instance engine: create instance from a template, advance on approval, reject/cancel logic, branch for multi-approver steps if needed
- [ ] API: get active workflow instance + its current pending step for a given entity
- [ ] API: approve / reject a step (writes `ApprovalHistory`, advances workflow)
- [ ] Seed workflow templates for: Item Request, Transfer Request, Purchase Request, Disposal Request, Borrow Request (per the chains described in the spec, sections 13–14)
- [ ] Frontend: generic "pending approvals" inbox component (reusable across request types)

**Definition of Done:** a workflow template can be attached to a dummy entity, routed through 3+ approval steps by different seeded users, with full history recorded.

---

## Phase 5 — Requests (built on top of Workflow Engine)

### 5.1 Request Module (generic core)
- [ ] Prisma schema: `Request` (type, status, requester_id, organization_id, current_step, timestamps) + type-specific detail tables
- [ ] Lifecycle: Draft → Submitted → Pending Approval → Approved → Executed → Completed / Rejected / Cancelled
- [ ] Generic request API: create draft, submit, cancel, view status/timeline
- [ ] Hook: on final approval, call the relevant execution service (movement, transfer, etc.)

### 5.2 Request Types (build one at a time, each reusing 5.1 + Phase 4)
- [ ] Item Request (internal)
- [ ] Transfer Request (dept-to-dept, section 14 scenario)
- [ ] Purchase Request
- [ ] Distribution Request
- [ ] Borrow Request
- [ ] Disposal Request
- [ ] External Request

**Definition of Done:** the Department-to-Department transfer scenario from the spec (CS needs 10 chairs) runs end to end: request → dept head approval → receiving store approval → items transferred → both inventories updated → audit trail visible.

---

## Phase 6 — Procurement & Distribution

- [ ] Procurement Module: supplier info (basic), purchase order tracking, link to Purchase Request approval
- [ ] Central receiving flow: goods received into a central store via `PURCHASE_RECEIVE` movement
- [ ] Distribution Module: distribution plan (split one purchase across departments), per-department confirmation of receipt
- [ ] Frontend: procurement tracking screen, distribution plan builder

**Definition of Done:** the "300 Computers" scenario (section 15–16) runs end to end: purchase approved → received centrally → distribution plan created → departments confirm receipt → inventories updated per department.

---

## Phase 7 — Assets, Borrowing & Disposal

- [ ] Asset Module: `Asset` (asset_tag, serial_number, purchase_date, assigned_department, condition, status), linked to serial-required items
- [ ] Borrowing Module: request → approve → issue → return → inspection, using Workflow Engine
- [ ] Disposal Module: disposal request → inspection → approval → remove from inventory → disposal certificate (generate simple PDF)
- [ ] Frontend: asset registry view, borrow/return screens, disposal queue

**Definition of Done:** an asset can be tracked from purchase → assignment → borrowing cycle → eventual disposal, each step audit-logged.

---

## Phase 8 — Reporting, Notifications, Audit

### 8.1 Audit Module (thin but touches everything already built)
- [ ] Confirm every mutating service call in prior modules writes an `AuditLog` entry (retrofit if any were missed)
- [ ] API: audit trail by entity, by user, by date range
- [ ] Frontend: audit log viewer (Auditor role only)

### 8.2 Notification Module
- [ ] In-app notification table + API (request submitted, approval required, approved/rejected, stock low, transfer completed, item received)
- [ ] Trigger notifications from Workflow Engine + Inventory Module events
- [ ] Frontend: notification bell/inbox
- [ ] (Later) Email channel via a queued job (BullMQ)

### 8.3 Reporting Module
- [ ] Current inventory report
- [ ] Low stock report
- [ ] Stock movement history report
- [ ] Department consumption report
- [ ] Purchase / Transfer / Asset / Audit / User activity reports
- [ ] Export to PDF, Excel, CSV
- [ ] Frontend: reports dashboard with filters + export buttons

**Definition of Done:** every action performed in earlier phases shows up correctly in audit logs, triggers the right notification, and is reflected in at least one report.

---

## Phase 9 — Hardening & Launch Readiness

- [ ] Full RBAC/data-scope review across all endpoints (no endpoint reachable without correct scope check)
- [ ] Load basic integration test suite covering the two end-to-end scenarios (transfer, purchase/distribution)
- [ ] Dockerize backend + frontend for production build
- [ ] Nginx production reverse proxy config + HTTPS
- [ ] Backup strategy for PostgreSQL
- [ ] Basic rate limiting / security headers (helmet, throttling)
- [ ] User acceptance testing with real Arba Minch University staff on 2–3 real workflows
- [ ] Deployment runbook document

**Definition of Done:** system is deployed via Docker Compose on a staging server, real staff have walked through the core flows, and known issues are tracked, not silent.

---

## Suggested Order of Attack (summary)

```
Phase 0  → Foundation & environment
Phase 1  → Org → Auth → RBAC/Scope
Phase 2  → Store → Item Catalog
Phase 3  → Inventory → Movements
Phase 4  → Workflow Engine
Phase 5  → Generic Request → each Request type
Phase 6  → Procurement → Distribution
Phase 7  → Assets → Borrowing → Disposal
Phase 8  → Audit → Notifications → Reporting
Phase 9  → Hardening → Launch
```

---

## How We'll Use This Doc

Next time we sit down to build, just say something like **"let's start Phase 0"** or **"let's do the Organization module"**, and we'll go item by item: I'll write the Prisma schema, the NestJS module (controller/service/DTOs), wire it into Swagger, and give you a quick way to test it — before moving to the next checkbox.
