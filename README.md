# Culprit (Who Broke The Build?)

> Production Incident Attribution and Release Correlation Platform

Culprit is an incident intelligence and deployment correlation platform built for modern engineering teams. When production outages occur, software teams often spend 30 to 45 minutes manually reconciling alerts across observability tools, deployment pipelines, and git logs to answer: "Who deployed what, when, and which commit broke the build?"

Culprit unifies deployments, commits, and incidents into a single stream and executes an intelligent, deterministic mathematical correlation algorithm to pinpoint the responsible deployment, commit, and engineers with attribution confidence scores.

---

## Table of Contents

- [Core Principles](#core-principles)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup and Seeding](#database-setup-and-seeding)
  - [Running the Application](#running-the-application)
- [Docker Deployment](#docker-deployment)
- [API Reference](#api-reference)
- [Relationship Engine Scoring Algorithm](#relationship-engine-scoring-algorithm)
- [Repository Structure](#repository-structure)
- [License](#license)

---

## Core Principles

- **Deterministic Correlation, Not Generative Hallucinations:** Employs multi-factor heuristics based on wall-clock proximity decay, critical path risk scoring, and deployment health flags.
- **Strict Chronology and Out-of-Order Handling:** Webhooks and CI/CD events often arrive late. Culprit records both `occurredAt` and `receivedAt`, always sorting by `occurredAt` and surfacing late ingestion indicators.
- **Optimistic Concurrency Control:** Incident war rooms involve concurrent triage by multiple engineers. State updates use integer version counters to prevent lost updates and race conditions.
- **Append-Only Auditing:** Incident lifecycles, assignments, and status transitions are recorded in immutable audit tables.
- **Engineering-First Aesthetics:** Follows a minimal monochrome interface with charcoal surfaces and a single muted amber accent, avoiding gradients, saturated colors, and superfluous motion.

---

## Key Features

1. **Deterministic Relationship Engine**
   - Correlates incident occurrence timestamps against preceding releases and git diffs.
   - Evaluates critical path files (database migrations, schemas, authentication guards, payment gateways).
   - Generates confidence scores (0% to 99%) and human-readable attribution reasons.

2. **Incident War Room**
   - Real-time collaborative workspace over Socket.IO.
   - Status workflows: `OPEN` -> `INVESTIGATING` -> `MONITORING` -> `RESOLVED` -> `CLOSED`.
   - Threaded markdown discussion, developer assignment, and one-click markdown postmortem generation.

3. **Deployments and Rollback Management**
   - Releases tracked across environments (`PRODUCTION`, `STAGING`, `DEVELOPMENT`).
   - One-click rollback triggers that emit compensation deployments and update target release states.
   - Commit diff inspection detailing file modifications, additions, and deletions.

4. **Chronological Timeline Stream**
   - Merged stream of git commits, releases, status changes, assignments, and resolution notes.
   - Flags out-of-order webhook ingestions where `receivedAt - occurredAt > 2 minutes`.

5. **Live Repository Monitoring**
   - Monitors any public or private GitHub repository URL.
   - Ingests recent commit history, authors, and file-level diff statistics via GitHub REST APIs.
   - Supports GitHub Personal Access Tokens for authenticated rate limits.

6. **Interactive Demo Lab and Target Sandbox**
   - Integrated testing environment with a simulated microservice (`ShopFast Storefront`).
   - One-click failure scenarios: Stripe SDK migration breakage, authentication token memory leaks, and database pool exhaustion.

---

## System Architecture

```
[Browser / Client (Next.js 15 App Router)]
        |                           |
  (HTTP REST)                (WebSocket Events)
        v                           v
[Express.js API Layer]       [Socket.IO Server]
        |                           ^
        |--- Broadcasts Events -----|
        v
[Service Layer (Relationship Engine, Repo Sync, Timeline)]
        v
[Data Access Repositories]
        v
[Prisma ORM Client]
        v
[Database (PostgreSQL / SQLite)]
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Server & Client Components)
- **Library:** React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui design patterns
- **Data Fetching:** TanStack React Query v5
- **Forms & Validation:** React Hook Form, Zod
- **Visualizations:** Recharts
- **Icons:** Lucide Icons
- **Real-Time Client:** Socket.IO Client

### Backend
- **Runtime:** Node.js, Express.js, TypeScript
- **Architecture:** Clean Layered Architecture (Routes, Controllers, Services, Repositories, Middlewares, Validators)
- **Database & ORM:** PostgreSQL / SQLite via Prisma ORM
- **Real-Time Engine:** Socket.IO Server
- **Security:** Helmet, CORS, HMAC SHA-256 Webhook Verification
- **Validation:** Zod Schema Validation

---

## Getting Started

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm
- Git

### Installation

Clone the repository and install dependencies for both services:

```bash
git clone https://github.com/Dhyanesh2603/culprit.git
cd culprit

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Database Setup and Seeding

The application ships with SQLite support for zero-dependency local development, with full PostgreSQL production parity.

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Generate Prisma Client and apply migrations
npm run prisma:push

# Seed database with realistic engineering incidents, releases, and commits
npm run db:seed

cd ..
```

### Running the Application

In separate terminal windows:

```bash
# Terminal 1: Start Backend (Port 5001)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

Default local accounts are provisioned via the top-bar role switcher:
- **Admin:** `admin@company.internal` (Full project and user management)
- **Developer:** `alex.rivera@company.internal` (Deployments, incident triage, repo sync)
- **Viewer:** `viewer@company.internal` (Read-only access)

---

## Docker Deployment

To launch the full production stack with PostgreSQL, backend, and frontend:

```bash
docker compose up --build -d
```

Services exposed:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`
- PostgreSQL: `localhost:5432`

---

## API Reference

All REST endpoints are versioned under `/api/v1/`:

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Executive metrics, MTTR, failure trends | Viewer+ |
| `GET` | `/api/v1/projects` | List monitored services | Viewer+ |
| `POST` | `/api/v1/projects/connect-repo` | Connect and ingest GitHub repository | Developer+ |
| `POST` | `/api/v1/projects/:id/sync-github` | Synchronize latest git commits | Developer+ |
| `GET` | `/api/v1/deployments` | List deployments across environments | Viewer+ |
| `POST` | `/api/v1/deployments` | Record deployment with idempotency checks | Developer+ |
| `POST` | `/api/v1/deployments/:id/rollback` | Trigger rollback deployment | Developer+ |
| `GET` | `/api/v1/incidents` | List production outages | Viewer+ |
| `POST` | `/api/v1/incidents` | Create incident and execute attribution engine | Developer+ |
| `PATCH` | `/api/v1/incidents/:id` | Update incident status with OCC version checks | Developer+ |
| `GET` | `/api/v1/timeline/unified` | Merged chronological event stream | Viewer+ |
| `POST` | `/api/v1/demo/run-scenario` | Execute simulated outage scenario | Developer+ |
| `POST` | `/api/v1/webhooks/github` | Receive GitHub push and deployment webhooks | Public (HMAC) |

---

## Relationship Engine Scoring Algorithm

When an incident is reported with timestamp `T_incident`, the engine evaluates releases and commits within a lookback window `W` (default: 60-90 minutes):

1. **Proximity Score:**
   ```
   Delta_t = T_incident - T_deployment
   ProximityScore = 50 * max(0, 1 - (Delta_t / W))
   ```

2. **Status Penalties:**
   - Deployment marked `FAILED`: `+35 points`
   - Deployment is a `ROLLBACK`: `+20 points`

3. **Commit Risk Multipliers:**
   - Commit touching critical paths (`schema.prisma`, `migrations/`, `auth/`, `gateways/`, `payment/`, `config/`): `+25 points`
   - Diff blast radius (`lines changed > 200` or `files changed > 8`): `+15 points`

4. **Attribution Normalization:**
   ```
   ConfidenceScore = min(0.99, (TopDeploymentScore * 0.55 + TopCommitScore * 0.45) / 100)
   ```

---

## Repository Structure

```
culprit/
├── backend/
│   ├── src/
│   │   ├── config/            # App constants, roles, and environments
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── middlewares/       # Auth guards, RBAC, Zod validation, error handler
│   │   ├── prisma/            # Prisma client singleton
│   │   ├── repositories/      # Data access layer
│   │   ├── routes/            # Express router modules
│   │   ├── services/          # Business logic and Relationship Engine
│   │   ├── sockets/           # Socket.IO room and event handlers
│   │   ├── types/             # Domain interfaces and DTOs
│   │   ├── utils/             # ApiResponse, logger, HMAC signature verification
│   │   └── validators/        # Zod input schemas
│   ├── prisma/
│   │   ├── schema.prisma      # SQLite/PostgreSQL schema
│   │   └── seed.ts            # Realistic engineering seed dataset
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js 15 App Router pages and layouts
│   │   ├── components/        # UI components, war room, timeline, charts
│   │   ├── context/           # AuthContext, ProjectContext, SocketContext
│   │   ├── lib/               # API client and utility functions
│   │   └── types/             # Frontend TypeScript interfaces
│   └── package.json
├── docker-compose.yml         # Containerized production stack
├── .gitignore
└── README.md
```

---

## License

This project is licensed under the MIT License.
