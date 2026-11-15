# PulseWatch — API Specification

**Document:** API_SPECIFICATION.md  
**Version:** 1.0  
**Status:** Draft — Ready for Implementation Planning  
**Project:** PulseWatch  
**Backend:** NestJS  
**Language:** TypeScript  
**Database:** Supabse PostgreSQL  
**ORM:** Prisma  
**API Style:** REST

---

# 1. API Overview

PulseWatch exposes a REST API for managing API monitors, monitoring results, incidents, notification channels, analytics, and public status pages.

The API acts as the primary communication layer between the Next.js frontend and backend services.

## 1.1 Base URL

Development:

```text
http://localhost:4000/api/v1
```

Production:

```text
https://api.pulsewatch.example.com/api/v1
```

The production domain is a placeholder and must be replaced during deployment.

## 1.2 API Design Principles

- RESTful resource-oriented endpoints.
- JSON request and response bodies.
- JWT-based authentication.
- Consistent response structures.
- Centralized error handling.
- Input validation.
- Resource ownership verification.
- Pagination for collection endpoints.
- Versioned API routes.
- ISO 8601 timestamps in UTC.
- Explicit HTTP status codes.

## 1.3 Content Type

All JSON requests must use:

```http
Content-Type: application/json
```

---

# 2. Authentication and Authorization

## 2.1 Authentication Strategy

PulseWatch uses:

- Short-lived JWT access tokens.
- Rotating refresh tokens.
- Secure password hashing.
- Protected API routes.

Access tokens should be sent using:

```http
Authorization: Bearer <access_token>
```

Refresh tokens should be stored in secure, HttpOnly cookies.

Never expose refresh tokens through browser localStorage or return them in ordinary JSON responses.

## 2.2 Authentication Requirements

| Requirement | Description |
|---|---|
| Registration | Public |
| Login | Public |
| Refresh Token | Refresh cookie required |
| Logout | Authenticated session |
| User Profile | Authenticated |
| Monitor Management | Authenticated |
| Incident Management | Authenticated |
| Analytics | Authenticated |
| Public Status Pages | Public read-only access |
| Status Page Management | Authenticated |

## 2.3 Authorization Rules

- Users can access only their own monitors.
- Users can access only incidents belonging to their monitors.
- Users can modify only their own notification channels.
- Users can manage only their own status pages.
- Public status pages expose only explicitly selected monitor information.
- Internal worker endpoints must not be publicly accessible.

---

# 3. Standard API Response Format

All successful API responses should follow a consistent structure.

## 3.1 Success Response

```json
{
  "success": true,
  "message": "Monitor retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Production API"
  },
  "meta": null
}
```

## 3.2 Paginated Response

```json
{
  "success": true,
  "message": "Monitors retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Production API"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

## 3.3 Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "url",
        "message": "A valid HTTP or HTTPS URL is required"
      }
    ]
  },
  "meta": null
}
```

---

# 4. HTTP Status Codes

| Status Code | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 202 | Accepted | Asynchronous operation accepted |
| 204 | No Content | Successful deletion or logout |
| 400 | Bad Request | Invalid request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but unauthorized |
| 404 | Not Found | Resource unavailable |
| 409 | Conflict | Duplicate or conflicting operation |
| 413 | Payload Too Large | Request exceeds size limit |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Required service unavailable |

Do not expose internal exception messages or stack traces to clients.

---

# 5. API Modules

The API contains the following modules:

| Module | Responsibility |
|---|---|
| Auth | Authentication and sessions |
| Users | User profile management |
| Monitors | Monitor CRUD |
| Monitor Checks | Monitoring history |
| Analytics | Uptime and response-time metrics |
| Incidents | Incident management |
| Notifications | Notification configuration |
| Status Pages | Public status pages |
| Health | Application health checks |

---

# 6. Authentication APIs

## 6.1 Register User

**Endpoint:**

```http
POST /api/v1/auth/register
```

**Authentication:** Not required.

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

### Validation

| Field | Rules |
|---|---|
| name | Required, 2–100 characters |
| email | Required, valid email |
| password | Required, minimum 12 characters |

### Success Response

HTTP 201:

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": null
}
```

### Possible Errors

- 400: Invalid input.
- 409: Email already registered.
- 429: Rate limit exceeded.

Passwords must be hashed using Argon2id before persistence.

## 6.2 Login User

**Endpoint:**

```http
POST /api/v1/auth/login
```

**Authentication:** Not required.

### Request Body

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

### Success Response

HTTP 200:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "accessToken": "jwt-access-token",
    "expiresIn": 900
  },
  "meta": null
}
```

