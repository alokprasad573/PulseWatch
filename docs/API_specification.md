# PulseWatch — API Specification

**Document:** `docs/API_specification.md`  
**Version:** 2.1.0  
**Status:** Implemented / Verified against Codebase  
**Backend Framework:** Express.js 4.x + TypeScript (MVC Architecture)  
**Database ORM:** Prisma ORM v5.22.0 on PostgreSQL 15+  
**API Style:** REST (Deterministic JSON over HTTP/HTTPS)  

---

## 1. API Architecture & Design Principles

The PulseWatch REST API serves as the primary communication gateway between the Next.js frontend, developer automations, and operational health probes. All endpoints strictly adhere to standard HTTP status codes, structured envelopes, and tenant-isolated data operations.

### 1.1 Base URLs & Versioning
- **Local Development**: `http://localhost:4001/api/v1`
- **Docker Compose**: `http://localhost:4001/api/v1` (Container-to-container internal: `http://backend:4001/api/v1`)
- **Root Health Probes**: `http://localhost:4001/health` and `http://localhost:4001/ready`
- **API Versioning**: Domain routes are mounted under `/api/v1`. An alias route mount (`/api/vi`) is also active on the Express application to tolerate common Roman-numeral typing errors.

### 1.2 Rate Limiting Policies (`backend/src/middlewares/rateLimiter.middleware.ts`)
- **General API Limiter (`apiRateLimiter`):** Applied to all `/api/*` endpoints. Limits each IP address to **1000 requests per 15-minute window**. Exceeding returns HTTP 429.
- **Sensitive Auth Limiter (`authRateLimiter`):** Applied to `/api/v1/auth/register` and `/api/v1/auth/login`. Limits each IP to **50 requests per 15-minute window**. Exceeding returns HTTP 429.

### 1.3 Standardized Response Envelope (`@pulsewatch/shared` & `backend/src/utils/response.ts`)

#### Successful Response (`sendSuccess`)
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```
*Note: `meta` is `null` for non-paginated single-resource operations.*

#### Error Response (`sendError`)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "url": ["Must be a valid HTTP or HTTPS URL"]
  },
  "timestamp": "2026-11-23T16:00:00.000Z",
  "path": "/api/v1/monitors"
}
```

### 1.4 Dual-Token Authentication Model
1. **Access Token (Short-Lived):**
   - Standard: Signed JWT (`HS256`, 15-minute lifespan).
   - Ingestion: Supplied via HTTP Header `Authorization: Bearer <token>` or fallback cookie `pulsewatch_access_token`.
2. **Refresh Token (Long-Lived, Rotated):**
   - Standard: Cryptographically random 64-byte hex string (30-day lifespan), stored exclusively in PostgreSQL as an HMAC-SHA256 hash (`token_hash`).
   - Transmission: Delivered strictly through an `HttpOnly`, `Path=/api/v1/auth`, `SameSite=Strict` (or `Lax` in development) cookie named `pulsewatch_refresh_token`.
   - Security: Reusing a previously rotated refresh token immediately revokes all active sessions for the compromised user account (`UserRepository.revokeAllUserRefreshTokens`).

---

## 2. API Endpoints Catalog

### Endpoint Index
- **System Health** (Public): `GET /health`, `GET /ready`, `GET /`, `GET /api/v1/health`, `GET /api/v1/health/health`, `GET /api/v1/health/ready`
- **Authentication** (`/api/v1/auth`):
  - `POST /api/v1/auth/register` (Public, Rate-Limited)
  - `POST /api/v1/auth/login` (Public, Rate-Limited)
  - `POST /api/v1/auth/refresh` (Cookie Authenticated)
  - `POST /api/v1/auth/logout` (Public / Authenticated)
  - `GET /api/v1/auth/me` (Protected)
- **Monitors** (`/api/v1/monitors`): All Protected (`Bearer <token>`)
  - `POST /api/v1/monitors`
  - `GET /api/v1/monitors`
  - `GET /api/v1/monitors/:id`
  - `PATCH /api/v1/monitors/:id`
  - `PATCH /api/v1/monitors/:id/enable`
  - `PATCH /api/v1/monitors/:id/disable`
  - `DELETE /api/v1/monitors/:id`
  - `GET /api/v1/monitors/:id/checks`
  - `GET /api/v1/monitors/:id/metrics`
- **Incidents** (`/api/v1/incidents`): All Protected (`Bearer <token>`)
  - `GET /api/v1/incidents`
  - `GET /api/v1/incidents/:id`
  - `PATCH /api/v1/incidents/:id`
