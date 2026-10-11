# AMU Store Inventory and Requisition Management System

A web application for managing university store materials, stock movements, departmental material requests, approvals, and audit reports. It is built for Arba Minch University.

The application currently focuses on consumable materials and store operations. It is not a full university ERP or fixed-asset lifecycle system. See [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) for the verified scope, workflows, roles, data model, and known limitations.

## Run locally

Requirements: Docker with Compose.

```bash
docker compose up -d --build
```

The development Compose setup starts PostgreSQL, Redis, the NestJS API, the React web app, and Nginx. It applies database migrations and runs the seed script when the backend starts.

- Web app: <http://localhost:5173> or <http://localhost:8080>
- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/api/docs>

To stop the services while keeping the database volume:

```bash
docker compose down
```

Seeded demo accounts are created by `backend/prisma/seed.ts`. Set the `SEED_*_PASSWORD` variables as described in `backend/.env.example`; do not rely on development defaults for a deployed environment.

## Main components

- `frontend/`: React, TypeScript, Vite, Tailwind CSS
- `backend/`: NestJS, TypeScript, Prisma
- Database: PostgreSQL
- Cache and login rate limits: Redis
- Local orchestration: Docker Compose

## Production configuration

The repository includes `docker-compose.prod.yml`, production Dockerfiles, and Railway configuration files. Before deploying, configure real database credentials, strong JWT secrets, and explicit seed passwords. Do not use development fallback credentials in a deployed environment. The old step-by-step Railway guide was removed because it contained conflicting and unsafe setup advice.
