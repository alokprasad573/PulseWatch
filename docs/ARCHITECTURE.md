# PulseWatch — System Architecture & Design Specification

**Document:** `docs/Architecture.md`  
**Version:** 2.1.0  
**Status:** Implemented / Verified against Codebase  
**Architecture Style:** Modular Monorepo + Express.js MVC Backend + Next.js 14 App Router Frontend + Distributed Probing Engine  
**Repository Tooling:** npm Workspaces (`npm@11.20.0`) + Turborepo (`turbo@2.4.4`) + Docker Compose  

---

## 1. System Architecture Overview

PulseWatch is an enterprise-grade API monitoring, uptime verification, and incident management platform. The codebase is organized as a monorepo separating client web applications, an Express.js MVC REST API, autonomous background scheduling and probe execution services, and shared workspace packages.

### 1.1 Architectural Highlights
- **Layered MVC Backend:** Clear separation of concerns where Controllers handle HTTP requests and validation, Services execute domain logic and coordination, and Repositories encapsulate database access through Prisma ORM.
- **Dual Deployment Topologies:**
  1. *Distributed Architecture:* Backend API, Scheduler daemon, and Probe Worker run as decoupled, independently scalable containers coordinated via Redis queues.
  2. *Embedded Architecture (`ENABLE_EMBEDDED_WORKERS=true`):* The Express server boots the Scheduler daemon and Worker inside the primary backend process (configured in `backend/src/server.ts`), enabling full platform functionality within a single web service container (e.g. on Render Free Tier).
- **SSRF & DNS Rebinding Shield:** Pre-flight DNS validation checks all resolved IPv4 and IPv6 addresses against private, loopback, carrier-grade NAT, link-local, and cloud metadata CIDR ranges (such as `169.254.169.254` and `fd00::/8`). Outgoing HTTP/HTTPS sockets are pinned directly to the verified IP address with the original `Host` header preserved, preventing Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks (`services/worker/src/ssrf.ts` & `executor.ts`).
- **High-Resolution Network Timing:** Raw socket lifecycle events and `process.hrtime.bigint()` measure network round trips with sub-millisecond precision (`services/worker/src/executor.ts`).
- **Incident Hysteresis Engine:** An incident is triggered only after 3 consecutive check failures and automatically resolved after 2 consecutive successes, suppressing false alarms from transient network anomalies (`services/worker/src/incidents.ts`).
- **Transactional Outbox & Alerting:** Incident state transitions atomically stage alert records in the `outbox_events` table within the check transaction, followed by asynchronous delivery to Slack Incoming Webhooks with Block Kit payloads (`services/worker/src/slack.ts`).

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client & Frontend Layer"]
        BrowserUser["Engineer / Operator Browser"]
        NextWeb["Next.js 14 Web UI (Port 3000)<br/>frontend/"]
    end

    subgraph ApiGatewayLayer ["Backend REST API (Express.js MVC)"]
        ExpressApi["Express.js REST API (Port 4001)<br/>backend/src/"]
        Routes["Express Routers<br/>/api/v1 (auth, monitors, incidents, dashboard, health)"]
        Controllers["Controllers Layer<br/>(Auth, Monitor, Incident, Dashboard, Health)"]
        Services["Domain Services Layer<br/>(AuthService, MonitorService, IncidentService, HealthService)"]
        Repositories["Prisma Repositories Layer<br/>(UserRepository, MonitorRepository, IncidentRepository, DashboardRepository)"]
        
        ExpressApi --> Routes --> Controllers --> Services --> Repositories
    end

    subgraph DataStorageLayer ["Data Persistence & Message Broker"]
        PostgresDB[("PostgreSQL 15+ (Prisma ORM)<br/>packages/database/")]
        RedisQueue[("Redis 7 (BullMQ Broker)<br/>Queue: pulsewatch-monitoring-queue")]
    end

    subgraph BackgroundExecutionLayer ["Autonomous Execution & Probing Fleet"]
        SchedulerDaemon["Scheduler Daemon (5s Poll / 60s Leases)<br/>services/scheduler/"]
        WorkerProber["Worker Engine (SSRF Shield + HTTP Prober)<br/>services/worker/"]
    end

    subgraph ExternalTargetsLayer ["External Targets & Alert Destinations"]
        ExternalApis["Target Public Endpoints"]
        SlackApi["Slack Incoming Webhook API"]
    end

    BrowserUser -->|HTTPS| NextWeb
    NextWeb -->|REST API / Bearer JWT| ExpressApi
    Repositories -->|Prisma Client| PostgresDB
    ExpressApi -.->|Health Probe Ping| RedisQueue

    SchedulerDaemon -->|Query Due Monitors & Claim Leases| PostgresDB
    SchedulerDaemon -->|Enqueue MonitoringJob| RedisQueue

    WorkerProber -->|Consume MonitoringJob| RedisQueue
    WorkerProber -->|DNS Validation & Pinned Socket Probe| ExternalApis
    WorkerProber -->|Persist MonitorCheck & Transition Incident| PostgresDB
    WorkerProber -->|Dispatch Block Kit Alert| SlackApi