- **Dashboard** (`/api/v1/dashboard`): All Protected (`Bearer <token>`)
  - `GET /api/v1/dashboard/summary`
  - `GET /api/v1/dashboard` (Alias to `/summary`)

---

## 3. Detailed Endpoint Specifications

### 3.1 System Health & Probes

#### `GET /health` & `GET /api/v1/health` & `GET /`
Returns runtime liveness and component connectivity metrics (PostgreSQL and Redis).
- **Authentication:** Public
- **HTTP Status Codes:**
  - `200 OK`: When overall health status is `ok` or `degraded`.
  - `503 Service Unavailable`: When overall health status is `error` (both database and Redis are unreachable).
- **Response Shape:**
  ```json
  {
    "success": true,
    "message": "System health is ok",
    "data": {
      "status": "ok",
      "timestamp": "2026-11-23T16:00:00.000Z",
      "uptimeSeconds": 7200,
      "services": {
        "database": {
          "status": "up",
          "latencyMs": 4
        },
        "redis": {
          "status": "up",
          "latencyMs": 2
        }
      },
      "memory": {
        "heapUsedMB": 42,
        "heapTotalMB": 64,
        "rssMB": 98
      }
    }
  }
  ```

#### `GET /ready` & `GET /api/v1/health/ready`
Database readiness probe for container orchestrators (Docker, Kubernetes).
- **Authentication:** Public
- **HTTP Status Codes:** `200 OK` (Ready), `503 Service Unavailable` (Database unreachable).
- **Response Shape:**
  ```json
  {
    "success": true,
    "message": "System is ready",
    "data": {
      "ready": true
    }
  }
  ```

---

### 3.2 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
Creates a tenant account, generates an Argon2id password hash, issues JWT tokens, and sets the secure refresh cookie.
- **Authentication:** Public (Protected by `authRateLimiter`, max 50 requests / 15m)
- **Validation Rules (`registerSchema`):**
  - `name`: string, trimmed, 1–100 characters.
  - `email`: string, trimmed, valid email format, max 255 characters.
  - `password`: string, 8–100 characters.
- **Request Body:**
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex@pulsewatch.dev",
    "password": "StrongPassword123!"
  }
  ```
- **Response Headers:** `Set-Cookie: pulsewatch_refresh_token=<token>; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=2592000`
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account registered successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "15m",
      "user": {
        "id": "eeb103c8-e96b-4e12-8e11-1a0e883901b0",
        "name": "Alex Mercer",
        "email": "alex@pulsewatch.dev",
        "createdAt": "2026-11-23T16:00:00.000Z",
        "updatedAt": "2026-11-23T16:00:00.000Z"
      }
    },
    "meta": null
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure on missing fields, short password, or invalid email.
  - `409 Conflict`: `"An account with this email address already exists"`.
  - `429 Too Many Requests`: Rate limit exceeded.

---

#### `POST /api/v1/auth/login`
Authenticates user credentials against the stored Argon2id hash and issues a fresh session.
- **Authentication:** Public (Protected by `authRateLimiter`)
- **Validation Rules (`loginSchema`):**
  - `email`: string, trimmed, valid email format.
  - `password`: string, minimum 1 character.
- **Request Body:**
  ```json
  {
    "email": "alex@pulsewatch.dev",
    "password": "StrongPassword123!"
  }
  ```
- **Response (200 OK):** Identical `tokens` structure as `POST /register`.
- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: `"Invalid email or password"`.

---

#### `POST /api/v1/auth/refresh`
Performs atomic refresh-token rotation. Revokes the old refresh token, creates a new one in PostgreSQL, updates the cookie, and generates a new access token.
- **Authentication:** Cookie-based (`pulsewatch_refresh_token` required in request cookies).
- **HTTP Method Contract:** Strict `POST`. `GET` is not supported (returns 404) to prevent CSRF and pre-fetch session disruption.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "15m",
      "user": {
        "id": "eeb103c8-e96b-4e12-8e11-1a0e883901b0",
        "name": "Alex Mercer",
        "email": "alex@pulsewatch.dev",
        "createdAt": "2026-11-23T16:00:00.000Z",
        "updatedAt": "2026-11-23T16:00:00.000Z"
      }
    },
    "meta": null
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `"Refresh token missing"`, `"Invalid refresh token"`, or `"Refresh token expired"`. (If token reuse is detected, all user refresh tokens are revoked).

---

#### `POST /api/v1/auth/logout`
Revokes the refresh token in PostgreSQL and clears the `pulsewatch_refresh_token` cookie.
- **Authentication:** Reads `pulsewatch_refresh_token` cookie if present.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "data": null,
    "meta": null
  }
  ```

