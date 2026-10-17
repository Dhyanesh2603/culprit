# Railway Deployment Guide

This guide provides step-by-step instructions for deploying Culprit to Railway using a standard multi-service architecture (PostgreSQL + Express Backend + Next.js 15 Frontend).

---

## Architecture Overview on Railway

Your Railway Project will contain three services created from this single repository:

```
[Railway Project: Culprit]
├── 1. PostgreSQL Database Service (Provisioned via Railway)
├── 2. Backend Service (Root Directory: /backend)
└── 3. Frontend Service (Root Directory: /frontend)
```

---

## Step 1: Create a Railway Project and Provision PostgreSQL

1. Log into your [Railway Dashboard](https://railway.app).
2. Click **New Project**.
3. Select **Provision PostgreSQL**.
4. Railway will create a managed PostgreSQL instance and automatically expose a `DATABASE_URL` reference variable.

---

## Step 2: Deploy the Backend Service

1. Inside your Railway project canvas, click **+ New** -> **GitHub Repo**.
2. Select your repository: `Dhyanesh2603/culprit`.
3. Before deploying, click **Settings** for this newly added service:
   - **Service Name:** Change to `culprit-backend`.
   - **Root Directory:** Set to `/backend` (Important: do not leave as root).
   - **Build Command:** `npm install && npm run build` (or leave default to use `backend/railway.json`).
   - **Start Command:** `npm run start:railway` (or leave default to use `backend/railway.json`).
4. Go to the **Variables** tab for the backend service and configure:
   - `DATABASE_URL`: Click **Add Reference** and select the PostgreSQL `DATABASE_URL` from Step 1.
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Generate a secure 32-character string.
   - `GITHUB_WEBHOOK_SECRET`: Optional secret for GitHub webhooks.
   - `CORS_ORIGIN`: `*` (or your frontend Railway domain once generated).
5. Go to the **Networking** tab:
   - Click **Generate Domain** (e.g. `culprit-backend-production.up.railway.app`).
   - Copy this URL (you will need it for the frontend).
6. Verify deployment by visiting: `https://<your-backend-domain>/health`. You should see `{"status":"UP"}`.

---

## Step 3: Deploy the Frontend Service

1. Inside the same Railway project canvas, click **+ New** -> **GitHub Repo** again.
2. Select the same repository: `Dhyanesh2603/culprit`.
3. Click **Settings** for this second service:
   - **Service Name:** Change to `culprit-frontend`.
   - **Root Directory:** Set to `/frontend` (Important: do not leave as root).
   - **Build Command:** `npm install && npm run build`.
   - **Start Command:** `npm start`.
4. Go to the **Variables** tab and configure:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-domain>/api/v1` (replace with backend domain from Step 2).
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<your-backend-domain>` (replace with backend domain from Step 2).
   - `NODE_ENV`: `production`
5. Go to the **Networking** tab:
   - Click **Generate Domain** (e.g. `culprit-frontend-production.up.railway.app`).
6. Open your frontend domain in the browser to access Culprit in production.

---

## Automatic Database Migrations and Seeding

The backend `start:railway` command executes:
```bash
node scripts/prepare-prisma.js && npx prisma db push --schema=prisma/schema.postgresql.prisma && tsx prisma/seed.ts && node dist/server.js
```

This guarantees that:
- The PostgreSQL schema is pushed to the Railway database automatically on startup.
- The default engineering dataset (services, users, sample deployments, and incidents) is seeded.
- The server starts listening on Railway's assigned dynamic `PORT`.

---

## Railway Configuration Files Reference

This repository includes native Railway configuration files:
- `backend/railway.json`: Declares Nixpacks build and deployment settings with automated healthcheck probes at `/health`.
- `frontend/railway.json`: Declares Next.js 15 build and production start commands.
- `railway.json`: Root monorepo fallback configuration.
- `backend/scripts/prepare-prisma.js`: Detects PostgreSQL on Railway vs SQLite locally.
