<div align="center">
  <img src="frontend/public/amu-logo.png" alt="Arba Minch University emblem" width="118" />
  <h1>AMU Store Inventory &amp; Requisition Management System</h1>
  <p><strong>Material-store operations for Arba Minch University</strong></p>
  <p>Catalog materials · Track stock · Review requests · Record issues · Report activity</p>

  <a href="https://react.dev/"><img alt="React 18.3" src="https://img.shields.io/badge/React-18.3-149ECA?logo=react&logoColor=white"></a>
  <a href="https://vite.dev/"><img alt="Vite 5.4" src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript 5.5" src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS 3.4" src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white"></a>
  <br />
  <a href="https://nestjs.com/"><img alt="NestJS 10" src="https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white"></a>
  <a href="https://www.prisma.io/"><img alt="Prisma 5" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white"></a>
  <a href="https://www.postgresql.org/"><img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white"></a>
  <a href="https://redis.io/"><img alt="Redis 7" src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white"></a>
  <a href="https://docs.docker.com/compose/"><img alt="Docker Compose" src="https://img.shields.io/badge/Run-Docker_Compose-2496ED?logo=docker&logoColor=white"></a>
</div>

---

## What it does

This is a web-based **university store inventory and material requisition system**. Staff request materials, store managers review requests, and storekeepers record stock operations and issue approved requests. Audit records, notifications, and reports support day-to-day oversight.

> [!IMPORTANT]
> The current application is focused on materials and store operations. It is **not** a full university ERP or a fixed-asset lifecycle system. The manual documents important implementation limits, including material-wide stock balances and transfer records that do not currently adjust stock.

[Read the system manual →](SYSTEM_DOCUMENTATION.md)

## The main workflow

```mermaid
flowchart LR
    A[Material catalog] --> B[Stock received]
    B --> C[Department requests material]
    C --> D{Manager decision}
    D -->|Rejected| E[Requester notified]
    D -->|Approved| F[Storekeeper issues items]
    F --> G[Transaction and stock balance updated]
    G --> H[Audit, reports, notifications]
```

## Features

| Area | What’s available |
|---|---|
| Materials | Categories, unique material codes, units, locations, barcodes, and minimum-stock thresholds |
| Inventory | Stock-in, stock-out, request-linked returns, physical-count adjustments, and transaction history |
| Requisitions | Department requests with pending, approved, rejected, issued, and cancelled statuses |
| People & suppliers | Department and employee directory, supplier records, and issue history |
| Oversight | Low-stock alerts, in-app notifications, audit logs, dashboard metrics, and eight operational reports |
| Access | JWT authentication, five roles, role guards, and store-scope checks on request decisions |

## Run locally

**Requirements:** Docker with Compose.

```bash
docker compose up -d --build
```

Compose starts PostgreSQL, Redis, the NestJS API, the React web app, and Nginx. The backend container generates the Prisma client, applies migrations, seeds development data, and starts the API.

| Open | Address |
|---|---|
| Web app | [localhost:5173](http://localhost:5173) or [localhost:8080](http://localhost:8080) |
| API | [localhost:3000](http://localhost:3000) |
| Swagger | [localhost:3000/api/docs](http://localhost:3000/api/docs) |

Stop the services and keep the database volume:

```bash
docker compose down
```

Seeded accounts are defined by `backend/prisma/seed.ts`. See `backend/.env.example` for the seed-password variables. Do not use development fallback credentials in a deployed environment.

## Architecture

```mermaid
flowchart TB
    U[University staff] --> UI[React + Vite web app]
    UI -->|REST / JWT| API[NestJS API]
    API --> ORM[Prisma]
    ORM --> DB[(PostgreSQL)]
    API --> R[(Redis)]
    N[Nginx reverse proxy] -. optional entry point .-> UI
    N -. optional entry point .-> API
```

## Database schema

The entity relationship diagram below shows the Prisma/PostgreSQL data model used by the application. It is maintained alongside the schema at [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

<p align="center">
  <a href="backend/prisma/ERD.svg">
    <img src="backend/prisma/ERD.svg" alt="Entity relationship diagram for the AMU Store Inventory and Requisition Management System" width="100%" />
  </a>
</p>

<p align="center">
  <a href="backend/prisma/ERD.svg">Open the ERD at full size</a>
</p>

<details>
<summary><strong>Repository map</strong></summary>

| Path | Responsibility |
|---|---|
| `frontend/` | React, TypeScript, Vite, and Tailwind CSS application |
| `backend/` | NestJS API, Prisma schema, migrations, and seed data |
| `infra/nginx/` | Local and production Nginx configuration |
| `docker-compose.yml` | Local development stack |
| `docker-compose.prod.yml` | Production Compose stack |

</details>

## Production

The repository includes production Dockerfiles, a production Compose file, and Railway build configuration. Before deployment, configure production database credentials, strong JWT secrets, and explicit seed passwords. Review the deployment configuration and [system manual](SYSTEM_DOCUMENTATION.md) before exposing the app.

---

<div align="center">
  <sub>Built for Arba Minch University · Source code and database schema define the implemented behavior</sub>
</div>
