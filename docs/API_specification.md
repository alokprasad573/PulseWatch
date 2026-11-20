# PulseWatch — API Specification

**Document:** `docs/API_specification.md`  
**Version:** 1.0.0  
**Status:** Production / Implemented  
**Backend Framework:** NestJS 10  
**Language:** TypeScript  
**Database:** Supabase PostgreSQL (Prisma ORM)  
**API Style:** REST (JSON over HTTP/HTTPS)

---

## 1. API Overview & Design Principles

PulseWatch exposes a RESTful API for managing external endpoint monitors, retrieving real-time and historical health-check metrics, managing outages/incidents, tracking executive dashboard analytics, and monitoring platform system health.

### 1.1 Base URLs & Versioning
- **Local Development**: `http://localhost:4000/api/v1`
- **Docker Production Stack**: `http://localhost:4001/api/v1`
- **Root Health Check**: `http://localhost:4000/health` (Root probe for orchestrators/load balancers)
- **API Versioning**: All business domain routes are prefixed with `/api/v1`.

### 1.2 Core Architectural Principles
- **JSON Standard**: All requests and responses use `Content-Type: application/json`.
- **Stateless Authentication**: Protected routes require a valid JSON Web Token (JWT) provided via the `Authorization: Bearer <access_token>` header.
- **Secure Refresh Lifecycle**: Refresh tokens are stored strictly in `HttpOnly`, `SameSite=Strict` cookies (`pulsewatch_refresh_token`). Refresh tokens are never sent in JSON bodies.
- **Tenant Isolation**: Every monitor and incident query strictly filters by the authenticated user's ID (`userId`), guaranteeing complete isolation and preventing Insecure Direct Object References (IDOR).
- **Deterministic Response Envelope**: Every endpoint returns an enveloped JSON object containing a human-readable `message`, a typed `data` payload, and optional `meta` pagination details.
- **Centralized Error Handling**: Unhandled exceptions and validation errors are intercepted by global filters and formatted into standard JSON error objects with RFC 7807 compatible HTTP status codes.

---

## 2. Global Response & Error Envelopes

### 2.1 Standard Success Envelope
```json
{
  "message": "Resource retrieved successfully",
  "data": { ... }
}
```

### 2.2 Standard Paginated Collection Envelope
```json
{
  "message": "Resources retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2.3 Standard Error Envelope
```json
{
  "statusCode": 400,
  "message": [
    "url must be an URL address",
    "intervalSeconds must not be less than 10"
  ],
  "error": "Bad Request"
}
```

---

## 3. Authentication & Session Lifecycle

The authentication system employs a hardened dual-token architecture:
1. **Access Token**: Short-lived JWT (15-minute expiration) signed with `JWT_SECRET`. Contains payload `{ id, email }`. Passed via `Authorization: Bearer <access_token>`.
2. **Refresh Token**: Long-lived token (7-day expiration) stored as an Argon2id / SHA-256 hash in the `refresh_tokens` database table. The plaintext random token is transported strictly inside an `HttpOnly`, `SameSite=Strict` cookie named `pulsewatch_refresh_token`.
3. **Automatic Token Rotation & Reuse Detection**: Upon refreshing, the existing refresh token is revoked and replaced with a newly generated pair. If an already revoked token is submitted, the system flags a potential token-theft breach and immediately revokes all refresh tokens belonging to the user family.

---

## 4. API Endpoints Reference

### Module Summary
1. **Authentication** (`/api/v1/auth`) — 5 endpoints
2. **Monitors** (`/api/v1/monitors`) — 9 endpoints
3. **Incidents** (`/api/v1/incidents`) — 2 endpoints
4. **Dashboard** (`/api/v1/dashboard`) — 1 endpoint
5. **System Health** (`/health`, `/api/v1/health`) — 2 endpoints

---

### 4.1 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
Creates a new tenant account, hashes password using Argon2id, generates access/refresh tokens, and sets the secure refresh cookie.

- **Auth Required**: None (Public)
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex.mercer@enterprise.io",
    "password": "SuperSecretPassword123!"
  }
  ```
  - `name`: String, 1–100 characters.
  - `email`: Valid email string, max 255 characters.
  - `password`: String, minimum 8 characters.
- **Success Response (201 Created)**:
  - *Cookies Set*: `pulsewatch_refresh_token=<token>; Path=/api/v1/auth; HttpOnly; SameSite=Strict`
  ```json
  {
    "message": "Account registered successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e2a4b860-64f3-4a12-8e11-1a0e883901b0",
        "name": "Alex Mercer",
        "email": "alex.mercer@enterprise.io",
        "createdAt": "2026-11-20T10:00:00.000Z"
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: User with email already exists.

---

#### `POST /api/v1/auth/login`
Authenticates user credentials, sets the `pulsewatch_refresh_token` cookie, and issues an access token.

- **Auth Required**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "alex.mercer@enterprise.io",
    "password": "SuperSecretPassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e2a4b860-64f3-4a12-8e11-1a0e883901b0",
        "name": "Alex Mercer",
        "email": "alex.mercer@enterprise.io"
      }
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials.

---

#### `POST /api/v1/auth/refresh`
Rotates tokens using the `pulsewatch_refresh_token` cookie. Revokes the prior token and sets a fresh cookie.

- **Auth Required**: `pulsewatch_refresh_token` cookie present.
- **Request Body**: None `{}`
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Refresh token missing, expired, or revoked (token reuse detected).

---

#### `POST /api/v1/auth/logout`
Revokes the refresh token in the database and clears the client cookie.

- **Auth Required**: Optional JWT or refresh cookie.
- **Request Body**: None `{}`
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully",
    "data": null
  }
  ```