---

#### `GET /api/v1/auth/me`
Retrieves profile data for the authenticated tenant.
- **Authentication:** Protected (`Authorization: Bearer <token>` or `pulsewatch_access_token` cookie).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
      "id": "eeb103c8-e96b-4e12-8e11-1a0e883901b0",
      "name": "Alex Mercer",
      "email": "alex@pulsewatch.dev",
      "createdAt": "2026-11-23T16:00:00.000Z",
      "updatedAt": "2026-11-23T16:00:00.000Z"
    },
    "meta": null
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Token missing, expired, or invalid.
  - `401 Unauthorized`: `"User account no longer exists"`.

---

### 3.3 Monitor Management Module (`/api/v1/monitors`)

*All routes in this module require `authenticate` middleware.*

#### `POST /api/v1/monitors`
Registers a new endpoint for autonomous monitoring.
- **Validation Rules (`createMonitorSchema`):**
  - `name`: string, trimmed, 1–100 characters.
  - `url`: string, trimmed, valid HTTP/HTTPS URL.
  - `method`: enum (`GET`, `HEAD`), default `GET`.
  - `intervalSeconds`: integer, 10–86400, default `60`.
  - `timeoutMs`: integer, 1000–30000, default `10000`.
  - `expectedStatusCode`: integer, 100–599, default `200`.
  - `enabled`: boolean, default `true`.
- **Request Body:**
  ```json
  {
    "name": "Billing API Healthz",
    "url": "https://api.example.com/healthz",
    "method": "GET",
    "intervalSeconds": 60,
    "timeoutMs": 10000,
    "expectedStatusCode": 200,
    "enabled": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Monitor created successfully",
    "data": {
      "id": "c741fe8f-4e2d-430e-a603-fc24fab5cff2",
      "userId": "eeb103c8-e96b-4e12-8e11-1a0e883901b0",
      "name": "Billing API Healthz",
      "url": "https://api.example.com/healthz",
      "method": "GET",
      "intervalSeconds": 60,
      "timeoutMs": 10000,
      "expectedStatusCode": 200,
      "enabled": true,
      "status": "UNKNOWN",
      "nextCheckAt": "2026-11-23T16:05:00.000Z",
      "createdAt": "2026-11-23T16:05:00.000Z",
      "updatedAt": "2026-11-23T16:05:00.000Z",
      "uptime24h": 100,
      "avgResponseTime24h": 0,
      "lastCheck": null
    },
    "meta": null
  }
  ```

---