```

---

## 3. Monorepo Directory Organization

```
PulseWatch/
├── frontend/                     # Next.js 14 App Router web application
│   ├── src/
│   │   ├── app/                  # App Router pages (/dashboard, /monitors, /monitors/[id], /incidents, /login, /register)
│   │   ├── components/           # UI layout, monitor modal, forms, Recharts components
│   │   ├── context/              # AuthContext and state providers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # API client (apiRequest, token storage, 401 refresh interceptor)
│   │   └── types/                # Frontend TypeScript types
│   ├── public/                   # Static icons and assets
│   ├── Dockerfile                # Multi-stage production container (node:24-alpine)
│   ├── package.json              # Dependencies: @pulsewatch/shared, next, react, recharts, @tanstack/react-query
│   └── tsconfig.json
│
├── backend/                      # Express.js REST API with MVC Architecture
│   ├── src/
│   │   ├── config/               # Configuration wrapper over @pulsewatch/config
│   │   ├── controllers/          # HTTP controllers (auth, monitor, incident, dashboard, health)
│   │   ├── services/             # Domain business logic & crypto/token orchestration
│   │   ├── repositories/         # Prisma data-access abstraction layer
│   │   ├── routes/               # Modular Express routers mounted at /api/v1 (and /api/vi alias)
│   │   ├── middlewares/          # JWT authenticate, Zod validate, rate limiting, error handling, logging
│   │   ├── validators/           # Zod schemas for request validation (auth, monitor, incident)
│   │   ├── utils/                # JWT sign/verify, Argon2id hashing, logger, errors, response formatters
│   │   ├── types/                # AuthenticatedRequest and backend internal types
│   │   ├── app.ts                # Express app setup, CORS, Helmet, middleware pipeline
│   │   └── server.ts             # Server bootstrap, DB health check, embedded worker lifecycle, graceful shutdown
│   ├── Dockerfile                # Multi-stage production container (node:24-alpine)
│   ├── package.json              # Dependencies: express, helmet, cors, argon2, jsonwebtoken, zod
│   └── tsconfig.json
│
├── services/                     # Autonomous background daemons
│   ├── scheduler/                # Monitor scheduling service
│   │   ├── src/index.ts          # 5-second polling loop, atomic occurrence claiming, BullMQ job dispatch
│   │   ├── Dockerfile            # Multi-stage production container (node:24-alpine)
│   │   └── package.json          # Dependencies: @pulsewatch/config, @pulsewatch/database, bullmq, ioredis
│   └── worker/                   # Distributed probe execution worker
│       ├── src/
│       │   ├── executor.ts       # Raw HTTP/HTTPS socket client with sub-millisecond process.hrtime timing
│       │   ├── ssrf.ts           # Pre-flight DNS resolution, private IP/CIDR blocking, socket IP pinning
│       │   ├── incidents.ts      # Incident state machine (3-strike outage, 2-strike recovery)
│       │   ├── slack.ts          # Slack Block Kit notification dispatcher
│       │   └── index.ts          # BullMQ queue consumer (queue: pulsewatch-monitoring-queue)
│       ├── Dockerfile            # Multi-stage production container (node:24-alpine)
│       └── package.json          # Dependencies: @pulsewatch/config, @pulsewatch/database, @pulsewatch/shared, bullmq, ioredis
│
├── packages/                     # Shared monorepo packages
│   ├── config/                   # Centralized environment validation and constants
│   │   ├── src/index.ts          # Zod envSchema, getEnv(), QUEUE_NAMES, CONSTANTS
│   │   └── package.json
│   ├── database/                 # Prisma ORM layer
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # PostgreSQL models, enums, indexes, relation rules
│   │   │   └── migrations/       # Prisma migration history
│   │   ├── src/index.ts          # Instantiated PrismaClient singleton and connection health helpers
│   │   └── package.json          # Prisma CLI, dotenv-cli, @prisma/client
│   └── shared/                   # Cross-package TypeScript interfaces and DTOs
│       ├── src/index.ts          # Domain enums, ApiResponse, UserDto, MonitorDto, IncidentDto, MonitoringJob
│       └── package.json
│
├── docs/                         # Project technical documentation
│   ├── API_specification.md      # Exhaustive REST API specification
│   ├── Architecture.md           # System architecture, monorepo layout, and runtime flows
│   └── Database.md               # Database schema, table definitions, and ER diagram
│
├── test/                         # Verification harnesses and test suites
│   ├── api-endpoints.test.ts     # 29-test comprehensive API endpoint and auth contract verification suite
│   ├── system-verification.ts    # System lifecycle and health test harness
│   └── test-slack.ts             # Slack webhook integration verification utility
│
├── docker-compose.yml            # Multi-container orchestration (postgres, redis, backend, scheduler, worker, frontend)
├── docker-compose.prod.yml       # Production Docker Compose specification
├── render.yaml                   # Render Blueprint deployment configuration
├── package.json                  # Root npm workspace configuration (npm@11.20.0)
├── package-lock.json             # Root npm lockfile
└── turbo.json                    # Turborepo task pipeline configuration
```

---

## 4. Express.js MVC Architecture

The REST API strictly adheres to a layered **Model-View-Controller (MVC)** architectural pattern:

```
[ Incoming HTTP Request ]
       │
       ▼