---

#### `GET /api/v1/auth/me`
Retrieves the profile of the currently authenticated tenant.

- **Auth Required**: `Bearer <access_token>`
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Profile retrieved successfully",
    "data": {
      "id": "e2a4b860-64f3-4a12-8e11-1a0e883901b0",
      "name": "Alex Mercer",
      "email": "alex.mercer@enterprise.io",
      "createdAt": "2026-11-20T10:00:00.000Z"
    }
  }
  ```

---

### 4.2 Monitor Management Module (`/api/v1/monitors`)

#### `POST /api/v1/monitors`
Registers a new HTTP/HTTPS endpoint to be monitored. Automatically schedules initial execution (`nextCheckAt = now()`).

- **Auth Required**: `Bearer <access_token>`
- **Request Body**:
  ```json
  {
    "name": "Payments API Gateway",
    "url": "https://api.payments.io/health",
    "method": "GET",
    "intervalSeconds": 60,
    "timeoutMs": 8000,
    "expectedStatusCode": 200
  }
  ```
  - `name`: String, 1–100 characters.
  - `url`: Must be valid HTTP or HTTPS URL.
  - `method`: `GET` or `HEAD` (default: `GET`).
  - `intervalSeconds`: Integer, 10 to 86,400 seconds (default: 60).
  - `timeoutMs`: Integer, 1,000 to 30,000 milliseconds (default: 10,000).
  - `expectedStatusCode`: Integer, 100 to 599 (default: 200).
- **Success Response (201 Created)**:
  ```json
  {
    "message": "Monitor created successfully",
    "data": {
      "id": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
      "userId": "e2a4b860-64f3-4a12-8e11-1a0e883901b0",
      "name": "Payments API Gateway",
      "url": "https://api.payments.io/health",
      "method": "GET",
      "intervalSeconds": 60,
      "timeoutMs": 8000,
      "expectedStatusCode": 200,
      "enabled": true,
      "status": "UNKNOWN",
      "nextCheckAt": "2026-11-20T10:05:00.000Z",
      "createdAt": "2026-11-20T10:05:00.000Z",
      "updatedAt": "2026-11-20T10:05:00.000Z"
    }
  }
  ```

---

#### `GET /api/v1/monitors`
Retrieves a paginated list of all monitors owned by the authenticated tenant with 24-hour uptime metrics.

- **Auth Required**: `Bearer <access_token>`
- **Query Parameters**:
  - `page` (optional, default: 1): Integer page number.
  - `limit` (optional, default: 20): Items per page.
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitors retrieved successfully",
    "data": [
      {
        "id": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
        "name": "Payments API Gateway",
        "url": "https://api.payments.io/health",
        "method": "GET",
        "intervalSeconds": 60,
        "enabled": true,
        "status": "UP",
        "uptime24h": 99.98,
        "lastResponseTimeMs": 45,
        "lastCheckedAt": "2026-11-20T10:04:30.000Z"
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
Retrieves granular details for a single monitor, including active incident status and rolling metrics.

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor details retrieved successfully",
    "data": {
      "id": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
      "name": "Payments API Gateway",
      "url": "https://api.payments.io/health",
      "method": "GET",
      "intervalSeconds": 60,
      "timeoutMs": 8000,
      "expectedStatusCode": 200,
      "enabled": true,
      "status": "UP",
      "uptime24h": 99.98,
      "averageResponseTime24h": 46.2,
      "lastCheckedAt": "2026-11-20T10:04:30.000Z",
      "activeIncident": null,
      "createdAt": "2026-11-20T10:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Monitor not found or belongs to another user.

---

#### `PATCH /api/v1/monitors/:id`
Updates monitor configuration (name, URL, method, interval, timeout, expected status code).

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Request Body** (All fields optional):
  ```json
  {
    "name": "Payments API Gateway (V2)",
    "intervalSeconds": 30,
    "timeoutMs": 5000
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor updated successfully",
    "data": { ... }
  }
  ```

---

#### `PATCH /api/v1/monitors/:id/enable` & `PATCH /api/v1/monitors/:id/disable`
Toggles whether the monitor is actively scheduled by the scheduler daemon.

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor enabled successfully",
    "data": {
      "id": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
      "enabled": true,
      "status": "UNKNOWN"
    }
  }
  ```

---

