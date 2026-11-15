# PulseWatch
## Product Requirements Document (PRD)

| Property | Details |
|---|---|
| Product Name | PulseWatch |
| Product Category | API Monitoring & Incident Management |
| Document Version | 1.0 |
| Status | Draft |
| Priority | High |
| Target Audience | Developers, DevOps Engineers, Engineering Teams |
| Product Type | SaaS Web Application |

---

# 1. Product Overview

## 1.1 Introduction

PulseWatch is a web-based API monitoring and incident management platform that allows developers and engineering teams to monitor the availability, reliability, and performance of their APIs and websites.

The platform enables users to register endpoints, schedule automated health checks, measure response times, calculate uptime percentages, detect service failures, and receive real-time incident notifications.

PulseWatch will use distributed background workers to execute monitoring jobs independently of the main application server.

The platform aims to provide essential functionality comparable to established monitoring platforms such as Better Stack and UptimeRobot.

## 1.2 Problem Statement

Developers and engineering teams need reliable visibility into the availability and performance of their APIs.

Without an automated monitoring solution:

- API downtime may go unnoticed.
- Users may experience failures before developers become aware of them.
- Response-time degradation can remain undetected.
- Incident investigation becomes difficult.
- Historical uptime and performance data may be unavailable.
- Teams lack a centralized view of service health.

PulseWatch addresses these problems through automated monitoring, incident detection, historical analytics, and notification management.

## 1.3 Product Vision

Build a reliable, scalable, and developer-friendly API monitoring platform that helps engineering teams identify service failures early, understand system performance, and reduce downtime.

## 1.4 Product Objectives

1. Allow users to register and manage API endpoints.
2. Execute automated health checks at configurable intervals.
3. Measure and record API response times.
4. Calculate historical uptime and availability.
5. Detect failures and automatically create incidents.
6. Notify users through email and Slack.
7. Provide historical performance analytics.
8. Offer publicly accessible service status pages.
9. Support horizontally scalable background workers.
10. Provide a secure and reliable monitoring infrastructure.

---

# 2. Target Users

## 2.1 Primary Users

### Software Developers
Developers who need to monitor their APIs and backend services.

Requirements:
- Register API endpoints.
- Monitor endpoint availability.
- Review response-time history.
- Receive failure notifications.

### DevOps Engineers
Engineers responsible for service availability and infrastructure reliability.

Requirements:
- Monitor multiple services.
- Identify incidents.
- Review historical uptime.
- Configure monitoring intervals.
- Investigate service failures.

### Small Engineering Teams
Teams that need centralized monitoring for multiple applications.

Requirements:
- Manage multiple monitors.
- Share service health information.
- Configure notification channels.
- Publish public status pages.

---

# 3. Product Scope

## 3.1 MVP Features

The initial release must include:

1. User authentication.
2. Monitor management.
3. Scheduled health checks.
4. Background monitoring workers.
5. Response-time tracking.
6. Uptime calculations.
7. Incident detection.
8. Email notifications.
9. Monitoring dashboard.
10. Historical performance charts.

## 3.2 Post-MVP Features

The following features will be implemented after the core monitoring system is stable:

1. Slack notifications.
2. Public status pages.
3. Advanced incident management.
4. Multiple monitoring regions.
5. Advanced analytics.
6. Team collaboration.
7. Custom alert policies.
8. Advanced monitoring reports.

## 3.3 Out of Scope

The initial product will NOT include:

- Full application performance monitoring (APM).
- Distributed tracing.
- Log aggregation.
- Infrastructure metrics collection.
- Mobile applications.
- Billing and subscription management.
- Kubernetes cluster monitoring.
- AI-based anomaly detection.

These features may be considered in future releases.

---

# 4. Functional Requirements

## FR-01: User Authentication

### Description

Users must be able to create accounts and securely access the platform.

### Requirements

- User registration.
- User login.
- User logout.
- Password hashing.
- Session or token-based authentication.
- Protected application routes.
- User profile management.
- Password reset workflow.

### Business Rules

- Email addresses must be unique.
- Passwords must be securely hashed.
- Unauthenticated users cannot access protected resources.
- Users can only access their own monitors and incidents.

