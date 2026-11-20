# PulseWatch — API Specification

**Document:** `docs/API_specification.md`  
**Version:** 2.0.0  
**Status:** Production / Implemented  
**Backend Framework:** Express.js + TypeScript (MVC Architecture)  
**Database:** PostgreSQL (Prisma ORM)  
**API Style:** REST (JSON over HTTP/HTTPS)

---

## 1. API Overview & Design Principles

The PulseWatch REST API is engineered on Express.js with a modular MVC architecture. It serves as the primary communication gateway between the Next.js frontend, developer automations, and background services.

### 1.1 Base URLs & Versioning
- **Local Development**: `http://localhost:4001/api/v1`
- **Docker Compose**: `http://localhost:4001/api/v1` (Internal container name: `http://backend:4001/api/v1`)
- **Root Health Probes**: `http://localhost:4001/health` and `http://localhost:4001/ready`
- **API Versioning**: Domain routes are mounted under `/api/v1`.

### 1.2 Core Architectural Principles
- **Standardized Response Envelope**: All endpoints return deterministic JSON payloads:
  ```json
  {
    "success": true,
    "message": "Resource retrieved successfully",
    "data": { ... },
    "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
  }
  ```
- **Standardized Error Envelope**: Consistent error structures for client and server errors:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Validation failed",
    "errors": { "url": ["Must be a valid HTTP or HTTPS URL"] },
    "timestamp": "2026-11-20T10:00:00.000Z",
    "path": "/api/v1/monitors"
  }
  ```
- **Dual-Token Authentication**: 15-minute JWT access tokens (`Authorization: Bearer <token>` or `pulsewatch_access_token` cookie) paired with 30-day refresh tokens securely stored in `HttpOnly`, `SameSite=Strict` cookies (`pulsewatch_refresh_token`).
- **Tenant Isolation**: Every database interaction filters by the authenticated `user.id` to prevent Insecure Direct Object References (IDOR).

---

## 2. API Endpoints Catalog

### Summary
1. **Authentication** (`/api/v1/auth`) — 5 endpoints
2. **Monitors** (`/api/v1/monitors`) — 9 endpoints
3. **Incidents** (`/api/v1/incidents`) — 3 endpoints
4. **Dashboard** (`/api/v1/dashboard`) — 2 endpoints
5. **System Health** (`/health`, `/ready`, `/api/v1/health`) — 3 endpoints

---

### 2.1 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
Creates a new tenant user account, hashes password via Argon2id, generates JWT tokens, and sets the refresh cookie.

- **Auth**: None (Public, Rate-Limited)
- **Request Body**:
  ```json
  {
    "name": "Jane Engineer",
    "email": "jane@pulsewatch.io",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Account registered successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "15m",
      "user": {
        "id": "e2a4b860-64f3-4a12-8e11-1a0e883901b0",
        "name": "Jane Engineer",
        "email": "jane@pulsewatch.io",
        "createdAt": "2026-11-20T10:00:00.000Z",
        "updatedAt": "2026-11-20T10:00:00.000Z"
      }
    },
    "meta": null
  }
  ```

---

#### `POST /api/v1/auth/login`
Authenticates credentials, updates cookies, and issues access token.

- **Auth**: None (Public, Rate-Limited)
- **Request Body**:
  ```json
  {
    "email": "jane@pulsewatch.io",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**: Returns `tokens` payload identical to register.

---

#### `POST /api/v1/auth/refresh`
Performs atomic refresh token rotation. Replaces the current refresh token with a fresh one. If reuse is detected, revokes all user sessions.

- **Auth**: `pulsewatch_refresh_token` cookie required.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "15m",
      "user": { ... }
    },
    "meta": null
  }
  ```

---

#### `POST /api/v1/auth/logout`
Revokes active refresh token in the database and clears the refresh cookie.

- **Auth**: Optional JWT or refresh cookie.
- **Response (200 OK)**: `{ "success": true, "message": "Logged out successfully", "data": null }`

---

#### `GET /api/v1/auth/me`
Retrieves authenticated user profile.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns `UserDto`.

---

### 2.2 Monitor Management Module (`/api/v1/monitors`)

#### `POST /api/v1/monitors`
Registers a new HTTP/HTTPS endpoint to be monitored.

- **Auth**: `Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Production Checkout API",
    "url": "https://api.ecommerce.com/v1/health",
    "method": "GET",
    "intervalSeconds": 60,
    "timeoutMs": 8000,
    "expectedStatusCode": 200,
    "enabled": true
  }
  ```
- **Response (201 Created)**: Returns created `MonitorDto`.

---

#### `GET /api/v1/monitors`
Lists all monitors owned by the authenticated tenant with 24-hour uptime metrics.

- **Auth**: `Bearer <token>`
- **Query Params**: `page` (default: 1), `limit` (default: 20).
- **Response (200 OK)**: Paginated array of `MonitorDto` with `uptime24h` and `avgResponseTime24h`.

---

#### `GET /api/v1/monitors/:id`
Retrieves granular monitor details.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns detailed `MonitorDto`.

---

#### `PATCH /api/v1/monitors/:id`
Updates monitor configuration (name, url, method, interval, timeout, expected status).

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns updated `MonitorDto`.

---

#### `PATCH /api/v1/monitors/:id/enable` & `PATCH /api/v1/monitors/:id/disable`
Toggles active scheduling of the monitor.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns monitor with updated `enabled: true/false`.

---

#### `DELETE /api/v1/monitors/:id`
Permanently deletes monitor and cascades deletion to child checks and occurrences.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: `{ "success": true, "message": "Monitor deleted successfully", "data": null }`

---

#### `GET /api/v1/monitors/:id/checks`
Retrieves execution checks and response time logs.

- **Auth**: `Bearer <token>`
- **Query Params**: `limit` (default: 50, max: 200).
- **Response (200 OK)**: Array of `MonitorCheckDto`.

---

#### `GET /api/v1/monitors/:id/metrics`
Retrieves pre-aggregated metrics (24h, 7d, 30d uptime percentages and latency history).

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns `MonitorAnalyticsDto`.

---

### 2.3 Incident Management Module (`/api/v1/incidents`)

#### `GET /api/v1/incidents`
Lists historical and active outage incidents scoped to the user.

- **Auth**: `Bearer <token>`
- **Query Params**: `page`, `limit`, `status` (`OPEN`, `RECOVERING`, `RESOLVED`).
- **Response (200 OK)**: Paginated array of `IncidentDto`.

---

#### `GET /api/v1/incidents/:id`
Retrieves incident details with complete event audit trail (`IncidentEvent` records).

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns `IncidentDto` with `events`.

---

#### `PATCH /api/v1/incidents/:id`
Updates an incident's title, description, or status.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**: Returns updated `IncidentDto`.

---

### 2.4 Dashboard Module (`/api/v1/dashboard`)

#### `GET /api/v1/dashboard/summary` & `GET /api/v1/dashboard`
Calculates high-level telemetry and status counts for the executive dashboard overview.

- **Auth**: `Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Dashboard summary retrieved successfully",
    "data": {
      "totalMonitors": 12,
      "operationalMonitors": 11,
      "downMonitors": 1,
      "pausedMonitors": 0,
      "activeIncidents": 1,
      "overallUptime24h": 99.85,
      "averageResponseTime24h": 48,
      "recentIncidents": [ ... ],
      "recentChecks": [ ... ]
    },
    "meta": null
  }
  ```

---

### 2.5 Health & Liveness Module

#### `GET /health` & `GET /api/v1/health`
Probes database and Redis connectivity to provide liveness status for Docker and orchestrators.

- **Auth**: Public
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "System health is ok",
    "data": {
      "status": "ok",
      "timestamp": "2026-11-20T10:00:00.000Z",
      "uptimeSeconds": 3600,
      "services": {
        "database": { "status": "up", "latencyMs": 2 },
        "redis": { "status": "up", "latencyMs": 1 }
      },
      "memory": { "heapUsedMB": 45, "heapTotalMB": 80, "rssMB": 110 }
    }
  }
  ```

#### `GET /ready` & `GET /api/v1/health/ready`
Database readiness probe returning HTTP 200 when ready, HTTP 503 when disconnected.