The refresh token must be delivered using a Secure, HttpOnly, SameSite cookie.

The response body must not contain the refresh token.

## 6.3 Refresh Access Token

**Endpoint:**

```http
POST /api/v1/auth/refresh
```

**Authentication:** Valid refresh cookie required.

### Request

No JSON body required.

### Success Response

HTTP 200:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-access-token",
    "expiresIn": 900
  },
  "meta": null
}
```

The refresh cookie must be rotated.

Previously rotated refresh tokens must not be reusable.

## 6.4 Logout

**Endpoint:**

```http
POST /api/v1/auth/logout
```

**Authentication:** Authenticated session required.

### Success Response

HTTP 204:

No response body.

Requirements:

- Revoke the refresh token.
- Clear the refresh cookie.
- Prevent further use of the revoked token.

## 6.5 Get Current User

**Endpoint:**

```http
GET /api/v1/auth/me
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-11-15T10:00:00.000Z"
  },
  "meta": null
}
```

---

# 7. Monitor Management APIs

## 7.1 Create Monitor

**Endpoint:**

```http
POST /api/v1/monitors
```

**Authentication:** Required.

### Request Body

```json
{
  "name": "Production API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "intervalSeconds": 60,
  "timeoutMs": 10000,
  "expectedStatusCode": 200
}
```

### Validation Rules

| Field | Validation |
|---|---|
| name | Required, 2–100 characters |
| url | Valid HTTP/HTTPS URL |
| method | GET or HEAD |
| intervalSeconds | 60, 300, 600, or 1800 |
| timeoutMs | Positive, maximum 30000 |
| expectedStatusCode | Valid HTTP status code |

### Success Response

HTTP 201:

```json
{
  "success": true,
  "message": "Monitor created successfully",
  "data": {
    "id": "uuid",
    "name": "Production API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "intervalSeconds": 60,
    "timeoutMs": 10000,
    "expectedStatusCode": 200,
    "enabled": true,
    "status": "UNKNOWN",
    "nextCheckAt": "2026-11-15T10:01:00.000Z",
    "createdAt": "2026-11-15T10:00:00.000Z"
  },
  "meta": null
}
```

### Business Rules

- The monitor belongs to the authenticated user.
- Initial status is UNKNOWN.
- The first scheduled check is initialized after creation.
- URL validation must include SSRF protections.
- Monitor creation must not synchronously execute an HTTP request.

## 7.2 Get All Monitors

**Endpoint:**

```http
GET /api/v1/monitors
```

**Authentication:** Required.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| page | Integer | Page number |
| limit | Integer | Records per page |
| status | Enum | UP, DOWN, UNKNOWN, PAUSED |
| enabled | Boolean | Filter enabled monitors |
| search | String | Search monitor name |
| sortBy | String | createdAt, name, status |
| sortOrder | String | asc, desc |

Example:

```http
GET /api/v1/monitors?page=1&limit=10&status=UP
```

### Success Response

```json
{
  "success": true,
  "message": "Monitors retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Production API",
      "url": "https://api.example.com/health",
      "status": "UP",
      "enabled": true,
      "intervalSeconds": 60,
      "lastResponseTimeMs": 120,
      "uptimePercentage": 99.95
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

Only return monitors belonging to the authenticated user.

## 7.3 Get Monitor Details

**Endpoint:**

```http
GET /api/v1/monitors/:id
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Monitor retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Production API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "intervalSeconds": 60,
    "timeoutMs": 10000,
    "expectedStatusCode": 200,
    "enabled": true,
    "status": "UP",
    "lastCheck": {
      "statusCode": 200,
      "responseTimeMs": 120,
      "isSuccess": true,
      "checkedAt": "2026-11-15T10:00:00.000Z"
    },
    "createdAt": "2026-11-15T09:00:00.000Z"
  },
  "meta": null
}
```

## 7.4 Update Monitor

**Endpoint:**

```http
PATCH /api/v1/monitors/:id
```

**Authentication:** Required.

### Request Body

All fields are optional.

```json
{
  "name": "Updated Production API",
  "url": "https://api.example.com/health",
  "intervalSeconds": 300,
  "timeoutMs": 15000,
  "expectedStatusCode": 200
}
```

### Success Response

```json
{
  "success": true,
  "message": "Monitor updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Production API",
    "intervalSeconds": 300,
    "timeoutMs": 15000,
    "updatedAt": "2026-11-15T10:30:00.000Z"
  },
  "meta": null
}
```

### Business Rules

- Verify monitor ownership.
- Validate changed fields.
- Apply scheduling changes safely.
- Prevent already queued jobs from using outdated configuration without validation.
- Do not silently delete monitoring history.

## 7.5 Enable Monitor

**Endpoint:**

```http
PATCH /api/v1/monitors/:id/enable
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Monitor enabled successfully",
  "data": {
    "id": "uuid",
    "enabled": true,
    "status": "UNKNOWN"
  },
  "meta": null
}
```

## 7.6 Disable Monitor

**Endpoint:**

```http
PATCH /api/v1/monitors/:id/disable
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Monitor disabled successfully",
  "data": {
    "id": "uuid",
    "enabled": false,
    "status": "PAUSED"
  },
  "meta": null
}
```

New scheduled jobs must not be generated for disabled monitors.

Already queued jobs must verify the current monitor state before execution.

## 7.7 Delete Monitor

**Endpoint:**

```http
DELETE /api/v1/monitors/:id
```

**Authentication:** Required.

### Success Response

HTTP 204:

No response body.

### Business Rules

- Verify ownership.
- Prevent deletion when the monitor is associated with active incidents or published status pages, unless the operation explicitly handles those dependencies.
- Preserve historical incident records according to retention requirements.
- Remove future scheduling eligibility.
- Handle outstanding queued jobs safely.

---

# 8. Monitor Check APIs

## 8.1 Get Monitoring History

**Endpoint:**

```http
GET /api/v1/monitors/:id/checks
```

**Authentication:** Required.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| page | Integer | Page number |
| limit | Integer | Results per page |
| startDate | ISO Date | Start time |
| endDate | ISO Date | End time |
| result | String | SUCCESS or FAILURE |

Example:

```http
GET /api/v1/monitors/uuid/checks?page=1&limit=20
```

### Success Response

```json
{
  "success": true,
  "message": "Monitoring history retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "statusCode": 200,
      "responseTimeMs": 120,
      "isSuccess": true,
      "errorType": null,
      "errorMessage": null,
      "checkedAt": "2026-11-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 8.2 Get Latest Check

**Endpoint:**

```http
GET /api/v1/monitors/:id/checks/latest
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Latest check retrieved successfully",
  "data": {
    "statusCode": 200,
    "responseTimeMs": 120,
    "isSuccess": true,
    "checkedAt": "2026-11-15T10:00:00.000Z"
  },
  "meta": null
}
```

Return 404 if no completed check exists.

---

# 9. Analytics APIs

## 9.1 Get Monitor Uptime

**Endpoint:**

```http
GET /api/v1/monitors/:id/uptime
```

**Authentication:** Required.

### Query Parameters

| Parameter | Description |
|---|---|
| period | 24h, 7d, 30d, 90d |
| startDate | Custom start date |
| endDate | Custom end date |

Example:

```http
GET /api/v1/monitors/uuid/uptime?period=30d
```

### Success Response

```json
{
  "success": true,
  "message": "Uptime statistics retrieved successfully",
  "data": {
    "period": "30d",
    "uptimePercentage": 99.95,
    "totalChecks": 43200,
    "successfulChecks": 43178,
    "failedChecks": 22,
    "dataCoverage": 100
  },
  "meta": null
}
```

`dataCoverage` represents the proportion of expected monitoring observations represented by valid completed checks. Its calculation must be explicitly documented.

## 9.2 Get Response-Time Analytics

**Endpoint:**

```http
GET /api/v1/monitors/:id/analytics/response-time
```

**Authentication:** Required.

### Query Parameters

- period
- startDate
- endDate
- granularity

Supported granularity:

- hour
- day

### Success Response

```json
{
  "success": true,
  "message": "Response-time analytics retrieved successfully",
  "data": {
    "averageResponseTimeMs": 145,
    "minimumResponseTimeMs": 80,
    "maximumResponseTimeMs": 450,
    "dataPoints": [
      {
        "timestamp": "2026-11-15T09:00:00.000Z",
        "averageResponseTimeMs": 120
      },
      {
        "timestamp": "2026-11-15T10:00:00.000Z",
        "averageResponseTimeMs": 145
      }
    ]
  },
  "meta": null
}
```

## 9.3 Get Monitor Availability

**Endpoint:**

```http
GET /api/v1/monitors/:id/analytics/availability
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Availability analytics retrieved successfully",
  "data": {
    "period": "24h",
    "dataPoints": [
      {
        "timestamp": "2026-11-15T09:00:00.000Z",
        "totalChecks": 60,
        "successfulChecks": 59,
        "failedChecks": 1,
        "uptimePercentage": 98.33
      }
    ]
  },
  "meta": null
}
```

---

# 10. Incident Management APIs

## 10.1 Get All Incidents

**Endpoint:**

```http
GET /api/v1/incidents
```

**Authentication:** Required.

### Query Parameters

| Parameter | Description |
|---|---|
| page | Page number |
| limit | Results per page |
| status | OPEN, RECOVERING, RESOLVED |
| monitorId | Filter by monitor |
| startDate | Start date |
| endDate | End date |

Example:

```http
GET /api/v1/incidents?status=OPEN&page=1&limit=10
```

### Success Response

```json
{
  "success": true,
  "message": "Incidents retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "monitorId": "uuid",
      "monitorName": "Production API",
      "title": "Production API is unavailable",
      "status": "OPEN",
      "startedAt": "2026-11-15T10:00:00.000Z",
      "resolvedAt": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 10.2 Get Incident Details

**Endpoint:**

```http
GET /api/v1/incidents/:id
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Incident retrieved successfully",
  "data": {
    "id": "uuid",
    "monitorId": "uuid",
    "title": "Production API is unavailable",
    "status": "RECOVERING",
    "startedAt": "2026-11-15T10:00:00.000Z",
    "resolvedAt": null,
    "events": [
      {
        "id": "uuid",
        "eventType": "INCIDENT_OPENED",
        "message": "Three consecutive health checks failed",
        "createdAt": "2026-11-15T10:00:00.000Z"
      },
      {
        "id": "uuid",
        "eventType": "RECOVERY_STARTED",
        "message": "Service recovery detected",
        "createdAt": "2026-11-15T10:05:00.000Z"
      }
    ]
  },
  "meta": null
}
```

## 10.3 Resolve Incident Manually

**Endpoint:**

```http
POST /api/v1/incidents/:id/resolve
```

**Authentication:** Required.

This endpoint is reserved for a future manual incident-management feature.

The MVP uses automated recovery detection.

### Future Request Body

```json
{
  "message": "Issue manually verified as resolved"
}
```

Manual resolution must record the actor and incident event. It must not falsely alter historical health-check results.

---

# 11. Notification APIs

## 11.1 Create Notification Channel

**Endpoint:**

```http
POST /api/v1/notification-channels
```

**Authentication:** Required.

### Email Request

```json
{
  "name": "Primary Email",
  "type": "EMAIL",
  "configuration": {
    "email": "john@example.com"
  }
}
```

### Slack Request

```json
{
  "name": "Engineering Slack",
  "type": "SLACK",
  "configuration": {
    "webhookUrl": "https://hooks.slack.com/services/..."
  }
}
```

Slack integration is post-MVP.

The webhook URL must be validated and stored securely. Never return it in plaintext from read APIs.

### Success Response

HTTP 201:

```json
{
  "success": true,
  "message": "Notification channel created successfully",
  "data": {
    "id": "uuid",
    "name": "Primary Email",
    "type": "EMAIL",
    "enabled": true,
    "configuration": {
      "email": "john@example.com"
    }
  },
  "meta": null
}
```

## 11.2 Get Notification Channels

**Endpoint:**

```http
GET /api/v1/notification-channels
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Notification channels retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Primary Email",
      "type": "EMAIL",
      "enabled": true
    }
  ],
  "meta": null
}
```

Sensitive configuration must not be returned.

## 11.3 Update Notification Channel

**Endpoint:**

```http
PATCH /api/v1/notification-channels/:id
```

**Authentication:** Required.

### Request Body

```json
{
  "name": "Updated Email Channel",
  "enabled": false
}
```

## 11.4 Delete Notification Channel

**Endpoint:**

```http
DELETE /api/v1/notification-channels/:id
```

**Authentication:** Required.

### Success Response

HTTP 204.

## 11.5 Get Notification Deliveries

**Endpoint:**

```http
GET /api/v1/notification-deliveries
```

**Authentication:** Required.

### Query Parameters

- page
- limit
- status
- channelId
- incidentId

### Success Response

```json
{
  "success": true,
  "message": "Notification deliveries retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "incidentId": "uuid",
      "channelId": "uuid",
      "status": "SENT",
      "attempts": 1,
      "sentAt": "2026-11-15T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

# 12. Status Page APIs

## 12.1 Create Status Page

**Endpoint:**

```http
POST /api/v1/status-pages
```

**Authentication:** Required.

### Request Body

```json
{
  "name": "Production Services",
  "slug": "production-services",
  "description": "Production infrastructure status",
  "isPublic": true
}
```

### Success Response

HTTP 201:

```json
{
  "success": true,
  "message": "Status page created successfully",
  "data": {
    "id": "uuid",
    "name": "Production Services",
    "slug": "production-services",
    "description": "Production infrastructure status",
    "isPublic": true,
    "publicUrl": "https://pulsewatch.example.com/status/production-services"
  },
  "meta": null
}
```

## 12.2 Get User Status Pages

**Endpoint:**

```http
GET /api/v1/status-pages
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Status pages retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Production Services",
      "slug": "production-services",
      "isPublic": true
    }
  ],
  "meta": null
}
```

## 12.3 Update Status Page

**Endpoint:**

```http
PATCH /api/v1/status-pages/:id
```

**Authentication:** Required.

### Request Body

```json
{
  "name": "Production Infrastructure",
  "description": "Current production service health",
  "isPublic": true
}
```

## 12.4 Delete Status Page

**Endpoint:**

```http
DELETE /api/v1/status-pages/:id
```

**Authentication:** Required.

### Success Response

HTTP 204.

## 12.5 Add Monitor to Status Page

**Endpoint:**

```http
POST /api/v1/status-pages/:id/monitors
```

**Authentication:** Required.

### Request Body

```json
{
  "monitorId": "uuid",
  "displayOrder": 1
}
```

### Business Rules

- Verify status page ownership.
- Verify monitor ownership.
- Prevent duplicate associations.
- Only expose selected monitor information.

## 12.6 Remove Monitor from Status Page

**Endpoint:**

```http
DELETE /api/v1/status-pages/:id/monitors/:monitorId
```

**Authentication:** Required.

### Success Response

HTTP 204.

## 12.7 Get Public Status Page

**Endpoint:**

```http
GET /api/v1/public/status-pages/:slug
```

**Authentication:** Not required.

### Success Response

```json
{
  "success": true,
  "message": "Public status page retrieved successfully",
  "data": {
    "name": "Production Services",
    "description": "Production infrastructure status",
    "overallStatus": "OPERATIONAL",
    "monitors": [
      {
        "name": "Production API",
        "status": "UP",
        "uptimePercentage": 99.95
      }
    ],
    "activeIncidents": []
  },
  "meta": null
}
```

Public endpoints must never expose:

- Internal monitor configuration.
- Notification secrets.
- Authentication credentials.
- Private error details.
- Internal infrastructure addresses.

---

# 13. Dashboard APIs

## 13.1 Get Dashboard Overview

**Endpoint:**

```http
GET /api/v1/dashboard/overview
```

**Authentication:** Required.

### Success Response

```json
{
  "success": true,
  "message": "Dashboard overview retrieved successfully",
  "data": {
    "totalMonitors": 10,
    "operationalMonitors": 8,
    "downMonitors": 1,
    "pausedMonitors": 1,
    "activeIncidents": 1,
    "averageResponseTimeMs": 145,
    "overallUptimePercentage": 99.85
  },
  "meta": null
}
```

All statistics must be scoped to the authenticated user.

## 13.2 Get Recent Activity

**Endpoint:**

```http
GET /api/v1/dashboard/activity
```

**Authentication:** Required.

### Query Parameters

- page
- limit

### Success Response

```json
{
  "success": true,
  "message": "Recent activity retrieved successfully",
  "data": [
    {
      "type": "INCIDENT_OPENED",
      "message": "Production API is unavailable",
      "monitorId": "uuid",
      "timestamp": "2026-11-15T10:00:00.000Z"
    },
    {
      "type": "MONITOR_RECOVERED",
      "message": "Payment API is operational",
      "monitorId": "uuid",
      "timestamp": "2026-11-15T09:55:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

# 14. Health APIs

## 14.1 Application Liveness

**Endpoint:**

```http
GET /health/live
```

**Authentication:** Not required.

### Success Response

```json
{
  "status": "ok"
}
```

Indicates that the API process is running.

## 14.2 Application Readiness

**Endpoint:**

```http
GET /health/ready
```

**Authentication:** Not required.

### Success Response

```json
{
  "status": "ok",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

Returns HTTP 503 when required dependencies are unavailable.

Do not expose credentials, connection strings, or internal error details.

---

# 15. API Validation Rules

## 15.1 General Validation

- Reject unknown fields.
- Validate request body types.
- Validate query parameters.
- Validate UUID route parameters.
- Validate date ranges.
- Validate enum values.
- Apply request size limits.
- Reject malformed JSON.

## 15.2 Monitor Validation

| Field | Rule |
|---|---|
| name | 2–100 characters |
| url | HTTP or HTTPS only |
| method | GET or HEAD |
| intervalSeconds | 60, 300, 600, 1800 |
| timeoutMs | 1–30000 |
| expectedStatusCode | 100–599 |

## 15.3 URL Security Validation

Before accepting a monitor URL:

1. Validate URL syntax.
2. Reject unsupported schemes.
3. Reject embedded credentials.
4. Resolve DNS records.
5. Reject loopback and private IP addresses.
6. Reject link-local and reserved addresses.
7. Prevent access to cloud metadata endpoints.
8. Revalidate resolved addresses at connection time.
9. Validate every redirect destination.
10. Restrict outbound network access.

Do not rely solely on URL validation at monitor creation time.

---

# 16. Pagination Standards

All large collection endpoints must support pagination.

## 16.1 Query Parameters

```text
?page=1&limit=10
```

## 16.2 Rules

- Default page: 1.
- Default limit: 10.
- Maximum limit: 100.
- Page must be a positive integer.
- Limit must be between 1 and 100.

## 16.3 Pagination Metadata

```json
{
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10
}
```

For high-volume monitoring history, introduce cursor-based pagination using `(checked_at, id)` instead of relying indefinitely on large OFFSET queries.

---

# 17. Error Handling Standards

## 17.1 Standard Error Codes

| Error Code | Meaning |
|---|---|
| VALIDATION_ERROR | Request validation failed |
| AUTHENTICATION_REQUIRED | Authentication required |
| INVALID_CREDENTIALS | Login failed |
| TOKEN_EXPIRED | Access token expired |
| TOKEN_INVALID | Invalid token |
| RESOURCE_NOT_FOUND | Resource not found |
| RESOURCE_FORBIDDEN | Unauthorized resource access |
| RESOURCE_CONFLICT | Resource conflict |
| MONITOR_LIMIT_EXCEEDED | Monitor quota exceeded |
| INVALID_MONITOR_URL | Invalid target URL |
| SSRF_BLOCKED | Unsafe target rejected |
| RATE_LIMIT_EXCEEDED | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | Unexpected error |
| SERVICE_UNAVAILABLE | Dependency unavailable |

## 17.2 Error Example

```json
{
  "success": false,
  "message": "Monitor not found",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "details": []
  },
  "meta": null
}
```

## 17.3 Error Handling Rules

- Use centralized NestJS exception filters.
- Never expose stack traces in production.
- Log internal errors using structured logging.
- Include request correlation IDs.
- Avoid exposing whether another user's private resource exists.
- Do not return database exception messages directly.

---

# 18. Rate Limiting

Initial rate limits:

| API Category | Limit |
|---|---|
| Login | 5 requests/minute/IP |
| Registration | 5 requests/hour/IP |
| Monitor creation | 20 requests/hour/user |
| General API | 100 requests/minute/user |
| Analytics | 30 requests/minute/user |

These are initial defaults and must be adjusted after testing.

Requirements:

- Use Redis-backed distributed rate limiting.
- Apply stricter protection to authentication endpoints.
- Return HTTP 429 when limits are exceeded.
- Include Retry-After headers where appropriate.
- Apply limits using authenticated user identity and trusted client IP information.

---

# 19. API Security Requirements

1. All protected endpoints require authentication.
2. Every resource operation must verify ownership.
3. Refresh tokens must be rotated.
4. Passwords must be hashed.
5. Secrets must never be exposed through API responses.
6. Inputs must be validated.
7. Rate limiting must be enabled.
8. CORS must be explicitly configured.
9. Public status pages must expose only approved information.
10. Monitoring URLs must be protected against SSRF.
11. Sensitive operations must be logged.
12. Production traffic must use HTTPS.
13. Cookie-based authentication must include CSRF protection.
14. Internal worker and scheduler interfaces must not be publicly exposed.

---

# 20. API Versioning

All endpoints must use:

```text
/api/v1
```

Future breaking changes must use a new version.

Example:

```text
/api/v2/monitors
```

Backward-compatible additions should not require a new API version.

---

# 21. API Implementation Structure

Recommended NestJS folder structure:

```text
apps/api/src/
│
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── guards/
│   └── dto/
│
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── monitors/
│   ├── monitors.controller.ts
│   ├── monitors.service.ts
│   ├── monitors.module.ts
│   └── dto/
│
├── checks/
│   ├── checks.controller.ts
│   ├── checks.service.ts
│   └── checks.module.ts
│
├── analytics/
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── analytics.module.ts
│
├── incidents/
│   ├── incidents.controller.ts
│   ├── incidents.service.ts
│   └── incidents.module.ts
│
├── notifications/
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
│
├── status-pages/
│   ├── status-pages.controller.ts
│   ├── status-pages.service.ts
│   └── status-pages.module.ts
│
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.service.ts
│   └── dashboard.module.ts
│
├── health/
│   ├── health.controller.ts
│   └── health.module.ts
│
├── common/
│   ├── filters/
│   ├── interceptors/
│   ├── decorators/
│   ├── guards/
│   └── pipes/
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
└── main.ts
```

---

# 22. API Testing Requirements

Every API module must have unit and integration tests.

## Authentication Tests

- Successful registration.
- Duplicate registration.
- Successful login.
- Invalid credentials.
- Expired access token.
- Refresh token rotation.
- Refresh token reuse rejection.
- Logout and token revocation.

## Monitor Tests

- Create monitor.
- Get monitors.
- Update monitor.
- Delete monitor.
- Enable monitor.
- Disable monitor.
- Unauthorized ownership access.
- Invalid URL.
- SSRF protection.
- Invalid monitoring interval.

## Incident Tests

- Retrieve incidents.
- Incident ownership verification.
- Duplicate active incident prevention.
- Recovery lifecycle.
- Incident event history.

## Notification Tests

- Create email channel.
- Update channel.
- Disable channel.
- Unauthorized channel access.
- Notification delivery history.

## Status Page Tests

- Create status page.
- Add monitor.
- Remove monitor.
- Publish page.
- Access public page.
- Prevent cross-user monitor association.
- Prevent unpublished page access.

---

# 23. MVP API Implementation Priority

Implement APIs in this order.

| Phase | API Module | Priority |
|---|---|---|
| 1 | Authentication | Critical |
| 2 | User Profile | High |
| 3 | Monitor Management | Critical |
| 4 | Monitoring History | Critical |
| 5 | Dashboard Overview | High |
| 6 | Uptime Analytics | High |
| 7 | Incident Management | Critical |
| 8 | Email Notifications | High |
| 9 | Response-Time Analytics | High |
| 10 | Status Pages | Post-MVP |
| 11 | Slack Notifications | Post-MVP |

Do not implement all endpoints before the monitoring pipeline works.

---

# 24. Definition of API Completion

- [ ] API versioning configured.
- [ ] Authentication implemented.
- [ ] Authorization implemented.
- [ ] Standard response format implemented.
- [ ] Centralized error handling implemented.
- [ ] Monitor CRUD APIs implemented.
- [ ] Monitoring history APIs implemented.
- [ ] Dashboard APIs implemented.
- [ ] Analytics APIs implemented.
- [ ] Incident APIs implemented.
- [ ] Notification APIs implemented.
- [ ] Status page APIs implemented.
- [ ] Pagination implemented.
- [ ] Input validation implemented.
- [ ] Rate limiting implemented.
- [ ] SSRF protection implemented.
- [ ] Automated API tests implemented.
- [ ] API documentation generated.

---

# 25. Final API Architecture Principle

The API server is responsible for user-facing operations and business orchestration.

The API must not execute scheduled monitoring requests synchronously.

The scheduler creates monitoring occurrences.

Workers execute health checks.

PostgreSQL stores monitoring results.

Incident processing manages service failures and recovery.

Notification workers deliver alerts asynchronously.

The frontend consumes versioned REST endpoints.

Every protected operation must enforce authentication, resource ownership, validation, and consistent error handling.

**API design must prioritize security, predictable contracts, idempotency, and maintainability.**

---

**Document End**