### Acceptance Criteria

- Users can successfully register.
- Duplicate email registration is rejected.
- Invalid credentials are rejected.
- Protected APIs require valid authentication.
- User data is isolated between accounts.

---

## FR-02: Monitor Management

### Description

Users must be able to register and manage HTTP/HTTPS endpoints.

### Monitor Configuration

Each monitor must support:

| Field | Description |
|---|---|
| Name | Monitor display name |
| URL | Target API endpoint |
| HTTP Method | GET, HEAD |
| Check Interval | Frequency of health checks |
| Timeout | Maximum request duration |
| Expected Status Code | Expected HTTP response |
| Enabled | Whether monitoring is active |

### Initial Configuration

- Default monitoring interval: 60 seconds.
- Default timeout: 10 seconds.
- Default HTTP method: GET.
- Default expected status: 200.
- Supported protocols: HTTP and HTTPS.

### Requirements

- Create monitor.
- View monitors.
- Update monitor.
- Delete monitor.
- Enable monitor.
- Disable monitor.
- View monitor details.

### Business Rules

- Every monitor belongs to an authenticated user.
- Disabled monitors must not receive new scheduled checks.
- Invalid URLs must be rejected.
- Monitor ownership must be verified for every operation.
- Monitor configuration changes must be validated.

### Acceptance Criteria

- Users can register valid endpoints.
- Users can update existing monitors.
- Users cannot access another user's monitors.
- Disabled monitors stop receiving new scheduled jobs.
- Deleted monitors cannot receive newly scheduled checks.

---

## FR-03: Scheduled Health Checks

### Description

The system must automatically execute health checks according to each monitor's configured interval.

### Requirements

- Maintain scheduled monitoring jobs.
- Identify monitors that are due for checking.
- Dispatch monitoring jobs to a background queue.
- Support configurable check intervals.
- Prevent duplicate scheduling for the same monitor and scheduled occurrence.
- Handle scheduler failures.
- Support monitoring job recovery after worker restarts.

### Initial Intervals

- 60 seconds.
- 5 minutes.
- 10 minutes.
- 30 minutes.

### Business Rules

- Only enabled monitors are scheduled.
- Scheduling must be independent of API request handling.
- Missed schedules must not create unlimited backlogs.
- A scheduled occurrence must have a unique identifier.
- Job execution must be idempotent.

### Acceptance Criteria

- Enabled monitors receive scheduled checks.
- Different monitors can use different intervals.
- Disabled monitors are excluded.
- Worker failures do not permanently stop monitoring.
- Duplicate jobs do not produce duplicate check records.

---

## FR-04: Background Monitoring Workers

### Description

Background workers execute HTTP health checks independently of the API server.

### Requirements

- Consume monitoring jobs from BullMQ.
- Send HTTP requests to registered endpoints.
- Measure request duration.
- Capture HTTP status codes.
- Handle connection failures.
- Handle DNS failures.
- Handle request timeouts.
- Handle unexpected responses.
- Persist monitoring results.
- Support configurable worker concurrency.

### Monitoring Result

Each check must capture:

- Monitor ID.
- HTTP status code.
- Response time.
- Success or failure.
- Error message, if applicable.
- Check timestamp.
- Job execution identifier.

### Health Check Success Rules

A health check is successful when:

1. The request completes within the configured timeout.
2. The response status matches the configured expected status.
3. No transport-level failure occurs.

### Acceptance Criteria

- Workers successfully execute monitoring jobs.
- Failed requests are recorded.
- Successful requests are recorded.
- Response times are persisted.
- Worker restarts do not permanently interrupt processing.
- Worker concurrency can be configured.

---

## FR-05: Response-Time Monitoring

### Description

The platform must measure the response time of every health check.

### Requirements

- Record response duration in milliseconds.
- Display average response time.
- Display minimum response time.
- Display maximum response time.
- Display response-time trends.
- Support historical response-time charts.

### Acceptance Criteria

- Every completed check has a recorded duration.
- Response-time information is available in monitor details.
- Historical charts display the correct time range.
- Failed requests without a completed response are handled consistently.

