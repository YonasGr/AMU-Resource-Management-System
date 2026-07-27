# University ERP — Phase 0 Foundation

This is the initial scaffold for the Arba Minch University Inventory, Store, Asset
and Workflow Management System, matching **Phase 0** of the build plan.

## What's included

- `backend/` — NestJS + TypeScript, Prisma (PostgreSQL), Swagger, global error
  handling, response envelope, env validation. Health check at `GET /health`.
- `frontend/` — Vite + React + TypeScript + Tailwind, calls the backend health
  check on load to prove the two are wired together.
- `docker-compose.yml` — PostgreSQL, Redis, backend, frontend, and an Nginx
  reverse proxy (routes `/api/*` to backend, everything else to frontend).
- `infra/nginx/nginx.conf` — dev reverse proxy config.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker + Docker Compose

## Running it — Option A: Docker Compose (recommended)

```bash
docker compose up --build
```

This brings up Postgres, Redis, the backend (port 3000), the frontend (port 5173),
and Nginx (port 8080, proxies both).

Then, in a separate terminal, run the first Prisma migration inside the backend
container:

```bash
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev --name init
```

Verify:
- Backend health check: http://localhost:3000/health
- Swagger docs: http://localhost:3000/api/docs
- Frontend: http://localhost:5173 (should show "Backend status: ok")
- Through Nginx: http://localhost:8080

## Running it — Option B: locally without Docker for app code (DB/Redis still via Docker)

```bash
# Start just the infra
docker compose up postgres redis -d

# Backend
cd backend
pnpm install
cp .env.example .env   # already done, edit if needed
pnpm prisma:generate
pnpm prisma migrate dev --name init
pnpm start:dev

# Frontend (new terminal)
cd frontend
pnpm install
pnpm dev
```

## Definition of Done for Phase 0 (check these off)

- [ ] `docker compose up` brings up all 5 services without errors
- [ ] `GET /health` returns `{ success: true, data: { status: "ok", ... } }`
- [ ] Swagger UI loads at `/api/docs` and shows the health endpoint
- [ ] Frontend loads and displays `Backend status: ok`
- [ ] First Prisma migration (`init`) runs cleanly against Postgres
- [ ] Repo pushed to GitHub with this structure as the initial commit

## Next step

Once everything above is checked off, move to **Phase 1.1 — Organization Module**
in `build-plan.md`.