[ Middleware Pipeline ] ────────► Helmet, CORS, Cookie-Parser, JSON Parser, Logger, Rate-Limiters
       │
       ▼
[ Routing Layer (routes/) ] ────► Matches URL path, applies authenticate & Zod validate middleware
       │
       ▼
[ Controller Layer ] ───────────► Unpacks req.body/params/query, calls Service, calls sendSuccess/sendError
       │
       ▼
[ Domain Service Layer ] ───────► Executes business logic, Argon2id hashing, JWT signing, IDOR authorization
       │
       ▼
[ Repository Layer ] ───────────► Executes typed queries via PrismaClient singleton
       │
       ▼
[ PostgreSQL Database ] ────────► Executes SQL queries, enforces constraints and transactions
```

### 4.1 Controllers (`backend/src/controllers/`)
- Extract validated parameters, query strings, and request bodies.
- Delegate all domain operations to corresponding domain services.
- Never write direct SQL or invoke Prisma directly.
- Return structured envelopes via `sendSuccess(res, message, data, statusCode, meta)` or pass errors to `next(error)`.

### 4.2 Services (`backend/src/services/`)
- Encapsulate business logic, such as Argon2id cryptographic hashing (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`), JWT token generation, refresh token hash generation and rotation, and tenant ownership checks.
- Handle transactional orchestration across repositories.

### 4.3 Repositories (`backend/src/repositories/`)
- Directly interact with `@pulsewatch/database` Prisma client.
- Provide clean async data-access interfaces (`create`, `findById`, `findMany`, `update`, `delete`, `getBatch24hStats`, `getMetrics`).
- Implement application-level transactional cascading deletes in `MonitorRepository.delete(id)` to safely clean up all child checks, occurrences, incidents, and aggregates.

---

## 5. Core Execution Flows