#### `DELETE /api/v1/monitors/:id`
Deletes a monitor and cascades deletion to all associated checks, occurrences, and incidents.

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor deleted successfully",
    "data": null
  }
  ```

---

#### `GET /api/v1/monitors/:id/checks`
Retrieves recent execution checks and timing logs for a specific monitor.

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Query Parameters**:
  - `limit` (optional, default: 50): Number of checks to retrieve (max: 100).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor checks retrieved successfully",
    "data": [
      {
        "id": "c1f72a9e-8c70-4e44-8da1-3e0e8544901a",
        "statusCode": 200,
        "responseTimeMs": 42,
        "isSuccess": true,
        "errorType": null,
        "errorMessage": null,
        "checkedAt": "2026-11-20T10:04:30.000Z"
      }
    ]
  }
  ```

---

#### `GET /api/v1/monitors/:id/metrics`
Retrieves pre-aggregated metric distributions (latency trends, uptime distribution) for charting.

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Monitor metrics retrieved successfully",
    "data": {
      "uptime24h": 99.98,
      "averageResponseTime24h": 46.2,
      "totalChecks24h": 1440,
      "successfulChecks24h": 1438,
      "failedChecks24h": 2,
      "hourlySeries": [
        {
          "bucketStart": "2026-11-20T09:00:00.000Z",
          "totalChecks": 60,
          "successfulChecks": 60,
          "averageResponseTimeMs": 44
        }
      ]
    }
  }
  ```

---

### 4.3 Incident Management Module (`/api/v1/incidents`)

#### `GET /api/v1/incidents`
Lists historical and active outage incidents scoped to the authenticated tenant.

- **Auth Required**: `Bearer <access_token>`
- **Query Parameters**:
  - `page` (optional, default: 1): Page number.
  - `limit` (optional, default: 20): Items per page.
  - `status` (optional): Filter by `OPEN`, `RECOVERING`, or `RESOLVED`.
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Incidents retrieved successfully",
    "data": [
      {
        "id": "771e89b3-1122-4a00-9ef2-5e60882410a0",
        "monitorId": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
        "monitorName": "Payments API Gateway",
        "title": "Service Outage: Payments API Gateway",
        "description": "Endpoint failed 3 consecutive health checks",
        "status": "OPEN",
        "startedAt": "2026-11-20T09:15:00.000Z",
        "resolvedAt": null
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

#### `GET /api/v1/incidents/:id`
Retrieves incident details with complete event audit trail (`IncidentEvent` records).

- **Auth Required**: `Bearer <access_token>`
- **Path Parameters**: `id` (UUID).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Incident details retrieved successfully",
    "data": {
      "id": "771e89b3-1122-4a00-9ef2-5e60882410a0",
      "monitorId": "902d51b3-4f90-4886-8e50-9bbcf15a3190",
      "title": "Service Outage: Payments API Gateway",
      "description": "Endpoint failed 3 consecutive health checks",
      "status": "RESOLVED",
      "startedAt": "2026-11-20T09:15:00.000Z",
      "resolvedAt": "2026-11-20T09:22:30.000Z",
      "events": [
        {
          "id": "11aa22bb-33cc-44dd-55ee-66ff77889900",
          "eventType": "INCIDENT_OPENED",
          "message": "Incident triggered after 3 consecutive check failures. Last error: HTTP 502 Bad Gateway",
          "createdAt": "2026-11-20T09:15:00.000Z"
        },
        {
          "id": "22bb33cc-44dd-55ee-66ff-778899001122",
          "eventType": "RECOVERY_STARTED",
          "message": "First successful health check received. Probationary recovery in progress.",
          "createdAt": "2026-11-20T09:21:30.000Z"
        },
        {
          "id": "33cc44dd-55ee-66ff-7788-990011223344",
          "eventType": "INCIDENT_RESOLVED",
          "message": "Incident auto-resolved after 2 consecutive successful checks.",
          "createdAt": "2026-11-20T09:22:30.000Z"
        }
      ]
    }
  }
  ```

---

### 4.4 Dashboard Summary Module (`/api/v1/dashboard`)

#### `GET /api/v1/dashboard/summary`
Calculates high-level telemetry and status counts for the executive dashboard overview.

- **Auth Required**: `Bearer <access_token>`
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Dashboard summary retrieved successfully",
    "data": {
      "totalMonitors": 12,
      "upMonitors": 11,
      "downMonitors": 1,
      "pausedMonitors": 0,
      "overallUptime24h": 99.92,
      "activeIncidents": 1,
      "averageResponseTime24h": 48.7
    }
  }
  ```

---

### 4.5 Health & Liveness Module (`/health` & `/api/v1/health`)

#### `GET /health` & `GET /api/v1/health`
Probes PostgreSQL database and Redis connectivity to provide liveness and readiness status for container orchestrators.

- **Auth Required**: None (Public)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "System health is healthy",
    "data": {
      "status": "healthy",
      "details": {
        "database": { "status": "up", "latencyMs": 3.4 },
        "redis": { "status": "up", "latencyMs": 1.1 }
      }
    }
  }
  ```
- **Error Response (503 Service Unavailable)**:
  ```json
  {
    "success": false,
    "message": "System health is error",
    "data": {
      "status": "error",
      "details": {
        "database": { "status": "down", "error": "Connection terminated" },
        "redis": { "status": "up", "latencyMs": 1.2 }
      }
    }
  }
  ```