---

## FR-06: Uptime Calculation

### Description

The system must calculate endpoint availability using historical health-check results.

### Formula

Uptime Percentage:

Uptime (%) = (Successful Checks / Total Valid Checks) × 100

### Supported Periods

- Last 24 hours.
- Last 7 days.
- Last 30 days.
- Last 90 days.

### Requirements

- Calculate monitor-level uptime.
- Calculate historical uptime.
- Display uptime percentages.
- Support hourly aggregates.
- Support daily aggregates.
- Exclude checks that have not completed.
- Distinguish missing monitoring data from confirmed downtime.

### Acceptance Criteria

- Uptime calculations match the underlying check records.
- Different date ranges produce correct results.
- Missing data is not automatically counted as successful uptime.
- Aggregate calculations are consistent with raw monitoring data.

---

## FR-07: Incident Detection

### Description

The platform must automatically detect service failures and create incidents.

### Initial Detection Policy

Default configuration:

- Open an incident after 3 consecutive failed checks.
- Resolve an incident after 2 consecutive successful checks.

These thresholds must be configurable in a future enhancement.

### Incident Lifecycle

1. Operational.
2. Failure detected.
3. Incident opened.
4. Recovery detected.
5. Incident resolved.

### Incident Information

Each incident must include:

- Incident ID.
- Monitor ID.
- Incident title.
- Description.
- Current status.
- Start timestamp.
- Resolution timestamp.
- Associated failure events.
- Associated recovery events.

### Requirements

- Detect consecutive failures.
- Create incidents automatically.
- Prevent duplicate active incidents for one monitor.
- Record incident events.
- Detect service recovery.
- Resolve incidents automatically.
- Maintain incident history.

### Business Rules

- A monitor can have at most one active incident.
- Incident creation must be atomic.
- Repeated failures during an active incident must not create duplicate incidents.
- Recovery must be based on the configured success threshold.
- Incident state transitions must be recorded.

### Acceptance Criteria

- Three consecutive failures create an incident under the default policy.
- Repeated failures do not create duplicate active incidents.
- Two consecutive successful checks resolve an incident under the default policy.
- Incident history remains available after resolution.

---

## FR-08: Notification Management

### Description

Users must receive notifications when monitored services experience failures or recoveries.

### Supported Channels

MVP:
- Email.

Post-MVP:
- Slack.

### Notification Events

- Incident opened.
- Incident resolved.

### Requirements

- Configure notification channels.
- Enable or disable notifications.
- Deliver incident notifications.
- Deliver recovery notifications.
- Track delivery attempts.
- Retry failed notification deliveries.
- Prevent duplicate notifications for the same incident event and channel.

### Business Rules

- Notifications are sent only to authorized recipients.
- Failed deliveries must be logged.
- Notification failures must not interrupt monitoring jobs.
- Notification delivery must be asynchronous.

### Acceptance Criteria

- Incident creation triggers notification delivery.
- Incident resolution triggers recovery notification delivery.
- Failed notifications can be retried.
- Notification delivery status is recorded.

---

## FR-09: Monitoring Dashboard

### Description

Users must have a centralized dashboard showing their monitoring infrastructure.

### Dashboard Metrics

- Total monitors.
- Operational monitors.
- Down monitors.
- Active incidents.
- Average response time.
- Overall uptime.

### Dashboard Sections

1. Overview statistics.
2. Monitor list.
3. Recent incidents.
4. Response-time trends.
5. Uptime trends.
6. Recent monitoring activity.

### Requirements

- Display real-time or periodically refreshed monitoring information.
- Provide monitor status indicators.
- Allow users to navigate to monitor details.
- Allow filtering and searching.
- Support responsive layouts.

### Acceptance Criteria

- Dashboard displays accurate monitor counts.
- Monitor statuses reflect the latest completed checks.
- Active incidents are visible.
- Historical charts display the correct data.

---

## FR-10: Historical Performance Analytics

### Description

Users must be able to inspect historical monitoring performance.

### Requirements

