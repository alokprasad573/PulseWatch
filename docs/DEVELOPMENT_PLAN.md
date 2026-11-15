
# PulseWatch — Development Plan

**Document:** DEVELOPMENT_PLAN.md  
**Version:** 1.0  
**Status:** Implementation Ready  
**Project:** PulseWatch  
**Architecture:** Modular Monorepo + Event-Driven Background Processing

---

# 1. Development Objectives

Build a production-oriented API and website monitoring platform that allows users to:

- Register and authenticate.
- Create, configure, pause, resume, and delete monitors.
- Monitor HTTP endpoints automatically.
- Track uptime and response times.
- Detect outages and recoveries.
- Receive incident notifications.
- View monitoring history and analytics.
- Manage incidents through a centralized dashboard.

## 1.1 Development Principles

1. Build incrementally; do not implement everything simultaneously.
2. Keep business logic independent of framework-specific controllers.
3. PostgreSQL is the source of truth.
4. Redis and BullMQ handle asynchronous job coordination.
5. Monitoring execution must be independent of API availability.
6. Every scheduled monitoring occurrence must be idempotent.
7. Infrastructure failures must not be recorded as endpoint failures.
8. Enforce monitor ownership at the service and database boundaries.
9. Security requirements, especially SSRF protection, are mandatory.
10. Every phase must pass its acceptance criteria before the next dependent phase begins.

---

# 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| UI | React, TypeScript, Tailwind CSS |
| Components | shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form, Zod |
| Client State | TanStack Query |
| Backend | NestJS |
| Runtime | Node.js |
| Language | TypeScript |
| API | REST |
| Database | PostgreSQL |
| Database Hosting | Supabase |
| ORM | Prisma |
| Queue | BullMQ |
| Queue Storage | Redis |
| Email | Resend |
| Testing | Jest, Supertest, Playwright |
| Load Testing | k6 |
| Package Manager | pnpm |
| Monorepo | Turborepo |
| Frontend Hosting | Vercel |
| Backend Hosting | Docker-compatible hosting |

---

# 3. Monorepo Structure

Create the following structure:

```text
pulsewatch/
│
├── apps/
│   ├── web/
│   │   └── Next.js application
│   │
│   ├── api/
│   │   └── NestJS REST API
│   │
│   ├── scheduler/
│   │   └── Monitoring scheduler
│   │
│   ├── worker/
│   │   └── Monitoring execution worker
│   │
│   └── notification-worker/
│       └── Notification processing worker
│
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   ├── prisma.config.ts
│   │   └── src/
│   │
│   ├── shared/
│   │   └── Shared types and contracts
│   │
│   └── config/
│       └── Shared configurations
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API_SPECIFICATION.md
│   ├── SECURITY.md
│   └── DEVELOPMENT_PLAN.md
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .env.example
├── .gitignore
└── README.md
```

The exact workspace scripts and package boundaries should be finalized during Phase 1.

---

# 4. Implementation Phases

## Phase 0 — Project Preparation

**Priority:** Critical  
**Estimated Duration:** 0.5–1 day

### Tasks

- [ ] Review all project documentation.
- [ ] Verify PRD and architecture consistency.
- [ ] Verify database entities and relationships.
- [ ] Verify API contracts.
- [ ] Review security requirements.
- [ ] Finalize MVP scope.
- [ ] Create Git repository.
- [ ] Create initial project README.
- [ ] Create issue tracking milestones.

### Deliverables

- Approved project documentation.
- Git repository.
- Defined MVP scope.
- Initial implementation backlog.

### Acceptance Criteria

- No unresolved architectural contradictions.
- Database entities support the required API workflows.
- Every MVP feature has an implementation phase.
- Security requirements are documented before monitoring execution begins.

---

## Phase 1 — Monorepo and Infrastructure Setup

**Priority:** Critical  
**Estimated Duration:** 1–2 days

### Tasks

#### 1.1 Monorepo Setup

- [ ] Initialize pnpm workspace.
- [ ] Configure Turborepo.
- [ ] Configure TypeScript.
- [ ] Configure ESLint.
- [ ] Configure Prettier.
- [ ] Configure path aliases.
- [ ] Configure shared environment validation.
- [ ] Configure Git ignore rules.

#### 1.2 Application Setup

- [ ] Initialize Next.js in `apps/web`.
- [ ] Initialize NestJS in `apps/api`.
- [ ] Create scheduler application.
- [ ] Create monitoring worker application.
- [ ] Create notification worker application.

