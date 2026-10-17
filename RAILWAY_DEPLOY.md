# Railway Deployment Guide

This repository supports two deployment modes on Railway:

1. **Option 1: Unified Single-Service Deployment (Recommended / Default)**
   Deploy the entire application (Next.js frontend + Express backend API + SQLite/Postgres database) in a single Railway service with zero configuration.
2. **Option 2: Multi-Service Architecture**
   Deploy backend and frontend as separate services within a Railway project canvas connected to a managed PostgreSQL database.

---

## Option 1: Unified Single-Service Deployment (Fastest)

This mode runs the entire stack in one container. Next.js serves the frontend on Railway's public `PORT` and automatically proxies `/api/*`, `/socket.io/*`, and `/health` to the Express backend running on internal port 5001.

### Steps:

1. Log into your [Railway Dashboard](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select `Dhyanesh2603/culprit`.
4. Railway will automatically detect Nixpacks, run `npm run build`, and start the stack via `node scripts/start-unified.js`.
5. Under service **Settings** -> **Networking**, click **Generate Domain** (e.g. `culprit-production.up.railway.app`).
6. (Optional) Under service **Variables**, you may attach a managed PostgreSQL database by setting `DATABASE_URL`. If omitted, Culprit automatically falls back to local SQLite with zero errors.

### Healthcheck:
Railway automatically monitors `/health`. Once healthy, visit your generated domain in your browser to use the application.

---

## Option 2: Multi-Service Architecture

For large teams requiring independent scaling for frontend and backend tiers:

### Service 1: PostgreSQL Database
1. In your Railway canvas, click **+ New** -> **Database** -> **Add PostgreSQL**.
2. Railway creates a managed PostgreSQL instance and sets `DATABASE_URL`.

### Service 2: Backend Service
1. In your canvas, click **+ New** -> **GitHub Repo** -> select `Dhyanesh2603/culprit`.
2. Under **Settings**:
   - **Service Name:** `culprit-backend`
   - **Root Directory:** `/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:railway`
3. Under **Variables**:
   - `DATABASE_URL`: Reference the PostgreSQL `DATABASE_URL` from Service 1.
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Secure 32-character secret key.
   - `CORS_ORIGIN`: `*`
4. Under **Networking**: Click **Generate Domain** and copy the domain.

### Service 3: Frontend Service
1. In your canvas, click **+ New** -> **GitHub Repo** -> select `Dhyanesh2603/culprit`.
2. Under **Settings**:
   - **Service Name:** `culprit-frontend`
   - **Root Directory:** `/frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Under **Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://<culprit-backend-domain>/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<culprit-backend-domain>`
4. Under **Networking**: Click **Generate Domain** to access the web application.

---

## Environment Variables Reference

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | Public port provided automatically by Railway | Automatic | `3000` |
| `DATABASE_URL` | PostgreSQL connection string or SQLite file path | Optional | `file:./dev.db` |
| `INTERNAL_BACKEND_PORT` | Internal port used by backend in unified mode | Optional | `5001` |
| `JWT_SECRET` | Secret key used for signing JWT tokens | Optional | Default development key |
| `GITHUB_WEBHOOK_SECRET` | Secret key used to verify GitHub webhook signatures | Optional | Demo secret |
| `NEXT_PUBLIC_API_URL` | Explicit backend API URL (only needed for Option 2) | Optional | Auto-proxied to internal backend |
| `NEXT_PUBLIC_SOCKET_URL` | Explicit Socket.IO URL (only needed for Option 2) | Optional | Auto-proxied to internal backend |