- Display response-time charts.
- Display uptime charts.
- Display successful versus failed checks.
- Filter analytics by time period.
- Display incident history.
- Support historical data aggregation.

### Acceptance Criteria

- Users can select supported time ranges.
- Charts represent persisted monitoring data.
- Analytics are consistent with raw check records.

---

## FR-11: Public Status Pages

### Description

Users must be able to publish public pages showing the availability of selected monitors.

### Requirements

- Create status pages.
- Configure status page names.
- Generate unique public slugs.
- Add monitors to status pages.
- Publish or unpublish pages.
- Display current service status.
- Display incident history.
- Display historical uptime.

### Business Rules

- Public pages must expose only explicitly selected monitors.
- Private monitor configuration must never be exposed.
- Only authorized owners can modify status pages.
- Public pages must not require authentication.

### Acceptance Criteria

- Public pages are accessible using their unique URL.
- Only selected monitors appear.
- Unpublished pages are not publicly accessible.
- Incident and uptime information is displayed accurately.

---

# 5. Non-Functional Requirements

## NFR-01: Performance

- Dashboard APIs should target a p95 response time below 500 ms under the defined baseline workload.
- Monitoring jobs should execute within configured timeouts.
- Historical analytics should use indexed queries and aggregated data where appropriate.
- API requests must not wait for monitoring jobs to finish.

## NFR-02: Scalability

- API servers must support horizontal scaling.
- Monitoring workers must support horizontal scaling.
- Queue processing must support configurable concurrency.
- Database queries must use appropriate indexes.
- Monitoring history must support retention and archival strategies.

## NFR-03: Reliability

- Failed jobs must be handled safely.
- Workers must recover after restarts.
- Job processing must be idempotent.
- Duplicate incident creation must be prevented.
- Notification failures must not interrupt health checks.

## NFR-04: Security

- Passwords must be securely hashed.
- Protected APIs must require authentication.
- User resources must enforce ownership checks.
- Inputs must be validated.
- API endpoints must implement rate limiting.
- Secrets must be stored in environment variables or a secrets manager.
- Database connections must use secure credentials.
- HTTPS must be enforced in production.

### SSRF Protection

Because users can register arbitrary URLs, the monitoring infrastructure must prevent Server-Side Request Forgery.

Requirements:

- Reject localhost.
- Reject private and reserved IP addresses.
- Validate DNS resolution.
- Revalidate resolved IP addresses before connection.
- Validate redirect destinations.
- Prevent access to cloud metadata endpoints.
- Restrict outbound network access.
- Limit response sizes and request durations.

## NFR-05: Maintainability

- Use TypeScript.
- Follow modular architecture.
- Maintain clear separation of responsibilities.
- Use centralized error handling.
- Maintain structured logs.
- Document environment variables.
- Use database migrations.
- Maintain automated tests.

## NFR-06: Observability

The platform itself must be observable.

Requirements:

- Structured application logs.
- Worker execution logs.
- Queue failure metrics.
- API error tracking.
- Scheduler execution metrics.
- Notification delivery metrics.
- Health endpoints for application services.

---

# 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Every monitor belongs to one user. |
| BR-02 | Only enabled monitors can receive new scheduled checks. |
| BR-03 | Default check interval is 60 seconds. |
| BR-04 | Default request timeout is 10 seconds. |
| BR-05 | Default incident threshold is 3 consecutive failures. |
| BR-06 | Default recovery threshold is 2 consecutive successes. |
| BR-07 | A monitor cannot have multiple active incidents. |
| BR-08 | Monitoring results must be persisted. |
| BR-09 | Notification processing must be asynchronous. |
| BR-10 | Users cannot access resources belonging to other users. |
| BR-11 | Public status pages expose only explicitly selected information. |
| BR-12 | Disabled monitors must not receive newly scheduled checks. |

---

# 7. Data Retention Policy

Initial retention strategy:

| Data | Retention |
|---|---|
| Raw health-check results | 30 days |
| Hourly aggregates | 90 days |
| Daily aggregates | 1 year |
| Incident history | Indefinite |
| Incident events | Indefinite |
| Notification delivery logs | 90 days |
| Application logs | Based on infrastructure retention |