#### `GET /api/v1/monitors`
Lists all monitors owned by the authenticated tenant with aggregated 24-hour uptime and latency metrics.
- **Query Parameters (`monitorQuerySchema`):**
  - `page`: integer $\ge 1$, default `1`.
  - `limit`: integer $1 \le \text{limit} \le 100$, default `20`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Monitors retrieved successfully",
    "data": [
      {
        "id": "c741fe8f-4e2d-430e-a603-fc24fab5cff2",
        "userId": "eeb103c8-e96b-4e12-8e11-1a0e883901b0",
        "name": "Billing API Healthz",
        "url": "https://api.example.com/healthz",
        "method": "GET",
        "intervalSeconds": 60,
        "timeoutMs": 10000,
        "expectedStatusCode": 200,
        "enabled": true,
        "status": "UP",
        "nextCheckAt": "2026-11-23T16:15:00.000Z",
        "createdAt": "2026-11-23T16:05:00.000Z",
        "updatedAt": "2026-11-23T16:14:00.000Z",
        "uptime24h": 99.85,
        "avgResponseTime24h": 142,
        "lastCheck": {
          "id": "18a99a05-cd25-4959-841b-648a449089a0",
          "monitorId": "c741fe8f-4e2d-430e-a603-fc24fab5cff2",
          "occurrenceId": "0f79fd54-3a69-46c3-a48f-05f3ca1cd32e",
          "statusCode": 200,
          "responseTimeMs": 138,
          "isSuccess": true,
          "errorType": null,
          "errorMessage": null,
          "checkedAt": "2026-11-23T16:14:00.000Z",
          "createdAt": "2026-11-23T16:14:00.000Z"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

#### `GET /api/v1/monitors/:id`
Retrieves granular monitor details with 24-hour stats.
- **URL Parameters:** `id` (UUID).
- **Response (200 OK):** Returns single `MonitorDto`.
- **Error Responses:**
  - `403 Forbidden`: If monitor belongs to a different user account.
  - `404 Not Found`: `"Monitor not found"`.

---

#### `PATCH /api/v1/monitors/:id`
Updates configuration settings for an existing monitor.
- **Validation Rules (`updateMonitorSchema`):** Optional subset of fields (`name`, `url`, `method`, `intervalSeconds`, `timeoutMs`, `expectedStatusCode`, `enabled`).
- **Response (200 OK):** Returns updated `MonitorDto`.

---

#### `PATCH /api/v1/monitors/:id/enable` & `PATCH /api/v1/monitors/:id/disable`
Toggles active scheduling for the monitor.
- `enable`: Sets `enabled: true`, `status: UNKNOWN`, and triggers immediate scheduling (`nextCheckAt: new Date()`).
- `disable`: Sets `enabled: false`, `status: PAUSED`, and pauses scheduling (`nextCheckAt: null`).
- **Response (200 OK):** Returns updated `MonitorDto`.

---

#### `DELETE /api/v1/monitors/:id`
Permanently deletes a monitor and executes an application-level transaction that cascades deletion across all related `monitor_checks`, `monitoring_occurrences`, `incident_events`, `incidents`, `monitor_hourly_aggregates`, and `monitor_daily_aggregates`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Monitor deleted successfully",
    "data": null,
    "meta": null
  }
  ```

---

#### `GET /api/v1/monitors/:id/checks`
Retrieves recent execution logs and probe check details.
- **Query Parameters:** `limit` (integer, default `50`).
- **Response (200 OK):** Array of `MonitorCheckDto` objects ordered by `checkedAt DESC`.

---

#### `GET /api/v1/monitors/:id/metrics`
Calculates multi-window uptime rollups and latency distributions.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Monitor metrics retrieved successfully",
    "data": {
      "monitorId": "c741fe8f-4e2d-430e-a603-fc24fab5cff2",
      "uptime24h": 100,
      "uptime7d": 99.9,
      "uptime30d": 99.85,
      "avgResponseTime24h": 142,
      "minResponseTime24h": 85,
      "maxResponseTime24h": 412,
      "history": [
        {
          "timestamp": "2026-11-23T16:14:00.000Z",
          "responseTimeMs": 138,
          "isSuccess": true,
          "statusCode": 200
        }
      ]
    },
    "meta": null
  }
  ```

---

### 3.4 Incident Management Module (`/api/v1/incidents`)

*All routes in this module require `authenticate` middleware.*

#### `GET /api/v1/incidents`
Lists historical and active outage incidents scoped to the authenticated tenant.
- **Query Parameters (`incidentQuerySchema`):**
  - `page`: integer $\ge 1$, default `1`.
  - `limit`: integer $1 \le \text{limit} \le 100$, default `20`.
  - `status`: optional enum (`OPEN`, `RECOVERING`, `RESOLVED`).
- **Response (200 OK):** Paginated array of `IncidentDto` including nested `monitor` summary and `events` audit trail.

---

#### `GET /api/v1/incidents/:id`
Retrieves an individual incident with complete chronological audit events (`IncidentEventDto`).
- **URL Parameters:** `id` (UUID).
- **Response (200 OK):** Single `IncidentDto`.
- **Error Responses:**
  - `403 Forbidden`: Incident belongs to another tenant.
  - `404 Not Found`: `"Incident not found"`.

---

#### `PATCH /api/v1/incidents/:id`
Updates title, description, or manually updates incident status.
- **Validation Rules (`updateIncidentSchema`):**
  - `title`: optional string, 1–255 characters.
  - `description`: optional string.
  - `status`: optional enum (`OPEN`, `RECOVERING`, `RESOLVED`).
- **Response (200 OK):** Returns updated `IncidentDto`.

---

### 3.5 Dashboard Module (`/api/v1/dashboard`)

*All routes in this module require `authenticate` middleware.*

#### `GET /api/v1/dashboard/summary` & `GET /api/v1/dashboard`
Aggregates platform-wide telemetry and overview statistics for the logged-in user.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Dashboard summary retrieved successfully",
    "data": {
      "totalMonitors": 4,
      "operationalMonitors": 3,
      "downMonitors": 1,
      "pausedMonitors": 0,
      "activeIncidents": 1,
      "overallUptime24h": 98.75,
      "averageResponseTime24h": 164,
      "recentIncidents": [ ... ],
      "recentChecks": [ ... ]
    },
    "meta": null
  }
  ```