#### 1.3 Infrastructure Setup

- [ ] Create Supabase PostgreSQL project.
- [ ] Configure pooled `DATABASE_URL`.
- [ ] Configure direct `DIRECT_URL`.
- [ ] Create Redis instance.
- [ ] Configure BullMQ connection.
- [ ] Configure local development environment.
- [ ] Create Docker Compose configuration for local dependencies where appropriate.

#### 1.4 Shared Packages

- [ ] Configure `packages/database`.
- [ ] Configure `packages/shared`.
- [ ] Configure `packages/config`.
- [ ] Establish workspace dependency boundaries.

### Deliverables

- Working monorepo.
- All applications boot successfully.
- PostgreSQL connectivity.
- Redis connectivity.
- Shared TypeScript configuration.

### Acceptance Criteria

- `pnpm install` succeeds.
- All applications compile.
- Web application starts.
- API starts.
- Scheduler and workers start independently.
- Database connectivity is verified.
- Redis connectivity is verified.
- Environment variables are validated at startup.

---

## Phase 2 — Database and Prisma Implementation

**Priority:** Critical  
**Estimated Duration:** 2–3 days

### Tasks

#### 2.1 Prisma Setup

- [ ] Configure Prisma using a version-consistent setup.
- [ ] Configure Supabase connection strings.
- [ ] Create initial Prisma schema.
- [ ] Configure database migrations.
- [ ] Generate Prisma Client.
- [ ] Implement database package exports.
- [ ] Implement database connection lifecycle management.

#### 2.2 Core Models

Implement:

- [ ] User
- [ ] Monitor
- [ ] MonitoringOccurrence
- [ ] MonitorCheck
- [ ] Incident
- [ ] IncidentEvent
- [ ] NotificationChannel
- [ ] NotificationDelivery
- [ ] OutboxEvent
- [ ] RefreshToken

#### 2.3 Secondary Models

- [ ] StatusPage
- [ ] StatusPageMonitor
- [ ] MonitorHourlyAggregate
- [ ] MonitorDailyAggregate

#### 2.4 Database Constraints

- [ ] Unique monitor occurrence per scheduled timestamp.
- [ ] Unique check per occurrence.
- [ ] One active incident per monitor.
- [ ] Unique notification delivery per incident, channel, and event.
- [ ] Unique status page slug.
- [ ] Unique aggregate per monitor and bucket.
- [ ] Appropriate foreign keys and deletion policies.
- [ ] Indexes for common queries.
- [ ] Partial indexes through custom SQL migrations where required.

#### 2.5 Data Access

- [ ] Create database service.
- [ ] Create repository abstractions only where they provide meaningful value.
- [ ] Implement transaction helpers.
- [ ] Implement pagination utilities.
- [ ] Implement health checks.

### Deliverables

- Complete Prisma schema.
- Initial database migration.
- Database package.
- Verified relational constraints.

### Acceptance Criteria

- Migrations execute successfully against Supabase.
- Prisma Client generates successfully.
- All relationships work.
- Unique constraints prevent duplicate records.
- Transactions roll back correctly.
- Database connections are closed gracefully during shutdown.

**Important:** Do not assume that every PostgreSQL feature is expressible in Prisma schema syntax. Use custom SQL migrations for partial indexes and other unsupported constraints.

---

## Phase 3 — Authentication and Authorization

**Priority:** Critical  
**Estimated Duration:** 2–3 days

### Tasks

#### 3.1 Authentication

- [ ] Implement user registration.
- [ ] Implement login.
- [ ] Implement password hashing using Argon2id.
- [ ] Implement access token generation.
- [ ] Implement refresh token generation.
- [ ] Store only refresh token hashes.
- [ ] Implement refresh token rotation.
- [ ] Implement refresh token reuse detection.
- [ ] Implement logout.
- [ ] Implement session revocation.
- [ ] Implement current-user endpoint.

#### 3.2 Authorization

- [ ] Implement authentication guards.
- [ ] Implement user ownership checks.
- [ ] Protect all private endpoints.
- [ ] Prevent IDOR/BOLA vulnerabilities.
- [ ] Implement resource-level authorization.

#### 3.3 Security

- [ ] Configure Secure, HttpOnly refresh-token cookies.
- [ ] Configure SameSite policy.
- [ ] Implement CSRF protections where required.
- [ ] Configure CORS.
- [ ] Implement authentication rate limits.
- [ ] Validate all incoming payloads.

### API Endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### Deliverables