The retention system must use scheduled cleanup jobs.

Retention policies must not delete data required for incident investigation or published historical uptime reporting.

---

# 8. System Architecture Requirements

The platform must contain the following independently deployable services.

## 8.1 Frontend Application

Technology:
- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Recharts.

Responsibilities:
- Authentication UI.
- Monitoring dashboard.
- Monitor management.
- Incident management.
- Analytics.
- Status page management.

## 8.2 Backend API

Technology:
- NestJS.
- TypeScript.
- Prisma ORM.
- PostgreSQL.

Responsibilities:
- Authentication.
- Business logic.
- Monitor CRUD.
- Incident APIs.
- Analytics APIs.
- Notification configuration.
- Status page APIs.

## 8.3 Scheduler Service

Responsibilities:
- Identify due monitors.
- Create scheduled jobs.
- Prevent duplicate scheduling.
- Recover from scheduling failures.

## 8.4 Worker Service

Technology:
- Node.js.
- TypeScript.
- BullMQ.

Responsibilities:
- Execute health checks.
- Measure response times.
- Persist check results.
- Trigger incident evaluation.
- Handle retries.

## 8.5 Infrastructure

| Component | Technology |
|---|---|
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Queue | BullMQ |
| Cache / Queue Backend | Redis |
| Containerization | Docker |
| Frontend Hosting | Vercel |
| Email | Resend |

PostgreSQL is the permanent source of truth for application data. Redis is used for queue processing and transient coordination.

---

# 9. External Integrations

## Email Integration

Provider: Resend.

Use cases:
- Incident opened.
- Incident resolved.
- Account-related notifications.

## Slack Integration

Provider: Slack Incoming Webhooks.

Use cases:
- Incident notifications.
- Recovery notifications.

Slack integration is part of the post-MVP scope.

---

# 10. User Workflows

## Workflow 1: Register and Create a Monitor

1. User opens PulseWatch.
2. User creates an account.
3. User logs in.
4. User opens the dashboard.
5. User selects Create Monitor.
6. User enters endpoint details.
7. Backend validates configuration.
8. Monitor is saved in PostgreSQL.
9. Scheduler identifies the monitor.
10. Monitoring jobs are dispatched.
11. Dashboard displays the monitor.

## Workflow 2: Detect an Incident

1. Scheduler creates a monitoring job.
2. Worker executes the HTTP request.
3. Request fails.
4. Worker persists the result.
5. Incident detection evaluates consecutive failures.
6. Failure threshold is reached.
7. Incident is created.
8. Notification job is dispatched.
9. User receives an email.
10. Dashboard displays the incident.

## Workflow 3: Resolve an Incident

1. Worker executes another health check.
2. Target endpoint responds successfully.
3. Successful result is persisted.
4. Incident detection evaluates recovery.
5. Recovery threshold is reached.
6. Incident is resolved.
7. Resolution event is recorded.
8. Recovery notification is dispatched.
9. Dashboard updates the monitor status.

---

# 11. MVP Acceptance Criteria

The MVP will be considered complete only when the following requirements are satisfied.

| ID | Acceptance Criteria | Priority |
|---|---|---|
| AC-01 | Users can register and authenticate. | Critical |
| AC-02 | Users can create, update, and delete monitors. | Critical |
| AC-03 | Monitors are scheduled automatically. | Critical |
| AC-04 | Workers execute health checks. | Critical |
| AC-05 | Response times are persisted. | Critical |
| AC-06 | Failed checks are recorded. | Critical |
| AC-07 | Uptime is calculated accurately. | Critical |
| AC-08 | Incidents are automatically detected. | Critical |
| AC-09 | Recovery is detected automatically. | Critical |
| AC-10 | Incident notifications are delivered through email. | High |
| AC-11 | Dashboard displays monitoring metrics. | High |
| AC-12 | Historical charts are available. | High |
| AC-13 | SSRF protection is implemented and tested. | Critical |
| AC-14 | Automated tests cover critical workflows. | Critical |
| AC-15 | Application is deployed and accessible. | High |

---

