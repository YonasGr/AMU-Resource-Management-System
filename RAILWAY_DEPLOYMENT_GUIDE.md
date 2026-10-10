# 🚀 Step-by-Step Guide: Deploying to Railway from GitHub

This guide walks you through deploying the **AMU Dedicated Store & Resource Management System** to [Railway](https://railway.com) directly from your GitHub repository.

Once deployed, Railway will automatically rebuild and redeploy your project on every `git push`, eliminating the need to rebuild or run Docker containers locally.

---

## 🏗️ Architecture Overview on Railway

Your project will run as 4 interconnected resources within a single Railway project:

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project Canvas                   │
│                                                             │
│  ┌────────────────────────┐     ┌────────────────────────┐  │
│  │   PostgreSQL Plugin    │     │      Redis Plugin      │  │
│  │   (Relational DB)      │     │  (Token Revocation)    │  │
│  └───────────▲────────────┘     └───────────▲────────────┘  │
│              │ (Private Network)            │               │
│              └──────────────┬───────────────┘               │
│                             │                               │
│                ┌────────────┴───────────┐                   │
│                │  amu-backend Service   │                   │
│                │   (NestJS API + Prisma)│                   │
│                └────────────▲───────────┘                   │
│                             │ (HTTPS REST API)              │
│                ┌────────────┴───────────┐                   │
│                │  amu-frontend Service  │                   │
│                │  (React/Vite SPA Nginx)│                   │
│                └────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites
1. A **GitHub account** with this repository pushed to your remote.
2. A **Railway account** (sign up at [railway.com](https://railway.com) using your GitHub account).

---

## Step 1: Push Your Code to GitHub

Commit the Railway configuration changes to your GitHub repository:

```bash
git add .
git commit -m "feat(deploy): configure project for Railway production deployment"
git push origin main
```

---

## Step 2: Create a New Project on Railway

1. Log into your [Railway Dashboard](https://railway.com/dashboard).
2. Click **"+ New Project"**.
3. Select **"Empty project"** (this gives you an empty canvas to add your services cleanly).

---

## Step 3: Add Managed PostgreSQL

1. On your project canvas, click **"+ Create"** (or press `Ctrl+K` / `Cmd+K`).
2. Select **"Database"** ➔ **"Add PostgreSQL"**.
3. Railway will provision a managed PostgreSQL 16 database within 5–10 seconds.
4. *(Optional)* Click on the PostgreSQL card and click the **"Variables"** tab to see `DATABASE_URL`. Railway automatically makes this available to other services.

---

## Step 4: Add Managed Redis

1. Click **"+ Create"** on the canvas.
2. Select **"Database"** ➔ **"Add Redis"**.
3. Railway will provision a managed Redis container within 5–10 seconds.
4. Railway creates variables such as `REDIS_URL`, `REDISHOST`, and `REDISPORT`.

---

## Step 5: Deploy the Backend Service (`amu-backend`)

1. Click **"+ Create"** ➔ **"GitHub Repo"**.
2. Select your repository: `AMU-Resource-Management-System`.
3. Before it builds, click on the newly created card and go to **"Settings"**:
   - **Service Name**: Rename it to `amu-backend` (optional, for clarity).
   - **Root Directory**: Set to `/backend` *(CRITICAL)*.
   - **Config File / Dockerfile Path**: Railway will automatically detect `backend/railway.json` and use `Dockerfile.prod`.
4. Go to the **"Variables"** tab of `amu-backend` and add the following:

| Variable Name | Recommended Value / Reference | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production optimizations |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Connects directly to your Railway PostgreSQL |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Connects directly to your Railway Redis |
| `JWT_ACCESS_SECRET` | *(64-character random string)* | Signs short-lived access tokens |
| `JWT_ACCESS_EXPIRES_IN` | `1d` | Access token lifespan |
| `JWT_REFRESH_SECRET` | *(64-character random string)* | Signs long-lived refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifespan |
| `AUTO_SEED` | `true` | Automatically seeds users & categories on 1st deploy |
| `ALLOW_DEFAULT_SEED_PASSWORDS` | `true` | Enables default passwords for testing/demo |

> 💡 **Tip for Secret Keys**: You can generate secure JWT keys in your Linux terminal:
> ```bash
> openssl rand -hex 32
> ```

5. Go to the **"Networking"** tab of `amu-backend`:
   - Click **"Generate Domain"** under Public Networking.
   - Railway will give you a public URL like: `https://amu-backend-production-xxxx.up.railway.app`.
   - **Copy this URL** — you will need it for the frontend in Step 6!

---

## Step 6: Deploy the Frontend Service (`amu-frontend`)

1. Click **"+ Create"** on the canvas ➔ **"GitHub Repo"**.
2. Select the same repository: `AMU-Resource-Management-System`.
3. Click on the new card and go to **"Settings"**:
   - **Service Name**: Rename to `amu-frontend`.
   - **Root Directory**: Set to `/frontend` *(CRITICAL)*.
   - **Config File / Dockerfile Path**: Railway will automatically detect `frontend/railway.json` and use `Dockerfile.prod`.
4. Go to the **"Variables"** tab of `amu-frontend`:
   - Add `VITE_API_BASE_URL`: Paste the backend URL from Step 5 (e.g. `https://amu-backend-production-xxxx.up.railway.app`).
5. Go to the **"Networking"** tab of `amu-frontend`:
   - Click **"Generate Domain"** under Public Networking.
   - Railway will give you a public URL like: `https://amu-frontend-production-xxxx.up.railway.app`.

---

## Step 7: Final Step — Link CORS on Backend

1. Click back on your **`amu-backend`** service card.
2. Go to the **"Variables"** tab.
3. Add or update `CORS_ORIGIN`:
   - Set to your frontend's generated domain: `https://amu-frontend-production-xxxx.up.railway.app`.
   *(Note: The backend automatically permits all `*.up.railway.app` origins by default, but explicitly setting `CORS_ORIGIN` is best practice for production).*
4. Railway will automatically restart the backend with the new setting in ~10 seconds.

---

## 🚀 Verification & Demo Access

Open your frontend URL in the browser: `https://amu-frontend-production-xxxx.up.railway.app`.

You can now log in using any of the standard system accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@store.com` | `Admin#AMU2026!SecureKey` |
| **Store Manager** | `manager@store.com` | `Manager#AMU2026!StoreKey` |
| **Storekeeper** | `keeper@store.com` | `Keeper#AMU2026!InventoryKey` |
| **Requester** | `requester@store.com` | `Requester#AMU2026!StaffKey` |
| **Internal Auditor** | `auditor@store.com` | `Auditor#AMU2026!AuditKey` |

Swagger API Documentation is also live at:
`https://amu-backend-production-xxxx.up.railway.app/api/docs`

---

## 🔄 Daily Workflow (Automatic Deploys on Push)

Now that Railway is connected:
1. Make code changes on your local machine.
2. Test or commit your changes:
   ```bash
   git add .
   git commit -m "feat: improve inventory report export"
   git push origin main
   ```
3. Railway automatically detects the commit, rebuilds the updated service, and deploys it with zero downtime.
4. **No manual `docker build` or container restarts are needed!**
