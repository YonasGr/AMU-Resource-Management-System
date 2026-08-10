# University ERP — Developer Handoff

**Project**: Inventory, Store, Asset and Workflow Management System for Arba Minch University
**Status as of this document**: ALL PHASES 0–9 ARE 100% COMPLETE & PRODUCTION-READY.
**Audience**: any developer or AI tool picking this up next.

Read this whole document before touching code. The business rules section especially — several design decisions here aren't obvious from the code alone and exist because of a real bug we hit and fixed.

---

## 1. What this system is

A modular ERP for a university where **every college, department, office, and directorate can have its own store**, and **every inventory-affecting action must go through a request → approval → execution → audit trail**, never a direct edit. That last rule is the spine of the whole system — see section 5.

Full original spec: `docs/build-plan.md` in this repo.

---

## 2. Tech stack

- **Backend**: NestJS + TypeScript, Prisma ORM, PostgreSQL, JWT auth (access + refresh tokens), Nodemailer SMTP, Swagger at `/api/docs`
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, TanStack Query, Zustand, React Router, React Hook Form + Zod
- **Infra**: Docker Compose (postgres, redis, backend, frontend, nginx reverse proxy). Development (`docker-compose.yml`) & Production (`docker-compose.prod.yml`).
- **Monorepo**: pnpm workspaces, `backend/` and `frontend/` as separate packages.

### Running it

#### Development Mode:
```bash
docker compose up --build
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev
docker compose exec backend pnpm prisma:seed
```
Frontend: `http://localhost:5173`. Backend/Swagger: `http://localhost:3000/api/docs`.

#### Production Mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Production UI via Nginx Proxy: `http://localhost:8080`.

#### Running E2E Integration Tests:
```bash
docker compose exec backend pnpm test:e2e
```

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

## 4. What's built (Phases 0–9 Complete)

| Phase | Module | Status |
|---|---|---|
| 0–5 | Core Infrastructure, Org Tree, RBAC, Stores, Inventory, Workflows, Requests | ✅ Complete |
| 6 | Procurement (POs, Goods Receipts, Suppliers) & Distribution (Multi-Allocation) | ✅ Complete |
| 7 | Asset Registry, Borrowing Custody, Inspections, Maintenance, Disposals | ✅ Complete |
| 8 | Unified Audit Log, In-App Notifications, 8 Reports + PDF/CSV Exporter | ✅ Complete |
| 9 | Production Multi-Stage Docker, Nginx Security Proxy, Nodemailer SMTP, E2E Tests | ✅ Complete |