### 5.1 User Registration & Authentication Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Browser
    participant Route as auth.routes.ts
    participant Val as validate(registerSchema)
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Repo as UserRepository
    participant DB as PostgreSQL

    Client->>Route: POST /api/v1/auth/register { name, email, password }
    Route->>Val: Validate body against registerSchema
    Val-->>Route: Body is valid
    Route->>Ctrl: register(req, res, next)
    Ctrl->>Svc: register(dto)
    Svc->>Repo: findByEmail(email)
    Repo->>DB: prisma.user.findUnique({ where: { email } })
    DB-->>Repo: null (no existing user)
    Svc->>Svc: Hash password via Argon2id (64MB memory, 3 iterations, 4 threads)
    Svc->>Repo: create({ name, email, passwordHash })
    Repo->>DB: prisma.user.create(...)
    DB-->>Repo: User record created
    Svc->>Svc: signAccessToken({ sub: user.id, email, name }) (15m expiry)
    Svc->>Svc: generateRefreshToken() -> rawRefreshToken & HMAC-SHA256 tokenHash
    Svc->>Repo: createRefreshToken({ userId, tokenHash, expiresAt })
    Repo->>DB: prisma.refreshToken.create(...)
    Svc-->>Ctrl: { tokens: { accessToken, expiresIn, user }, rawRefreshToken }
    Ctrl->>Ctrl: setRefreshCookie(res, rawRefreshToken) -> HttpOnly, Path=/api/v1/auth, MaxAge=30d
    Ctrl-->>Client: HTTP 201 Created with JSON Envelope & Set-Cookie
```

---

### 5.2 Monitor Scheduling & Probe Execution Flow

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Scheduler Daemon
    participant DB as PostgreSQL
    participant Redis as Redis (BullMQ)
    participant Worker as Worker Engine
    participant Target as External API Target
    participant Slack as Slack Webhook

    loop Every 5000ms (SCHEDULER_POLL_INTERVAL_MS)
        Sched->>DB: prisma.monitor.findMany({ where: { enabled: true, nextCheckAt <= now() } })
        DB-->>Sched: Array of due monitors
        loop For each due monitor
            Sched->>DB: prisma.$transaction (Create MonitoringOccurrence 'PENDING' & Advance monitor.nextCheckAt)
            Sched->>Redis: queue.add('pulsewatch-monitoring-queue', jobData, { jobId: occurrence.id })
        end
    end

    Redis->>Worker: Deliver MonitoringJob from queue
    Worker->>DB: Verify occurrence is not COMPLETED (Idempotency check)
    Worker->>Worker: Pre-flight DNS resolution & SSRF IP validation (block private/cloud metadata IPs)
    Worker->>Target: Execute HTTP probe via pinned IP raw socket (measure process.hrtime.bigint)
    Target-->>Worker: HTTP Response (Status code, response headers, body)
    
    Worker->>DB: prisma.$transaction:
    Note over Worker,DB: 1. Upsert monitor_checks record (statusCode, responseTimeMs, isSuccess)<br/>2. Update monitoring_occurrences to COMPLETED<br/>3. Evaluate incident state machine (failures vs threshold)
    
    opt Incident State Transition (OPENED, REOPENED, or RESOLVED)
        Worker->>DB: Stage outbox_events record
        Worker->>Slack: POST Block Kit Alert (Title, Status, URL, Response code, Error)
        Slack-->>Worker: HTTP 200 OK
        Worker->>DB: Update outbox_events to PUBLISHED
    end
```

---

## 6. Security Architecture

1. **SSRF Mitigation & DNS Rebinding Protection:**
   - Targets are validated before any TCP socket connection is initiated (`services/worker/src/ssrf.ts`).
   - Hostnames resolving to private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), link-local / AWS metadata (`169.254.0.0/16`), or private IPv6 (`fc00::/7`, `fe80::/10`, `::1`) are immediately rejected with `SSRF_VIOLATION`.
   - The connection is established directly to the verified `pinnedIp` while transmitting the legitimate `Host` header to eliminate DNS rebinding vectors.
2. **Password Security:**
   - Passwords are encrypted using Argon2id (`argon2.argon2id`) with high memory and iteration parameters (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`).
3. **Session & Cookie Security:**
   - Access tokens are short-lived (15 minutes).
   - Refresh tokens are long-lived (30 days) and stored in the database exclusively as HMAC-SHA256 hashes (`token_hash`).
   - The raw refresh token is transmitted solely via an `HttpOnly`, `Path=/api/v1/auth`, `SameSite=Strict` cookie, rendering it inaccessible to client JavaScript.
4. **Tenant Isolation:**
   - Every read and write query in repositories scopes operations by the authenticated `userId` extracted from the verified JWT payload.
