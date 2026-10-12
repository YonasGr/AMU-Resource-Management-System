# AMU Store Inventory & Requisition Management System

> **System manual · Current implementation**
> Arba Minch University · Materials, store operations, and departmental requests

This manual describes features represented in the current schema and application code. It is the product documentation source of truth; when code and prose differ, the implementation wins.

<p>
  <a href="https://nestjs.com/"><img alt="NestJS 10" src="https://img.shields.io/badge/API-NestJS_10-E0234E?logo=nestjs&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React 18" src="https://img.shields.io/badge/Web-React_18-149ECA?logo=react&logoColor=white"></a>
  <a href="https://www.prisma.io/"><img alt="Prisma 5" src="https://img.shields.io/badge/Data-Prisma_5-2D3748?logo=prisma&logoColor=white"></a>
  <a href="https://www.postgresql.org/"><img alt="PostgreSQL 16" src="https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?logo=postgresql&logoColor=white"></a>
</p>

## Contents

- [Purpose and boundaries](#purpose-and-boundaries)
- [Operational workflow](#operational-workflow)
- [Inventory rules](#inventory-rules)
- [Roles and access](#roles-and-access)
- [Application map](#application-map)
- [Reports and API](#reports-and-api)
- [Data model](#data-model)
- [Architecture and operation](#architecture-and-operation)

## Purpose and boundaries

The system supports university store operations: maintaining a material catalog, recording stock activity, handling department requests, and reviewing operational reports.

### Included today

- Material categories and catalog records
- Stock-in, stock-out, returns, adjustments, and transaction history
- Department material requests, manager decisions, and storekeeper issuance
- Supplier, employee, and department records
- Purchase orders with supplier/store destination, approval, cancellation, partial delivery, and receipt-line linkage
- Low-stock reporting, notifications, audit logs, and dashboard metrics

### Not implemented in the current schema

Distribution plans, individually tracked fixed assets, borrowing, maintenance, and disposal are not part of the current application. Goods receipts remain available without a purchase order for legacy/direct receiving, but receipts linked to an order must use an approved order line and cannot exceed the ordered quantity.

> [!NOTE]
> `StockBalance` is the authoritative store/material balance. `StockSummary` remains a compatibility aggregate projection for existing consumers.

### Procurement workflow

Purchase orders are created in `DRAFT`, submitted for approval, and approved or rejected by an administrator or store manager. Approved orders may be cancelled before receipt. Goods receipts can optionally reference a purchase-order line; linked receipts must match the supplier, destination store, and material and are rejected when they would exceed the ordered quantity. Posting an inspected linked receipt increments the line's received quantity and moves the order to `PARTIALLY_RECEIVED` or `RECEIVED`.

## Operational workflow

```mermaid
flowchart LR
    A[Manager maintains catalog] --> B[Stock is received]
    C[Requester submits material request] --> D{Manager approves?}
    D -->|No| E[Request rejected]
    D -->|Yes| F[Storekeeper issues request]
    B --> G[Material stock summary]
    F --> G
    G --> H[Transaction history and reports]
    D --> I[Audit event and notification]
    F --> I
```

1. A requester submits a request with a purpose, department, and material quantities. It starts as `PENDING`.
2. A store manager approves or rejects it. Approval is limited by the store-scope check in `RequestsService`.
3. A storekeeper issues an approved request. The service checks store-specific stock, records each stock-out, updates line quantities, and changes the request to `PARTIALLY_ISSUED` or `ISSUED` within a database transaction. Issue requests may include selected line quantities; omitting them issues all outstanding quantities for backward compatibility.
4. The system records audit events and sends notifications for key request and inventory events.

Request statuses are `PENDING`, `APPROVED`, `PARTIALLY_ISSUED`, `REJECTED`, `ISSUED`, and `CANCELLED`.

## Inventory rules

Materials have a unique material code, category, unit, minimum-stock threshold, optional location and barcode, and active/inactive status. `StockSummary` holds received, issued, and remaining quantities for each material.

| Transaction | Implemented effect |
|---|---|
| `STOCK_IN` | Creates a transaction and increases received and remaining quantities. Supplier and unit price may be recorded. |
| `STOCK_OUT` | Creates a transaction, increases the issued total, and decreases remaining quantity after checking that sufficient stock is available. |
| `RETURN` | Accepts a return against an issued request item, capped at the quantity still eligible for return; decreases the issued total and increases remaining quantity. |
| `ADJUSTMENT` | Sets remaining quantity to the submitted physical count and records the reason in the transaction remarks. |
| `TRANSFER` | Records a transfer transaction and department destination. It does **not** update `StockSummary` or move quantities between store balances. |

Stock-in, stock-out, return, adjustment, and request issuance write their transaction and quantity changes together in database transactions. Audit logs are separate operational records; they are not immutable or tamper-proof by design.

## Roles and access

The schema defines five roles. This table summarizes their main intended work; it is not a complete endpoint-by-endpoint permission matrix.

| Role | Main responsibility |
|---|---|
| `ADMINISTRATOR` | User and department administration; can also perform selected inventory operations and request decisions. |
| `STORE_MANAGER` | Material catalog management, request decisions, supplier management, and inventory operations. |
| `STOREKEEPER` | Inventory operations and issuance of approved requests. |
| `REQUESTER` | Submits material requests and follows their status. |
| `AUDITOR` | Reads audit records and operational reports. |

JWT authentication is global, with login, refresh, and registration marked public. `RolesGuard` applies role restrictions where controllers declare them. The request approval service additionally checks store scope: administrators are allowed; a store manager needs `GLOBAL` scope or a matching `STORE` scope. `ORGANIZATION` exists as a scope type, but do not infer that all list and detail APIs filter data by scope.

## Application map

### Backend modules

| Module | Responsibility |
|---|---|
| `auth` | Login, refresh, registration, current user, JWT guards, access checks |
| `users` | User account administration |
| `employees` | Departments, employees, issue history |
| `materials` | Categories and material catalog |
| `inventory` | Stock operations and transaction ledger |
| `requests` | Request submission, decisions, and issuance |
| `suppliers` | Supplier directory |
| `reports` | Operational stock and activity reports |
| `audit` | Audit-log queries |
| `notifications` | User inbox and read state |
| `dashboard` | Inventory summary metrics |

### Frontend routes

The main routes are `/login`, `/`, `/materials`, `/requests`, `/inventory`, `/employees`, `/suppliers`, `/reports`, and `/users`.

## Reports and API

The reports API exposes the following endpoints:

| Endpoint | Report |
|---|---|
| `GET /reports/current-stock` | Current material balances |
| `GET /reports/stock-in` | Receipts |
| `GET /reports/stock-out` | Issues |
| `GET /reports/material-balance` | Received, issued, remaining, and low-stock status |
| `GET /reports/low-stock` | Materials at or below their minimum threshold |
| `GET /reports/employee-issue` | Issues by employee |
| `GET /reports/supplier` | Supplier and recorded supply summary |
| `GET /reports/transaction-history` | Inventory transaction history |

All report endpoints accept bounded query controls: `page` (1-based, default `1`), `pageSize` (default `100`, maximum `500`), `storeId`, `from`, and `to`. Transaction-oriented reports apply the store and inclusive date filters to transaction timestamps. Material and supplier reports paginate at the database query; low-stock results are filtered before the requested page is returned and are capped at 500 candidate materials per request. This prevents unbounded exports and keeps report queries reproducible for a selected page/filter set while preserving the existing array response shape for current clients.

The frontend provides report views and export/print actions. These are operational inventory reports, not financial valuation reports. For larger exports, clients should request sequential pages rather than raising `pageSize` beyond the server maximum.

## Data model

Primary Prisma models are `Department`, `Store`, `User`, `Employee`, `Supplier`, `MaterialCategory`, `Material`, `StockSummary`, `StockBalance`, `MaterialRequest`, `MaterialRequestItem`, `InventoryTransaction`, `AuditLog`, and `Notification`.

`StockSummary` remains the aggregate compatibility balance while `StockBalance` records the authoritative material balance for a specific store. `StockBalance.reservedQuantity` protects approved request allocations from competing issues; available stock is remaining quantity minus reservations. Inventory mutations use the authenticated user's assigned store; global administrators must provide an explicit store.

Materials now carry explicit unit metadata: `unit` is the operator-facing stock unit, `unitCategory` classifies the measurement family, `baseUnit` identifies the canonical reference unit, `conversionFactorToBase` records a positive integer conversion factor, and `allowsFractional` declares whether fractional quantities may be introduced. The current inventory ledger continues to store historical and operational quantities in each material's declared `unit`; no implicit conversion is applied during this migration. This prevents historical balances from changing silently. A future conversion rollout must reconcile existing balances and update every receiving, issuing, reserving, counting, transfer, return, and reporting boundary together.

Materials can now declare traceability requirements for lots, expiry dates, and serial numbers. Receiving, return-intake, and transfer creation validate required metadata and reject expired dates; serial-tracked movements must contain exactly one unit and a serial number. Lot, batch, expiry, serial, and condition metadata is copied onto goods receipts, returns, transfers, and inventory transactions for traceability. Stock balances are not yet split by lot or serial, so this checkpoint records and validates provenance without claiming lot-level availability or FEFO allocation; that requires a coordinated stock-ledger extension.

Inter-store movement uses `InventoryTransfer` documents. Creating a transfer records a `DRAFT`; dispatch atomically removes available stock from the source store and records a transfer transaction; receipt adds stock to the destination store and completes the document. Transfers cannot be created within the same store or consume reserved stock.

Receiving from a supplier or other source can use `GoodsReceipt` documents. A receipt begins as `DRAFT` and does not change inventory. Inspection records accepted and rejected quantities; those quantities must reconcile to the received quantity, and rejected units require a condition note. Posting is allowed only after inspection, atomically adds accepted units to the receiving store and aggregate compatibility balance, records a `STOCK_IN` transaction, and marks the receipt `POSTED`. Rejected units never enter available inventory.

Cycle counts use `CycleCount` sessions. Creating a session snapshots each selected material's store quantity without changing stock. Submission requires every line to be counted and requires a variance reason whenever physical quantity differs from the snapshot. Managers can request a recount before approval. Approval is atomic, refuses stale balances that changed after the snapshot, posts each variance as an `ADJUSTMENT` ledger transaction, updates the store balance and compatibility aggregate, and records the approving user.

Returns can use `MaterialReturn` inspection documents without changing stock at intake. The request item and store are derived and validated from the original issued request, and outstanding quantities include other open return inspections. Inspection assigns `ACCEPT_TO_STOCK`, `QUARANTINE`, or `SCRAP`. Posting increments the request item's returned quantity; accepted returns restore store stock and write a `RETURN` ledger transaction, while quarantine and scrap dispositions do not inflate available stock. The existing immediate return endpoint remains available for legacy clients.

Request lifecycle closure uses explicit `BACKORDERED`, `CANCELLED`, and `CLOSED` states. Managers can mark approved or partially issued requests as backordered, and cancellation releases any remaining reservations while refusing cancellation of lines that were already issued. Store staff record handover evidence after full issuance; only the requester can confirm a handed-over request, and confirmation requires all requested quantities to be issued with no open return inspections before the request becomes `CLOSED`.

Audit and notification side effects are persisted through the transactional outbox. `AuditService` and `NotificationsService` enqueue durable `OutboxEvent` records, and the background worker claims pending events before dispatching them to `AuditLog` or `Notification`. Event keys are unique, so callers can safely retry an enqueue without creating duplicate outbox records.

Outbox events use `PENDING`, `PROCESSING`, `PROCESSED`, and `FAILED` statuses. Failed events retain the processing error and are retried with exponential backoff (up to ten attempts, capped at one minute). A `PROCESSING` event left behind by a crashed worker is reclaimed after one minute. Events that remain failed after the retry limit require operational investigation and can be replayed by resetting their status and availability in the database after the underlying cause is corrected. The worker polls every five seconds and claims events conditionally so multiple API instances do not process the same event concurrently.

The current service adapter makes the enqueue durable and idempotent, but strict business-write-plus-outbox atomicity still requires passing a transaction-scoped outbox client into the highest-risk mutation transactions. That follow-up remains necessary before claiming full transactional guarantees for every workflow.

Audit records now support actor role, entity type and ID, correlation ID, source, reason, request metadata, and structured before/after JSON snapshots. Existing callers receive generated correlation IDs and the `api` source by default; workflows can provide richer context through `AuditService.log` options. Audit rows are protected against application-level updates and deletes by a PostgreSQL trigger and should be retained in a restricted database role or exported to separate immutable storage for long-term retention.

For exact fields, relations, and enum values, see [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). The schema and migrations define persisted behavior; this summary is intentionally compact.

## Architecture and operation

```mermaid
flowchart LR
    Browser[Staff browser] --> Web[React + Vite]
    Web -->|REST API / JWT| API[NestJS]
    API --> Prisma[Prisma ORM]
    Prisma --> DB[(PostgreSQL)]
    API --> Redis[(Redis)]
    Proxy[Nginx reverse proxy] -. optional entry point .-> Web
    Proxy -. optional entry point .-> API
```

| Layer | Technology |
|---|---|
| Web client | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand |
| API | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / rate-limit support | Redis 7 |
| Local orchestration | Docker Compose and Nginx |

Start the development stack with `docker compose up -d --build`. It starts the database, Redis, API, web client, and reverse proxy. The backend container generates Prisma Client, applies checked-in migrations, seeds development data, and starts the API.

- Web client: <http://localhost:5173> or <http://localhost:8080>
- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/api/docs>

Stop services while retaining the database volume with `docker compose down`. Production configuration is in `docker-compose.prod.yml`, production Dockerfiles, and the Railway JSON files. Configure production database credentials, strong JWT secrets, and seed passwords before deployment. See [`README.md`](README.md) for the quick start.

---

<sub>Documentation maintenance: update this manual only after checking the relevant schema, backend service/controller, and frontend screen or route. Keep future plans separate from implemented behavior.</sub>
