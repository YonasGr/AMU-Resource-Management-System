# System documentation

This document describes the system implemented in this repository. It is the source of truth for current product scope. The code and database schema remain authoritative when implementation details change.

## Purpose and scope

The AMU Store Inventory and Requisition Management System supports day-to-day material-store operations at Arba Minch University. Its implemented workflow covers material catalog management, stock receipts and issues, departmental requests, approval, fulfillment, returns, stock adjustments, supplier and employee records, notifications, and reporting.

It is a focused store-management application, not a complete ERP. The current schema does not implement purchase orders, goods-receipt documents, distribution plans, individually tracked fixed assets, borrowing, maintenance, or disposal workflows.

### Current multi-store limitation

The database has `Store` records and requests may refer to a store. However, `StockSummary` has one row per material, and inventory transactions do not identify a source or destination store. Therefore stock balances are currently material-wide, not independently maintained per store. Store-scoped request approval does not make the stock ledger multi-store.

## Main user workflow

1. A store manager maintains material categories and the material catalog.
2. A requester submits a material request with a department, purpose, and requested quantities. New requests start as `PENDING`.
3. A store manager approves or rejects a pending request. The approval service checks the request's store scope using `AccessControlService`.
4. A storekeeper issues an approved request. Issuance checks available stock and, in one database transaction, records stock-out transactions, updates balances and issued quantities, and marks the request `ISSUED`.
5. Inventory transactions, audit log entries, notifications, and reports provide operational history and oversight.

Requests use these statuses: `PENDING`, `APPROVED`, `REJECTED`, `ISSUED`, and `CANCELLED`.

## Inventory behavior

Materials have a unique code, category, unit, minimum-stock threshold, optional location and barcode, and active/inactive status. `StockSummary` stores received, issued, and remaining quantities for each material.

The supported transaction types are `STOCK_IN`, `STOCK_OUT`, `RETURN`, `ADJUSTMENT`, and `TRANSFER`.

- Stock-in adds to received and remaining quantities and can reference a supplier and unit price.
- Stock-out records an issue and subtracts from remaining quantity, subject to an availability check.
- Returns are tied to an already issued request item and cannot exceed its outstanding issued quantity.
- Adjustments set the remaining quantity to a supplied physical count and record the reason in transaction remarks.
- The transfer endpoint records a `TRANSFER` transaction and department destination, but currently does not move quantities between separate store balances or update the material's `StockSummary`.

Stock-in, stock-out, return, adjustment, and request issuance update the transaction record and stock summary together in database transactions. Audit logs are separate records; they are not described as immutable or tamper-proof.

## Roles and access

The schema defines five roles:

| Role | Implemented responsibility |
|---|---|
| `ADMINISTRATOR` | Manages user accounts and departments; also has access to selected inventory and request operations. |
| `STORE_MANAGER` | Manages material catalog records, approves or rejects requests, and can perform inventory operations. |
| `STOREKEEPER` | Performs inventory operations and issues approved requests. |
| `REQUESTER` | Submits material requests and follows their status. |
| `AUDITOR` | Reads audit logs and reports. |

JWT authentication is applied globally, with selected routes marked public (including login, refresh, and registration). `RolesGuard` enforces route-level role metadata. Store approval scope is checked in `RequestsService`; it permits administrators, globally scoped store managers, or store-scoped managers whose store matches the target. `ScopeType` also includes `ORGANIZATION`, but do not assume every endpoint filters records by scope: list and detail routes must be reviewed individually in code.

## Implemented modules

Backend modules under `backend/src/modules/`:

- `auth`: login, refresh, registration, current-user endpoint, JWT guards, and access checks
- `users`: administrator-managed user accounts
- `employees`: departments, employee records, and issue history
- `materials`: categories and material catalog
- `inventory`: stock operations and transaction history
- `requests`: request submission, decision, and issuance
- `suppliers`: supplier directory
- `reports`: stock, movement, low-stock, employee, supplier, and transaction reports
- `audit`: audit-log viewing
- `notifications`: per-user inbox and read state
- `dashboard`: inventory summary metrics

The frontend is a React single-page application. Current main routes are `/login`, `/`, `/materials`, `/requests`, `/inventory`, `/employees`, `/suppliers`, `/reports`, and `/users`.

## Reports

The reports module exposes:

- `GET /reports/current-stock`
- `GET /reports/stock-in`
- `GET /reports/stock-out`
- `GET /reports/material-balance`
- `GET /reports/low-stock`
- `GET /reports/employee-issue`
- `GET /reports/supplier`
- `GET /reports/transaction-history`

The frontend provides report views and export/print actions. These reports are operational inventory summaries; they are not financial valuation reports.

## Data model

The primary records are `Department`, `Store`, `User`, `Employee`, `Supplier`, `MaterialCategory`, `Material`, `StockSummary`, `MaterialRequest`, `MaterialRequestItem`, `InventoryTransaction`, `AuditLog`, and `Notification`. See `backend/prisma/schema.prisma` for fields, relationships, enums, and migration-backed schema.

## Architecture and local operation

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand
- Backend: NestJS and TypeScript, with Prisma ORM
- Persistence: PostgreSQL
- Redis: login rate limiting and related cache services
- Local services: Docker Compose; Nginx is included as a reverse proxy

Start the development stack with `docker compose up -d --build`. The backend container generates the Prisma client, deploys checked-in migrations, seeds demo data, and starts the development server. Local URLs and shutdown instructions are in [README.md](README.md). Production Compose uses `docker-compose.prod.yml` and `backend/.env`; provide production secrets and database settings there. Railway build configuration is in `backend/railway.json` and `frontend/railway.json`; deployment behavior depends on the variables configured in Railway.

## Keeping this document accurate

When a feature changes, update this document only after checking its database model, backend service/controller, and frontend route or screen as applicable. Do not document planned features as implemented. Keep historical requests or project plans out of the current product specification.