- Complete authentication module.
- Authorization guards.
- Refresh-token lifecycle.
- Authentication tests.

### Acceptance Criteria

- Users can register and log in.
- Invalid credentials are rejected.
- Expired access tokens are rejected.
- Refresh token rotation works.
- Reused refresh tokens trigger the defined revocation policy.
- Users cannot access another user's resources.
- Sensitive tokens never appear in logs.

---

## Phase 4 — Monitor Management API

**Priority:** Critical  
**Estimated Duration:** 2–3 days

### Tasks

#### 4.1 Monitor CRUD

- [ ] Create monitor.
- [ ] List monitors.
- [ ] Get monitor details.
- [ ] Update monitor.
- [ ] Enable monitor.
- [ ] Disable monitor.
- [ ] Delete monitor.

#### 4.2 Validation

- [ ] Validate monitor name.
- [ ] Validate URL format.
- [ ] Validate HTTP method.
- [ ] Validate monitoring interval.
- [ ] Validate timeout.
- [ ] Validate expected status code.
- [ ] Validate monitor limits.
- [ ] Validate user ownership.

#### 4.3 Monitor Lifecycle

- [ ] Define monitor status transitions.
- [ ] Handle monitor activation.
- [ ] Handle monitor deactivation.
- [ ] Handle configuration changes.
- [ ] Handle monitor deletion safely.

#### 4.4 API Integration

- [ ] Implement DTOs.
- [ ] Implement controllers.
- [ ] Implement services.
- [ ] Implement response serialization.
- [ ] Implement consistent error handling.
- [ ] Implement pagination.

### API Endpoints

```text
POST   /api/v1/monitors
GET    /api/v1/monitors
GET    /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id/enable
PATCH  /api/v1/monitors/:id/disable
DELETE /api/v1/monitors/:id
```

### Deliverables

- Monitor management module.
- Validated CRUD endpoints.
- Ownership enforcement.
- API integration tests.

### Acceptance Criteria

- Users can manage their own monitors.
- Users cannot modify other users' monitors.
- Invalid configurations are rejected.
- Monitor creation does not synchronously execute an HTTP request.
- Monitor changes are reflected in future scheduling decisions.

---

## Phase 5 — Monitoring Scheduler and Queue

**Priority:** Critical  
**Estimated Duration:** 3–4 days

### Architecture

```text
PostgreSQL
    |
    v
Scheduler
    |
    v
Find Due Monitors
    |
    v
Create Monitoring Occurrences
    |
    v
BullMQ
    |
    v
Monitoring Worker
```

### Tasks

#### 5.1 Scheduler

- [ ] Implement scheduler application.
- [ ] Query enabled and due monitors.
- [ ] Identify scheduled occurrences.
- [ ] Create occurrence records.
- [ ] Implement atomic claiming.
- [ ] Implement lease ownership.
- [ ] Implement lease expiration.
- [ ] Implement batch processing.
- [ ] Prevent duplicate scheduling.
- [ ] Handle scheduler restarts.

#### 5.2 BullMQ

- [ ] Configure Redis connection.
- [ ] Create monitoring queue.
- [ ] Define typed job payloads.
- [ ] Configure bounded retries.
- [ ] Configure exponential backoff.
- [ ] Configure job retention.
- [ ] Handle failed jobs.

#### 5.3 Reliability

- [ ] Implement idempotent scheduling.
- [ ] Handle duplicate queue jobs.
- [ ] Handle worker downtime.
- [ ] Handle expired leases.
- [ ] Handle Redis downtime.
- [ ] Prevent uncontrolled job accumulation.

### Monitoring Job Contract

```typescript
interface MonitoringJob {
  monitorId: string;
  occurrenceId: string;
  scheduledAt: string;
}
```

### Deliverables

- Independent scheduler.
- Monitoring queue.
- Occurrence lifecycle.
- Reliable job dispatch.

### Acceptance Criteria

- Enabled monitors are scheduled according to their configured interval.
- Disabled monitors are not scheduled.
- Duplicate scheduler execution does not create duplicate occurrences.
- Expired leases can be safely reclaimed.
- Scheduler restarts do not permanently lose due work.
- Queue failures are observable and recoverable.

**Important:** Use database-backed occurrence records as the idempotency boundary. BullMQ job IDs alone are not sufficient for end-to-end exactly-once processing.

---

## Phase 6 — Monitoring Execution Worker

**Priority:** Critical  
**Estimated Duration:** 3–4 days

### Tasks

#### 6.1 HTTP Execution Engine