# 12. Success Metrics

The project should be evaluated using measurable engineering metrics.

| Metric | Initial Target |
|---|---|
| Monitoring interval accuracy | Within 10 seconds under baseline load |
| Dashboard API latency | p95 below 500 ms |
| Incident detection | After configured failure threshold |
| Job duplication | Zero duplicate persisted results per scheduled occurrence |
| Worker recovery | Jobs recover after worker restart |
| Notification processing | Asynchronous and retryable |
| Data consistency | No duplicate active incidents per monitor |
| Test coverage | At least 80% for critical business logic |

These are initial engineering targets, not claims of achieved production performance. They must be validated through load and integration testing.

---

# 13. Development Phases

## Phase 0: Product and Architecture Planning
- Finalize PRD.
- Design system architecture.
- Design database schema.
- Define API contracts.
- Define security requirements.

## Phase 1: Project Initialization
- Initialize monorepo.
- Configure TypeScript.
- Configure Next.js.
- Configure NestJS.
- Configure Prisma.
- Connect Neon PostgreSQL.
- Configure Redis.
- Configure Docker.

## Phase 2: Authentication
- Registration.
- Login.
- Authentication guards.
- User ownership.

## Phase 3: Monitor Management
- Monitor CRUD.
- Validation.
- Monitor configuration.

## Phase 4: Scheduler and Queue
- Scheduler service.
- BullMQ configuration.
- Job dispatching.
- Duplicate prevention.

## Phase 5: Monitoring Workers
- HTTP health checks.
- Timeout handling.
- Response-time tracking.
- Result persistence.

## Phase 6: Metrics Engine
- Uptime calculations.
- Response-time analytics.
- Historical aggregation.

## Phase 7: Incident Management
- Failure detection.
- Incident creation.
- Recovery detection.
- Incident history.

## Phase 8: Notifications
- Resend integration.
- Email templates.
- Delivery tracking.
- Retry handling.

## Phase 9: Frontend Dashboard
- Overview.
- Monitor management.
- Monitor details.
- Incident dashboard.
- Analytics.

## Phase 10: Public Status Pages
- Page creation.
- Monitor association.
- Public access.

## Phase 11: Testing and Security
- Unit tests.
- Integration tests.
- End-to-end tests.
- SSRF testing.
- Load testing.

## Phase 12: Deployment
- Production database.
- Redis deployment.
- Worker deployment.
- API deployment.
- Frontend deployment.
- Monitoring and logging.

---

# 14. Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Redis unavailable | Monitoring jobs delayed | Retry and recovery strategy |
| Worker crash | Checks interrupted | Queue recovery and worker supervision |
| Duplicate jobs | Duplicate monitoring records | Idempotency keys |
| Database overload | Slow application | Indexing, aggregation, retention |
| SSRF attacks | Internal infrastructure exposure | DNS/IP validation and egress restrictions |
| Notification failures | Users miss alerts | Retry and delivery tracking |
| Scheduler drift | Delayed monitoring | Efficient due-monitor scheduling |
| Large monitoring volume | Resource exhaustion | Concurrency and rate limits |

---

# 15. Future Enhancements

Potential future capabilities:

- Multi-region monitoring.
- Custom HTTP headers.
- POST and PUT health checks.
- Request body validation.
- SSL certificate expiration monitoring.
- Domain expiration monitoring.
- DNS monitoring.
- Advanced alert rules.
- Team collaboration.
- Role-based access control.
- Subscription and billing.
- AI-assisted incident analysis.

---

# 16. Final Product Definition

PulseWatch is a distributed API monitoring and incident management SaaS platform.

The core product must allow authenticated users to register API endpoints, schedule automated health checks, execute checks through distributed background workers, record response times, calculate uptime, detect incidents, and receive notifications.

The system must prioritize security, reliability, data consistency, scalability, and maintainability.

The MVP must demonstrate a complete monitoring lifecycle:

**Register Monitor → Schedule Check → Execute Job → Record Result → Calculate Metrics → Detect Incident → Notify User → Resolve Incident.**

This lifecycle is the primary acceptance requirement for the first complete release.