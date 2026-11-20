# PulseWatch — Database Design & Schema Specification

**Document:** `docs/Database.md`  
**Version:** 2.0.0  
**Status:** Production / Implemented  
**Database System:** PostgreSQL 15+ (Local or Cloud Supabase)  
**Object-Relational Mapping (ORM):** Prisma ORM v5.22.0  
**Package Location:** `packages/database`

---

## 1. Database Overview & Design Principles

PulseWatch uses PostgreSQL as its primary relational store of truth. All application entities—including users, credentials, monitors, check logs, incidents, historical rollups, and transactional outbox events—are persisted in PostgreSQL.

### 1.1 Express MVC Repository Layer Integration
In the updated architecture, database access is fully encapsulated in **Repositories** (`backend/src/repositories/`):
- `UserRepository`: User creation, profile retrieval, refresh token hash storage, rotation, and reuse revocation.
- `MonitorRepository`: Monitor configuration, batch 24-hour groupBy metrics, execution logs, and cascading deletes.
- `IncidentRepository`: Outage recording, event timelines, and status updates.
- `DashboardRepository`: High-performance aggregate rollups.

No raw Prisma queries are permitted in Express controllers or routes.

---

## 2. Complete Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    users ||--o{ monitors : "owns"
    users ||--o{ refresh_tokens : "authenticates"

    monitors ||--o{ monitoring_occurrences : "schedules"
    monitors ||--o{ monitor_checks : "records"
    monitoring_occurrences ||--o| monitor_checks : "produces"

    monitors ||--o{ incidents : "triggers"
    incidents ||--o{ incident_events : "logs"

    monitors ||--o{ monitor_hourly_aggregates : "summarizes"
    monitors ||--o{ monitor_daily_aggregates : "summarizes"

    outbox_events {
        uuid id PK
        varchar aggregate_type
        uuid aggregate_id
        varchar event_type
        json payload
        enum status
        int attempts
        timestamptz available_at
        timestamptz published_at
        timestamptz created_at
    }

    users {
        uuid id PK
        varchar name
        varchar email UK
        text password_hash
        timestamptz email_verified_at
        timestamptz created_at
        timestamptz updated_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }

    monitors {
        uuid id PK
        uuid user_id FK
        varchar name
        text url
        enum method
        int interval_seconds
        int timeout_ms
        int expected_status_code
        boolean enabled
        enum status
        timestamptz next_check_at
        timestamptz created_at
        timestamptz updated_at
    }

    monitoring_occurrences {
        uuid id PK
        uuid monitor_id FK
        timestamptz scheduled_at
        enum status
        timestamptz claimed_at
        timestamptz lease_expires_at
        timestamptz completed_at
        timestamptz created_at
    }

    monitor_checks {
        uuid id PK
        uuid monitor_id FK
        uuid occurrence_id FK,UK
        int status_code
        int response_time_ms
        boolean is_success
        varchar error_type
        text error_message
        timestamptz checked_at
        timestamptz created_at
    }

    incidents {
        uuid id PK
        uuid monitor_id FK
        varchar title
        text description
        enum status
        timestamptz started_at
        timestamptz resolved_at
        timestamptz created_at
        timestamptz updated_at
    }

    incident_events {
        uuid id PK
        uuid incident_id FK
        enum event_type
        text message
        json metadata
        timestamptz created_at
    }

    monitor_hourly_aggregates {
        uuid id PK
        uuid monitor_id FK
        timestamptz bucket_start
        int total_checks
        int successful_checks
        int failed_checks
        int average_response_time_ms
        int min_response_time_ms
        int max_response_time_ms
        timestamptz created_at
        timestamptz updated_at
    }

    monitor_daily_aggregates {
        uuid id PK
        uuid monitor_id FK
        timestamptz bucket_start
        int total_checks
        int successful_checks
        int failed_checks
        int average_response_time_ms
        int min_response_time_ms
        int max_response_time_ms
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 3. Custom Database Enums

| Enum Name | Allowed Values | Description |
| :--- | :--- | :--- |
| **`MonitorStatus`** | `UNKNOWN`, `UP`, `DOWN`, `PAUSED` | Health status of an endpoint. |
| **`MonitorMethod`** | `GET`, `HEAD` | Supported HTTP probing methods. |
| **`OccurrenceStatus`** | `PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `SKIPPED`, `FAILED` | State of a scheduled check occurrence. |
| **`IncidentStatus`** | `OPEN`, `RECOVERING`, `RESOLVED` | Lifecycle state of an outage incident. |
| **`IncidentEventType`** | `INCIDENT_OPENED`, `RECOVERY_STARTED`, `INCIDENT_REOPENED`, `INCIDENT_RESOLVED` | Transition event type in an incident. |
| **`OutboxStatus`** | `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED` | Transactional outbox event delivery status. |

---

## 4. Comprehensive Table Specifications

### 4.1 `users`
Stores tenant accounts and Argon2id password hashes.
- `id`: `UUID` (Primary Key).
- `name`: `VARCHAR(100)` (Full name).
- `email`: `VARCHAR(255)` (Unique tenant email).
- `password_hash`: `TEXT` (Argon2id cryptographic hash).
- `email_verified_at`: `TIMESTAMPTZ(6)` (Nullable).
- `created_at` / `updated_at`: `TIMESTAMPTZ(6)`.
- **Relationships**: Has many `monitors` (`onDelete: Restrict`), has many `refresh_tokens` (`onDelete: Cascade`).

### 4.2 `refresh_tokens`
Stores HMAC-SHA256 hashed refresh tokens to support token rotation and reuse revocation.
- `id`: `UUID` (Primary Key).
- `user_id`: `UUID` (Foreign Key -> `users(id)`).
- `token_hash`: `TEXT` (Unique hash of raw refresh token).
- `expires_at`: `TIMESTAMPTZ(6)` (Expiration date).
- `revoked_at`: `TIMESTAMPTZ(6)` (Nullable revocation timestamp).
- `created_at`: `TIMESTAMPTZ(6)`.

### 4.3 `monitors`
Monitored endpoint definitions, intervals, and health states.
- `id`: `UUID` (Primary Key).
- `user_id`: `UUID` (Foreign Key -> `users(id)`).
- `name`: `VARCHAR(100)`.
- `url`: `TEXT`.
- `method`: `MonitorMethod` (Default `GET`).
- `interval_seconds`: `INT` (Default `60`).
- `timeout_ms`: `INT` (Default `10000`).
- `expected_status_code`: `INT` (Default `200`).
- `enabled`: `BOOLEAN` (Default `true`).
- `status`: `MonitorStatus` (Default `UNKNOWN`).
- `next_check_at`: `TIMESTAMPTZ(6)` (Indexed for scheduler hot path).

### 4.4 `monitoring_occurrences`
Discrete execution slots and distributed worker lease locks.
- `id`: `UUID` (Primary Key).
- `monitor_id`: `UUID` (Foreign Key -> `monitors(id)`).
- `scheduled_at`: `TIMESTAMPTZ(6)`.
- `status`: `OccurrenceStatus` (Default `PENDING`).
- `claimed_at`, `lease_expires_at`, `completed_at`: `TIMESTAMPTZ(6)`.
- **Unique Constraint**: `(monitor_id, scheduled_at)` prevents duplicate executions.

### 4.5 `monitor_checks`
Probe execution results, status codes, and latency logs.
- `id`: `UUID` (Primary Key).
- `monitor_id`: `UUID` (Foreign Key -> `monitors(id)`).
- `occurrence_id`: `UUID` (Foreign Key -> `monitoring_occurrences(id)`, Unique).
- `status_code`: `INT` (Nullable).
- `response_time_ms`: `INT` (Nullable).
- `is_success`: `BOOLEAN`.
- `error_type`: `VARCHAR(50)` (Nullable, e.g. `ETIMEDOUT`, `SSRF_BLOCKED`).
- `error_message`: `TEXT` (Nullable).
- `checked_at`: `TIMESTAMPTZ(6)`.

### 4.6 `incidents`
Records service outages triggered after 3 consecutive failures.
- `id`: `UUID` (Primary Key).
- `monitor_id`: `UUID` (Foreign Key -> `monitors(id)`).
- `title`: `VARCHAR(255)`.
- `description`: `TEXT` (Nullable).
- `status`: `IncidentStatus` (Default `OPEN`).
- `started_at`, `resolved_at`: `TIMESTAMPTZ(6)`.

### 4.7 `incident_events`
Audit trail of incident transitions (`OPENED`, `RECOVERY_STARTED`, `REOPENED`, `RESOLVED`).
- `id`: `UUID` (Primary Key).
- `incident_id`: `UUID` (Foreign Key -> `incidents(id)`).
- `event_type`: `IncidentEventType`.
- `message`: `TEXT`.
- `metadata`: `JSON` (Nullable).

### 4.8 `monitor_hourly_aggregates` & `monitor_daily_aggregates`
Pre-aggregated rollups powering fast charts and long-term uptime analytics.
- Unique index on `(monitor_id, bucket_start)`.

### 4.9 `outbox_events`
Transactional outbox staging table ensuring guaranteed event publication (e.g. Slack webhook alerts).
- `id`: `UUID` (Primary Key).
- `aggregate_type`: `VARCHAR(100)`.
- `aggregate_id`: `UUID`.
- `event_type`: `VARCHAR(100)`.
- `payload`: `JSON`.
- `status`: `OutboxStatus` (Default `PENDING`).
- `attempts`: `INT` (Default `0`).
- `available_at`, `published_at`, `created_at`: `TIMESTAMPTZ(6)`.

---

## 5. Migration Strategy

1. **Prisma Generation**:
   ```bash
   pnpm db:generate
   ```
2. **Schema Synchronization**:
   ```bash
   pnpm db:push
   ```
3. **Audit History**: Obsolete notification tables and enums (`notification_channels`, `notification_deliveries`) have been pruned.