- [ ] Implement HTTP monitoring client.
- [ ] Support GET.
- [ ] Support HEAD.
- [ ] Configure connection timeout.
- [ ] Configure total request timeout.
- [ ] Measure response time.
- [ ] Capture HTTP status code.
- [ ] Capture relevant response metadata.
- [ ] Limit response body size.
- [ ] Handle connection errors.
- [ ] Handle DNS errors.
- [ ] Handle TLS errors.
- [ ] Handle timeout errors.

#### 6.2 SSRF Protection

- [ ] Validate URL scheme.
- [ ] Restrict allowed ports.
- [ ] Resolve DNS records.
- [ ] Reject private IP addresses.
- [ ] Reject loopback addresses.
- [ ] Reject link-local addresses.
- [ ] Reject reserved addresses.
- [ ] Handle IPv4-mapped IPv6.
- [ ] Prevent DNS rebinding.
- [ ] Validate every redirect destination or disable redirects.
- [ ] Pin validated destination IP during connection.
- [ ] Preserve correct TLS SNI and Host header.
- [ ] Enforce outbound network restrictions.

#### 6.3 Result Persistence

- [ ] Persist successful checks.
- [ ] Persist failed checks.
- [ ] Persist response time.
- [ ] Persist status code.
- [ ] Persist error classification.
- [ ] Persist occurrence completion.
- [ ] Prevent duplicate result persistence.

#### 6.4 Failure Classification

Distinguish:

| Failure | Counts as endpoint failure? |
|---|---|
| HTTP status mismatch | Yes |
| Connection refused | Yes |
| DNS resolution failure | Yes |
| Target timeout | Yes |
| TLS validation failure | Yes |
| Worker process crash | No |
| Redis unavailable | No |
| Database unavailable | No |
| Internal programming error | No |

Target-level retries and infrastructure-level retries must remain separate.

### Deliverables

- Monitoring execution engine.
- SSRF-safe HTTP client.
- Persisted monitoring results.
- Failure classification.

### Acceptance Criteria

- Workers execute queued occurrences.
- Results are persisted idempotently.
- Infrastructure failures do not count as endpoint failures.
- Timeouts are enforced.
- SSRF protection is tested.
- Worker crashes do not create false endpoint failures.

---

## Phase 7 — Incident Detection and Management

**Priority:** Critical  
**Estimated Duration:** 2–3 days

### Incident State Machine

```text
              3 Consecutive Failures
Operational --------------------------> OPEN
                                         |
                                         | First Success
                                         v
                                    RECOVERING
                                      /      \
                                     /        \
                          Failure  /          \ 2 Consecutive Successes
                                   v            v
                                  OPEN       RESOLVED
```

### Tasks

- [ ] Implement failure threshold evaluation.
- [ ] Implement recovery threshold evaluation.
- [ ] Implement incident creation.
- [ ] Implement incident updates.
- [ ] Implement incident resolution.
- [ ] Implement incident event history.
- [ ] Implement incident deduplication.
- [ ] Enforce one active incident per monitor.
- [ ] Implement transactional incident transitions.
- [ ] Write outbox events within the same transaction.

### Business Rules

- Three consecutive endpoint failures open an incident.
- The first successful check moves an open incident to recovering.
- A failure during recovery returns the incident to open.
- Two consecutive successful checks resolve the incident.
- Only one active incident can exist per monitor.
- Duplicate check processing must not increment failure or recovery counters twice.

### Deliverables

- Incident state machine.
- Incident API.
- Incident event history.
- Transactional outbox integration.

### Acceptance Criteria

- Incident opens at the configured failure threshold.
- Incident recovery follows the defined state machine.
- Incident resolution follows the configured success threshold.
- Duplicate processing does not create duplicate incidents.
- Incident state changes and outbox events commit atomically.

---

## Phase 8 — Notification System

**Priority:** High  
**Estimated Duration:** 2–3 days

### Tasks

#### 8.1 Notification Infrastructure

- [ ] Implement notification worker.
- [ ] Implement outbox dispatcher.
- [ ] Implement notification queue.
- [ ] Implement retry and backoff.
- [ ] Implement delivery status tracking.
- [ ] Implement idempotent delivery records.

#### 8.2 Email Notifications

- [ ] Integrate Resend.
- [ ] Create incident-opened email.
- [ ] Create incident-recovering email.
- [ ] Create incident-resolved email.
- [ ] Implement email templates.
- [ ] Handle delivery failures.

