# Arba Minch University (AMU) Resource Management System
## Enterprise Inventory, Store, Fixed Asset & Multi-Step Workflow ERP Platform

![Build Status](https://img.shields.io/badge/status-production_ready-brightgreen.style=for-the-badge)
![NestJS](https://img.shields.io/badge/backend-NestJS_10-red.svg?style=for-the-badge&logo=nestjs)
![React](https://img.shields.io/badge/frontend-React_18-blue.svg?style=for-the-badge&logo=react)
![Prisma](https://img.shields.io/badge/ORM-Prisma_5-indigo.svg?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL_16-blue.svg?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/container-Docker_Compose-2496ED.svg?style=for-the-badge&logo=docker)

---

## 1. System Overview

The **AMU Resource Management System** is a unified, web-based Enterprise Resource Planning (ERP) platform custom-engineered for **Arba Minch University (AMU)** to govern resource requisitions, inventory movements, fixed asset custody, multi-step approval workflows, and audit reporting across all colleges, departments, offices, and central directorates.

### Key Highlights
- **Strict Request-Driven Execution**: Stock quantities cannot be directly edited. Every inventory movement originates from a Request governed by a dynamic multi-step approval workflow.
- **Atomic Inventory Ledger**: `StoreInventory.quantity` updates occur strictly inside isolated database transactions (`MovementService`) paired with immutable `InventoryMovement` audit logs.
- **3-Tier RBAC & Data Scoping Engine**: Access requires both a permission key (e.g., `inventory.issue`) and a matching scope (`GLOBAL`, `ORGANIZATION`, or `STORE`).
- **Fixed Asset & Custody Lifecycle**: Registry, loan borrowing, return inspections, maintenance workflows (`AVAILABLE` → `UNDER_MAINTENANCE`), and disposal certificates.
- **Automated Audit & Reporting**: Unified audit timeline with before/after JSON diffs, in-app notification alerts, and 8 exportable reports (PDF & CSV).

---

## 2. Technology Stack

### Backend Tier (`/backend`)
- **Framework**: NestJS + TypeScript
- **Database & ORM**: PostgreSQL 16 + Prisma ORM
- **Authentication**: JWT (Access + Refresh Rotation) with Argon2 password hashing
- **Email Delivery**: Nodemailer SMTP module with HTML templates (Dev logger fallback)
- **API Documentation**: OpenAPI / Swagger UI at `/api/docs`

### Frontend Tier (`/frontend`)
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Custom UI Component Library
- **State & Data Fetching**: TanStack React Query + Zustand Auth Store
- **Navigation**: React Router v6

### Infrastructure & Operations (`/infra`)
- **Containerization**: Multi-stage Dockerfiles (`Dockerfile.prod`)
- **Orchestration**: Docker Compose (`docker-compose.yml` for Dev, `docker-compose.prod.yml` for Production)
- **Edge Reverse Proxy**: Alpine Nginx with rate-limiting (`/auth/` 5 req/s) & security headers
- **E2E Testing**: Supertest & Jest Integration Suite (`backend/test/app.e2e-spec.ts`)

---

## 3. Quick Start Guide

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose

### Development Mode Setup

```bash
# 1. Clone the repository
git clone https://github.com/YonasGr/AMU-Resource-Management-System.git
cd AMU-Resource-Management-System

# 2. Launch Development Containers (Postgres, Redis, Backend, Frontend, Nginx Proxy)
docker compose up -d --build

# 3. Apply Prisma Database Migrations
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev

# 4. Seed Database with Org Hierarchy, Categories, Items, Stores & Test Users
docker compose exec backend pnpm prisma:seed
```

#### Access Points (Dev Mode):
- **Web Application**: `http://localhost:5173`
- **Nginx Reverse Proxy Entry**: `http://localhost:8080`
- **Swagger API Docs**: `http://localhost:3000/api/docs`
- **Backend API Direct**: `http://localhost:3000`

---

### Production Deployment Mode Setup

To build and run the optimized multi-stage production environment:

```bash
# Launch Production Services (Production NestJS Runner & Production Static Nginx SPA Proxy)
docker compose -f docker-compose.prod.yml up -d --build
```
- **Production UI**: `http://localhost:8080`

---

### Running Automated E2E Integration Tests

To run the Supertest integration test suite covering login, org hierarchy, stores, notifications, and reports:

```bash
docker compose exec backend pnpm test:e2e
```

*Expected Result*: **100% Pass (6/6 Integration Tests Passing)**

---

## 4. Test Accounts Credentials

All seeded test accounts use the default password: **`ChangeMe123!`**

| Email Address | Role | Scope | Purpose |
|---|---|---|---|
| `admin@amu.edu.et` | `SYSTEM_ADMINISTRATOR` | `GLOBAL` | Full System Admin, Org Tree, Asset Setup, Audit Log, Reports |
| `wftest.requester@amu.edu.et` | `REQUESTER` | `ORGANIZATION` (CS Dept) | Submitting Item, Transfer, Borrow, and Purchase requests |
| `wftest.depthead@amu.edu.et` | `DEPARTMENT_HEAD` | `ORGANIZATION` (CS Dept) | Step 1 Approver for CS Department requests |
| `wftest.sourcemanager@amu.edu.et` | `STORE_MANAGER` | `STORE` (Source Store) | Step 2 Approver for Source Store issues & transfers |
| `wftest.destmanager@amu.edu.et` | `STORE_MANAGER` | `STORE` (Destination Store) | Step 3 Approver for Destination Store receipt confirmations |

---

## 5. Master Documentation Index

- 📘 **[Master System Documentation](file:///home/jonah/Github/AMU-Resource-Management-System/SYSTEM_DOCUMENTATION.md)** (`SYSTEM_DOCUMENTATION.md`): Architectural specifications, database schemas, RBAC scope matrix, business invariants, and verification protocols.
- 🎓 **[Instructor Presentation & Demo Guide](file:///home/jonah/Github/AMU-Resource-Management-System/PROJECT_PRESENTATION_GUIDE.md)** (`PROJECT_PRESENTATION_GUIDE.md`): Defense script, UI demo walkthroughs, and technical evaluation Q&A.
- 🛠️ **[Developer Handoff Guide](file:///home/jonah/Github/AMU-Resource-Management-System/HANDOFF.md)** (`HANDOFF.md`): Developer rules, un-obvious design choices, and workspace structure.
- 📋 **[Master Build Plan & Checklist](file:///home/jonah/Github/AMU-Resource-Management-System/build-plan.md)** (`build-plan.md`): Complete checklist of all 9 implemented phases.

---

## 6. License & Institutional Credits

Developed for **Arba Minch University (AMU)**, Ethiopia. All rights reserved.