#### 8.3 Notification Channels

- [ ] Create email channel.
- [ ] List channels.
- [ ] Update channels.
- [ ] Delete channels.
- [ ] Associate channels with user notifications.

#### 8.4 Security

- [ ] Encrypt sensitive channel configuration.
- [ ] Never return secret values in API responses.
- [ ] Redact secrets from logs.
- [ ] Avoid storing secrets in queue payloads.

### Deliverables

- Notification processing pipeline.
- Resend integration.
- Email templates.
- Delivery history.

### Acceptance Criteria

- Incident events generate notification jobs.
- Notifications are not lost when queue publishing temporarily fails.
- Failed deliveries are retried within bounded limits.
- Duplicate events do not cause duplicate logical deliveries.
- Delivery status is recorded.
- Sensitive channel data is protected.

---

## Phase 9 — Analytics and Dashboard APIs

**Priority:** High  
**Estimated Duration:** 2–3 days

### Tasks

#### 9.1 Monitoring Analytics

- [ ] Latest monitor status.
- [ ] Current response time.
- [ ] Historical response time.
- [ ] Uptime percentage.
- [ ] Availability history.
- [ ] Incident history.
- [ ] Check history.

#### 9.2 Aggregation

- [ ] Implement hourly aggregates.
- [ ] Implement daily aggregates.
- [ ] Implement aggregation worker.
- [ ] Implement historical backfill strategy.
- [ ] Prevent duplicate aggregation.
- [ ] Handle late-arriving check results.

#### 9.3 Dashboard API

- [ ] Total monitors.
- [ ] Operational monitors.
- [ ] Down monitors.
- [ ] Active incidents.
- [ ] Average response time.
- [ ] Overall uptime.
- [ ] Recent activity.

### Deliverables

- Analytics endpoints.
- Dashboard endpoints.
- Aggregate processing.
- Historical data queries.

### Acceptance Criteria

- Uptime calculations follow the database specification.
- Missing monitoring data is not treated as success.
- Infrastructure failures are excluded from endpoint availability calculations.
- Analytics queries use appropriate indexes.
- Aggregation can safely run more than once.

---

## Phase 10 — Frontend Implementation

**Priority:** High  
**Estimated Duration:** 5–7 days

### 10.1 Foundation

- [ ] Configure Tailwind CSS.
- [ ] Configure shadcn/ui.
- [ ] Configure application layout.
- [ ] Configure routing.
- [ ] Configure TanStack Query.
- [ ] Configure API client.
- [ ] Configure authentication state.
- [ ] Configure form validation.

### 10.2 Authentication Pages

- [ ] Login page.
- [ ] Registration page.
- [ ] Logout flow.
- [ ] Session refresh handling.
- [ ] Protected routes.

### 10.3 Dashboard

- [ ] Dashboard overview.
- [ ] Monitor statistics.
- [ ] Overall uptime.
- [ ] Response time charts.
- [ ] Recent incidents.
- [ ] Recent activity.

### 10.4 Monitor Management

- [ ] Monitor list.
- [ ] Monitor creation form.
- [ ] Monitor details.
- [ ] Monitor edit form.
- [ ] Enable/disable controls.
- [ ] Delete confirmation.
- [ ] Monitor status indicators.

### 10.5 Incident Management

- [ ] Incident list.
- [ ] Incident details.
- [ ] Incident timeline.
- [ ] Incident status indicators.

### 10.6 Analytics

- [ ] Uptime charts.
- [ ] Response time charts.
- [ ] Availability history.
- [ ] Date-range filtering.

### 10.7 Settings

- [ ] Notification channel management.
- [ ] User account settings.
- [ ] Session management.

### Deliverables

- Complete MVP frontend.
- Responsive dashboard.
- Integrated API workflows.

### Acceptance Criteria

- All core workflows function without manual API calls.
- Loading, empty, success, and error states are implemented.
- Forms validate inputs.
- Authentication failures are handled.
- Dashboard data is refreshed appropriately.
- Charts display accurate backend data.
- UI is usable on desktop and mobile.

---

## Phase 11 — Testing and Quality Assurance

**Priority:** Critical  
**Estimated Duration:** 3–4 days

### Unit Testing

- [ ] Authentication services.
- [ ] Monitor services.
- [ ] Scheduler logic.
- [ ] Occurrence claiming.
- [ ] Monitoring execution.
- [ ] Failure classification.
- [ ] Incident state machine.
- [ ] Uptime calculations.
- [ ] Notification processing.

### Integration Testing

- [ ] PostgreSQL integration.
- [ ] Prisma transaction behavior.
- [ ] Redis integration.
- [ ] BullMQ job processing.
- [ ] Outbox dispatching.
- [ ] Resend integration using a test adapter.
- [ ] API ownership enforcement.

### End-to-End Testing

- [ ] User registration.
- [ ] User login.
- [ ] Create monitor.
- [ ] Execute scheduled check.
- [ ] Persist monitoring result.
- [ ] Open incident.
- [ ] Send notification.
- [ ] Recover monitor.
- [ ] Resolve incident.
- [ ] Display dashboard updates.

### Security Testing

- [ ] SSRF tests.
- [ ] DNS rebinding tests.
- [ ] Redirect validation tests.
- [ ] Private IP blocking tests.
- [ ] Authentication bypass tests.
- [ ] IDOR/BOLA tests.
- [ ] Rate-limit tests.
- [ ] Refresh token reuse tests.
- [ ] Secret leakage tests.

### Load Testing

Use k6 to evaluate:

- [ ] API throughput.
- [ ] API latency.
- [ ] Scheduler throughput.
- [ ] Queue processing throughput.
- [ ] Worker concurrency.
- [ ] Database connection pressure.
- [ ] Notification backlog behavior.

### Acceptance Criteria

- All critical unit tests pass.
- Integration tests pass against real PostgreSQL and Redis test instances.
- Critical E2E workflows pass.
- SSRF security tests pass.
- No critical authorization vulnerabilities remain.
- Load tests identify and document capacity limits.

---

## Phase 12 — Deployment and Production Readiness

**Priority:** Critical  
**Estimated Duration:** 2–3 days

### Tasks

#### 12.1 Frontend Deployment

- [ ] Configure production environment variables.
- [ ] Deploy Next.js to Vercel.
- [ ] Configure production domain.
- [ ] Configure CORS.
- [ ] Verify frontend-to-API communication.

#### 12.2 Backend Deployment

- [ ] Create production Docker images.
- [ ] Deploy API.
- [ ] Deploy scheduler.
- [ ] Deploy monitoring worker.
- [ ] Deploy notification worker.
- [ ] Configure graceful shutdown.
- [ ] Configure health checks.
- [ ] Configure restart policies.

#### 12.3 Database

- [ ] Configure Supabase production database.
- [ ] Configure pooled connection URL.
- [ ] Configure direct migration URL.
- [ ] Run production migrations.
- [ ] Verify backup and recovery procedures.
- [ ] Review database connection limits.

#### 12.4 Redis

- [ ] Configure production Redis.
- [ ] Configure authentication and TLS.
- [ ] Configure persistence according to provider capabilities.
- [ ] Configure queue monitoring.
- [ ] Configure connection limits.

#### 12.5 Observability

- [ ] Configure structured logging.
- [ ] Configure error tracking.
- [ ] Configure uptime checks for PulseWatch itself.
- [ ] Configure scheduler delay metrics.
- [ ] Configure queue depth metrics.
- [ ] Configure worker health metrics.
- [ ] Configure database health metrics.
- [ ] Configure notification failure metrics.

#### 12.6 Security

- [ ] Remove development credentials.
- [ ] Verify secret management.
- [ ] Verify TLS.
- [ ] Verify CORS restrictions.
- [ ] Verify security headers.
- [ ] Verify rate limits.
- [ ] Verify outbound network restrictions.
- [ ] Verify database access restrictions.

### Deliverables

- Production deployment.
- Deployment documentation.
- Environment configuration.
- Monitoring and alerting.
- Production readiness checklist.

### Acceptance Criteria

- All services start independently.
- Services recover from process restarts.
- Database migrations are applied safely.
- Queue processing works in production.
- Health checks report actual service readiness.
- Logs and metrics provide enough information to investigate failures.
- No production secrets are committed to Git.

---

# 5. MVP Feature Prioritization

| Feature | Priority | Release |
|---|---|---|
| Authentication | Critical | MVP |
| Monitor CRUD | Critical | MVP |
| Monitoring scheduler | Critical | MVP |
| Monitoring worker | Critical | MVP |
| Uptime calculation | Critical | MVP |
| Incident detection | Critical | MVP |
| Email notifications | High | MVP |
| Dashboard | High | MVP |
| Response time analytics | High | MVP |
| Check history | High | MVP |
| Notification channel management | High | MVP |
| Public status pages | Medium | Post-MVP |
| Slack notifications | Medium | Post-MVP |
| Multi-region monitoring | Low | Future |
| Team collaboration | Low | Future |
| Billing and subscriptions | Low | Future |
| AI anomaly detection | Low | Future |

---

# 6. Recommended Development Order

Follow this order rather than implementing frontend and backend features randomly.

```text
Phase 0: Documentation Review
          |
          v
Phase 1: Monorepo Setup
          |
          v
Phase 2: Database + Prisma
          |
          v
Phase 3: Authentication
          |
          v
Phase 4: Monitor Management API
          |
          v
Phase 5: Scheduler + BullMQ
          |
          v
Phase 6: Monitoring Worker
          |
          v
Phase 7: Incident Management
          |
          v
Phase 8: Notification System
          |
          v
Phase 9: Analytics APIs
          |
          v
Phase 10: Frontend
          |
          v
Phase 11: Testing
          |
          v
Phase 12: Production Deployment
```

Some work can proceed in parallel once its dependencies are stable. For example, frontend component design can begin while backend modules are being implemented, provided the API contracts remain the source of truth.

---

# 7. Development Milestones

| Milestone | Completion Criteria |
|---|---|
| M1 — Foundation | Monorepo, apps, Supabase, Redis |
| M2 — Database | Prisma schema and migrations |
| M3 — Authentication | Registration, login, sessions |
| M4 — Monitor API | Complete monitor CRUD |
| M5 — Scheduling | Due occurrences reliably queued |
| M6 — Monitoring | HTTP checks executed and persisted |
| M7 — Incidents | Outages detected and resolved |
| M8 — Notifications | Incident emails delivered |
| M9 — Analytics | Uptime and response-time APIs |
| M10 — Dashboard | Frontend MVP integrated |
| M11 — QA | Critical tests and security checks pass |
| M12 — Release | Production deployment verified |

---

# 8. Engineering Standards

## 8.1 Code Quality

- Use TypeScript strict mode.
- Avoid `any`.
- Use explicit return types for public service methods where beneficial.
- Validate all external inputs.
- Use dependency injection consistently.
- Keep controllers thin.
- Keep business logic in services or domain modules.
- Avoid unnecessary abstraction.
- Use shared types only for genuinely shared contracts.
- Handle errors explicitly.
- Use structured logging.

## 8.2 Database Standards

- Use Prisma for normal application queries.
- Use custom SQL migrations for unsupported PostgreSQL features.
- Use transactions for multi-record state transitions.
- Avoid unbounded queries.
- Add indexes based on query patterns.
- Never use application-side read-then-write logic as a substitute for atomic database constraints.
- Do not run destructive production migrations without a rollback or recovery strategy.

## 8.3 Background Processing Standards

- Every job must have a defined contract.
- Every job handler must be idempotent.
- Retries must be bounded.
- Backoff must be configured.
- Poison jobs must be observable.
- Job payloads must not contain unnecessary sensitive information.
- Queue delivery must not be treated as exactly-once execution.
- Persisted occurrence records must define processing identity.

## 8.4 API Standards

- Version APIs under `/api/v1`.
- Use consistent response formats.
- Validate request DTOs.
- Enforce ownership on every private resource.
- Implement pagination.
- Apply rate limits.
- Avoid exposing internal exception details.
- Document API changes.

## 8.5 Git Standards

Use feature branches:

```text
main
develop
feature/authentication
feature/monitor-management
feature/monitoring-scheduler
feature/monitoring-worker
feature/incident-management
feature/notifications
feature/dashboard
```

Suggested commit format:

```text
feat(auth): implement user registration
feat(monitors): add monitor CRUD
feat(scheduler): implement occurrence claiming
feat(worker): add HTTP monitoring execution
feat(incidents): implement incident state machine
fix(worker): prevent duplicate check persistence
test(incidents): add recovery transition tests
docs(api): update endpoint specification
```

---

# 9. Definition of Done

A feature is complete only when:

- [ ] Requirements are implemented.
- [ ] Input validation is implemented.
- [ ] Authorization is verified.
- [ ] Error handling is implemented.
- [ ] Logging is implemented without leaking secrets.
- [ ] Unit tests pass.
- [ ] Relevant integration tests pass.
- [ ] API documentation is updated.
- [ ] Database migrations are included when needed.
- [ ] Edge cases are addressed.
- [ ] No critical lint or type errors remain.
- [ ] The feature works in the local development environment.

For critical infrastructure features, such as scheduling, monitoring execution, and incident processing, idempotency and failure recovery are mandatory completion criteria.

---

# 10. Critical Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| SSRF vulnerability | Critical | URL validation, DNS/IP validation, connection pinning, egress controls |
| Duplicate monitoring jobs | High | Database occurrence uniqueness and atomic claiming |
| Duplicate check results | High | Unique occurrence reference and idempotent persistence |
| False outage detection | High | Separate endpoint failures from infrastructure failures |
| Duplicate incidents | High | Transactional state transitions and unique active incident constraint |
| Lost notifications | High | Transactional outbox and retryable dispatcher |
| Redis downtime | High | Persist scheduling state in PostgreSQL and safely redispatch |
| Database connection exhaustion | High | Supabase pooling, bounded concurrency, connection monitoring |
| Scheduler downtime | High | Lease recovery and restart-safe scheduling |
| Worker overload | High | Bounded concurrency and queue backpressure |
| Slow analytics queries | Medium | Indexing, aggregation tables, retention policies |
| Secret leakage | Critical | Encryption, masking, redaction, access controls |

---

# 11. Important Architectural Decisions

## 11.1 PostgreSQL Is the Source of Truth

Redis is not the permanent record of monitoring occurrences, check results, incidents, or notification deliveries.

PostgreSQL stores durable application state. Redis/BullMQ coordinates background execution.

## 11.2 Exactly-Once Processing Is Not Assumed

Distributed queues can deliver jobs more than once.

The system must provide effectively-once business outcomes through:

- Unique occurrence identifiers.
- Database uniqueness constraints.
- Atomic state transitions.
- Idempotent job handlers.
- Transactional outbox events.
- Idempotent notification delivery records.

## 11.3 Monitoring Must Be Isolated

Monitoring execution must not depend on an API request remaining open.

The API creates or updates durable configuration. The scheduler discovers due work. Workers execute checks asynchronously.

## 11.4 SSRF Is a Release Blocker

URL parsing alone is not sufficient.

The worker must enforce destination IP restrictions at connection time and validate redirect destinations. Production egress controls must prevent access to internal infrastructure and cloud metadata endpoints.

## 11.5 Avoid Premature Complexity

Do not introduce the following during MVP without a demonstrated requirement:

- Kubernetes.
- Kafka.
- Multiple independent databases.
- Event sourcing.
- Multi-region orchestration.
- Complex service meshes.
- AI-based anomaly detection.

Start with a reliable modular monorepo and independently deployable processes.

---

# 12. Final MVP Release Checklist

## Backend

- [ ] Authentication works.
- [ ] Monitor CRUD works.
- [ ] Scheduler creates due occurrences.
- [ ] Workers execute HTTP checks.
- [ ] Check results persist correctly.
- [ ] Incident detection works.
- [ ] Incident recovery works.
- [ ] Email notifications work.
- [ ] Analytics APIs return correct values.
- [ ] SSRF protection is verified.

## Frontend

- [ ] Login and registration work.
- [ ] Dashboard displays accurate metrics.
- [ ] Users can create and manage monitors.
- [ ] Monitor details display check history.
- [ ] Incident details display state changes.
- [ ] Notification settings work.
- [ ] Loading and error states are implemented.
- [ ] Responsive layout works.

## Infrastructure

- [ ] Supabase PostgreSQL is configured.
- [ ] Redis is configured.
- [ ] API is deployed.
- [ ] Scheduler is deployed.
- [ ] Monitoring worker is deployed.
- [ ] Notification worker is deployed.
- [ ] Frontend is deployed.
- [ ] Environment variables are secured.
- [ ] Logging and health checks work.
- [ ] Backup and recovery procedures are documented.

## Quality

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] E2E tests pass.
- [ ] Security tests pass.
- [ ] Load tests are evaluated.
- [ ] No critical bugs remain.
- [ ] Documentation is updated.

---

# 13. Release Criteria

PulseWatch MVP is ready for release when:

1. Users can register and authenticate securely.
2. Users can create and manage HTTP monitors.
3. The scheduler reliably generates monitoring occurrences.
4. Workers execute checks and persist results.
5. The system detects outages and recoveries correctly.
6. Incident notifications are delivered reliably.
7. The dashboard displays accurate monitoring information.
8. SSRF protections are verified.
9. Critical automated tests pass.
10. All production services are deployed and observable.

**Release principle:** Reliability and security take precedence over feature count. A smaller monitoring platform that correctly detects outages is more valuable than a feature-rich platform that silently loses checks or generates false incidents.
