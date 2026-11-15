
# PulseWatch — Testing Strategy

**Document:** TESTING_STRATEGY.md  
**Version:** 1.0  
**Status:** Implementation Specification  
**Project:** PulseWatch

---

# 1. Testing Objectives

The purpose of testing is to ensure PulseWatch is:

- Functionally correct.
- Secure against common application and infrastructure attacks.
- Reliable under asynchronous processing.
- Resilient to service failures.
- Consistent under concurrent execution.
- Performant under expected workload.
- Maintainable as the platform evolves.

## 1.1 Testing Principles

1. Test business logic independently of frameworks.
2. Test database behavior against real PostgreSQL.
3. Test queue behavior against real Redis.
4. Mock external providers only when testing their integration boundaries.
5. Test security controls explicitly.
6. Test failure scenarios, not only successful workflows.
7. Make asynchronous tests deterministic.
8. Avoid relying on public internet endpoints in automated tests.
9. Test concurrency and idempotency.
10. Treat critical security and reliability tests as release blockers.

---

# 2. Testing Technology Stack

| Testing Area | Technology |
|---|---|
| Unit Testing | Jest |
| API Integration Testing | Jest + Supertest |
| E2E Testing | Playwright |
| Frontend Component Testing | React Testing Library |
| Schema Validation | Zod |
| HTTP Mocking | Mock HTTP server / controlled test server |
| Database Testing | PostgreSQL |
| ORM Testing | Prisma |
| Queue Testing | Redis + BullMQ |
| Load Testing | k6 |
| Code Quality | ESLint |
| Type Checking | TypeScript |
| Dependency Scanning | npm audit or equivalent |
| Secret Scanning | GitHub secret scanning or equivalent |
| CI/CD | GitHub Actions |

Pin tool versions and keep test configuration compatible with the selected Node.js, TypeScript, Jest, and Prisma versions.

---

# 3. Testing Architecture

Use a testing pyramid.

```text
                    E2E Tests
                  /           \
                 /             \
          Integration Tests
             /             \
            /               \
              Unit Tests
```

## 3.1 Unit Tests

Test isolated business logic.

Examples:

- Password validation.
- Monitor configuration validation.
- Incident state machine.
- Uptime calculations.
- Retry policies.
- URL validation rules.
- Failure classification.

Unit tests should be fast and deterministic.

## 3.2 Integration Tests

Test interactions between application components.

Examples:

- NestJS API with PostgreSQL.
- Prisma transactions.
- Scheduler with PostgreSQL and Redis.
- BullMQ worker processing.
- Outbox event dispatching.
- Notification delivery persistence.

Use real infrastructure containers or dedicated test instances where practical.

## 3.3 End-to-End Tests

Test complete user workflows.

Examples:

- Register user.
- Create monitor.
- Execute monitoring occurrence.
- Record check result.
- Open incident.
- Deliver notification.
- Recover monitor.
- Resolve incident.

E2E tests must verify observable application behavior rather than internal implementation details.

---

# 4. Repository Test Structure

Recommended structure:

```text
pulsewatch/
│
├── apps/
│   ├── web/
│   │   └── tests/
│   │       ├── components/
│   │       ├── pages/
│   │       └── e2e/
│   │
│   ├── api/
│   │   └── test/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── fixtures/
│   │
│   ├── scheduler/
│   │   └── test/
│   │       ├── unit/
│   │       └── integration/
│   │
│   ├── worker/
│   │   └── test/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── security/
│   │
│   └── notification-worker/
│       └── test/
│           ├── unit/
│           └── integration/
│
├── packages/
│   ├── database/
│   │   └── test/
│   │
│   ├── shared/
│   │   └── test/
│   │
│   └── config/
│       └── test/
│
├── tests/
│   ├── e2e/
│   ├── security/
│   ├── load/
│   ├── fixtures/
│   └── helpers/
│
└── docker-compose.test.yml
```

Keep tests close to the application or package they validate. Use the root `tests/` directory for cross-application workflows and system-level tests.

---

# 5. Unit Testing Strategy

## 5.1 Authentication Module

Test:

- Password hashing.
- Password verification.
- Invalid password rejection.
- JWT generation.
- JWT expiration.
- JWT claim validation.
- Refresh token generation.
- Refresh token hashing.
- Refresh token rotation.
- Refresh token reuse detection.
- Session revocation.

Important cases:

- Empty passwords.
- Excessively long passwords.
- Malformed tokens.
- Expired tokens.
- Invalid signatures.
- Unsupported algorithms.
- Reused refresh tokens.
- Revoked sessions.

Expected behavior: invalid credentials and tokens must never be accepted.

## 5.2 Monitor Module

Test:

- Monitor creation validation.
- Monitor update validation.
- URL validation.
- HTTP method validation.
- Timeout boundaries.
- Interval boundaries.
- Expected status code validation.
- Monitor enable/disable transitions.
- Monitor ownership checks.
- Monitor deletion behavior.

Boundary examples:

| Input | Expected Result |
|---|---|
| Empty monitor name | Rejected |
| Invalid URL | Rejected |
| Unsupported scheme | Rejected |
| Negative timeout | Rejected |
| Timeout above maximum | Rejected |
| Unsupported HTTP method | Rejected |
| Invalid expected status | Rejected |
| Valid configuration | Accepted |

## 5.3 Scheduler Module

Test:

- Due monitor selection.
- Occurrence creation.
- Occurrence uniqueness.
- Atomic claiming.
- Lease expiration.
- Lease recovery.
- Disabled monitor exclusion.
- Batch processing.
- Scheduler restart recovery.

Important scenarios:

- Two scheduler instances process the same due monitors.
- Redis becomes unavailable after occurrence creation.
- A scheduler crashes after claiming an occurrence.
- A lease expires while a worker is processing.
- A monitor is disabled during scheduling.

Expected behavior: no occurrence should be permanently lost or processed into duplicate business results.

## 5.4 Monitoring Worker

Test:

- Successful HTTP response.
- Unexpected HTTP status.
- Connection refused.
- DNS failure.
- TLS failure.
- Request timeout.
- Response size limit.
- Invalid response.
- Redirect handling.
- Invalid job payload.
- Duplicate job processing.
- Database persistence failure.

Test failure classification separately.

| Failure | Endpoint Failure |
|---|---|
| HTTP status mismatch | Yes |
| Connection refused | Yes |
| DNS failure | Yes |
| Target timeout | Yes |
| TLS validation failure | Yes |
| Worker crash | No |
| Redis outage | No |
| Database outage | No |
| Internal application error | No |

## 5.5 Incident Module

Test all state transitions.

Initial rules:

- Three consecutive endpoint failures open an incident.
- One successful check moves OPEN to RECOVERING.
- A failure during RECOVERING returns to OPEN.
- Two consecutive successful checks resolve the incident.

Test cases:

| Current State | Event | Expected State |
|---|---|---|
| Operational | First failure | Operational |
| Operational | Second failure | Operational |
| Operational | Third failure | OPEN |
| OPEN | First success | RECOVERING |
| RECOVERING | Failure | OPEN |
| RECOVERING | First success after recovery begins | RECOVERING |
| RECOVERING | Second consecutive success | RESOLVED |
| RESOLVED | New failure sequence reaches threshold | New incident |

Also test:

- Duplicate check processing.
- Concurrent check processing.
- Incident creation conflicts.
- Transaction rollback.
- Outbox event creation.
- Incident event ordering.

## 5.6 Analytics Module

Test:

- Uptime calculations.
- Response-time averages.
- Availability aggregation.
- Hourly aggregation.
- Daily aggregation.
- Date-range filtering.
- Empty monitoring periods.
- Missing data.
- Late-arriving checks.
- Duplicate aggregation jobs.

Important rule:

Missing monitoring data must not be treated as a successful check.

Infrastructure processing failures must not be counted as endpoint failures.

---

# 6. Database Integration Testing

Database tests must run against real PostgreSQL.

SQLite is not an acceptable replacement for tests involving PostgreSQL-specific behavior such as:

- Partial unique indexes.
- Transaction isolation.
- PostgreSQL constraints.
- Raw SQL migrations.
- Concurrent updates.
- PostgreSQL-specific query behavior.

## 6.1 Required Tests

- [ ] User creation.
- [ ] Monitor creation.
- [ ] Monitor ownership relationships.
- [ ] Monitoring occurrence uniqueness.
- [ ] Unique check per occurrence.
- [ ] One active incident per monitor.
- [ ] Notification delivery uniqueness.
- [ ] Status page slug uniqueness.
- [ ] Aggregate uniqueness.
- [ ] Refresh token storage.
- [ ] Foreign key behavior.
- [ ] Transaction rollback.
- [ ] Migration execution.

## 6.2 Transaction Tests

Test these operations as atomic units:

### Monitor Creation

Expected transaction:

1. Create monitor.
2. Persist initial configuration.
3. Commit transaction.

If any required operation fails, roll back.

### Monitoring Result Persistence

Expected transaction:

1. Verify occurrence is eligible for completion.
2. Persist check result.
3. Update occurrence completion state.
4. Apply required incident state transition.
5. Persist incident event and outbox event where applicable.
6. Commit transaction.

The same occurrence must not create multiple logical check results.

### Incident Creation

Expected transaction:

1. Verify monitor state.
2. Create incident.
3. Create incident event.
4. Create outbox event.
5. Commit transaction.

If the active-incident uniqueness constraint conflicts, handle the conflict safely.

## 6.3 Concurrency Tests

Test:

- Two workers completing the same occurrence.
- Two scheduler instances claiming the same monitor.
- Two workers opening an incident simultaneously.
- Duplicate notification events.
- Concurrent monitor disable and job execution.
- Concurrent refresh token rotation.

Expected behavior:

Database constraints and atomic operations must preserve the system's invariants.

---

# 7. API Integration Testing

Use Supertest against the NestJS application.

## 7.1 Authentication Endpoints

Test:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Verify:

- Correct status codes.
- Response format.
- Input validation.
- Cookie behavior.
- Authentication guards.
- Rate limiting.
- Token expiration.
- Error handling.

## 7.2 Monitor Endpoints

Test:

```text
POST   /api/v1/monitors
GET    /api/v1/monitors
GET    /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id/enable
PATCH  /api/v1/monitors/:id/disable
DELETE /api/v1/monitors/:id
```

Verify:

- Valid monitor creation.
- Invalid monitor rejection.
- User ownership.
- Pagination.
- Filtering.
- Configuration updates.
- Enable/disable behavior.
- Deletion behavior.

## 7.3 Check and Analytics Endpoints

Test:

```text
GET /api/v1/monitors/:id/checks
GET /api/v1/monitors/:id/checks/latest
GET /api/v1/monitors/:id/uptime
GET /api/v1/monitors/:id/analytics/response-time
GET /api/v1/monitors/:id/analytics/availability
```

Verify:

- Date filters.
- Pagination.
- Empty history.
- Correct ownership.
- Correct aggregation.
- Invalid query parameters.
- Maximum allowed page sizes.

## 7.4 Incident Endpoints

Test:

```text
GET  /api/v1/incidents
GET  /api/v1/incidents/:id
POST /api/v1/incidents/:id/resolve
```

Verify:

- Private incident access.
- Incident filtering.
- State validation.
- Conflict handling.
- Correct incident history.

## 7.5 Notification Endpoints

Test:

```text
POST   /api/v1/notification-channels
GET    /api/v1/notification-channels
PATCH  /api/v1/notification-channels/:id
DELETE /api/v1/notification-channels/:id
GET    /api/v1/notification-deliveries
```

Verify:

- Channel ownership.
- Secret encryption.
- Secret masking.
- Invalid configuration rejection.
- Duplicate delivery prevention.
- Delivery history ownership.

## 7.6 Dashboard Endpoints

Test:

```text
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/activity
```

Verify:

- Correct aggregation.
- Empty user state.
- Ownership isolation.
- Pagination or bounded activity results.
- Response performance.

---

# 8. End-to-End Testing

Use Playwright for complete user workflows.

## 8.1 Authentication Workflow

```text
1. Open registration page.
2. Register a new account.
3. Log in.
4. Open dashboard.
5. Refresh the browser.
6. Verify session handling.
7. Log out.
8. Verify protected pages are inaccessible.
```

Acceptance criteria:

- Registration succeeds.
- Login succeeds.
- Session handling works.
- Logout revokes the session.
- Protected routes reject unauthenticated access.

## 8.2 Monitoring Workflow

```text
1. Log in.
2. Create a monitor.
3. Verify monitor appears in dashboard.
4. Wait for scheduler execution.
5. Verify monitoring result.
6. Open monitor details.
7. Verify response time and history.
8. Update monitor configuration.
9. Disable monitor.
10. Verify future scheduling stops.
```

Acceptance criteria:

- Monitor configuration persists.
- Scheduler detects due work.
- Worker executes the check.
- Result is persisted.
- Dashboard reflects the latest result.

## 8.3 Incident Workflow

Use a controlled local HTTP test server.

```text
1. Create a monitor targeting the test server.
2. Configure the test server to return an unexpected status.
3. Allow the failure threshold to be reached.
4. Verify an incident opens.
5. Verify incident event history.
6. Restore the test server.
7. Allow recovery threshold to be reached.
8. Verify incident resolves.
```

Acceptance criteria:

- Incident opens at the configured threshold.
- Recovery state behaves correctly.
- Incident resolves after the configured number of successes.
- No duplicate incident is created.

## 8.4 Notification Workflow

```text
1. Create an email notification channel.
2. Configure the test email provider.
3. Trigger an incident.
4. Verify notification event creation.
5. Verify notification job processing.
6. Verify delivery record.
7. Verify failed delivery retry behavior.
```

Use a fake email provider or controlled test adapter. Do not send real production emails during automated tests.

---

# 9. Security Testing

Security testing is a release-blocking activity.

## 9.1 Authentication Security

- [ ] Invalid passwords are rejected.
- [ ] Expired JWTs are rejected.
- [ ] Invalid JWT signatures are rejected.
- [ ] Unsupported JWT algorithms are rejected.
- [ ] Refresh token rotation works.
- [ ] Refresh token reuse is detected.
- [ ] Revoked sessions cannot refresh.
- [ ] Password hashes are never returned.
- [ ] Authentication secrets are not logged.

## 9.2 Authorization Security

Test IDOR/BOLA scenarios.

Example:

```text
User A creates Monitor A.
User B creates Monitor B.

User A attempts to access Monitor B.
User A attempts to update Monitor B.
User A attempts to delete Monitor B.
User A attempts to access Monitor B checks.
```

Expected result:

All unauthorized operations are rejected without exposing private resource information.

Repeat for:

- Incidents.
- Notification channels.
- Notification deliveries.
- Status pages.
- Nested resources.

## 9.3 SSRF Security

Test prohibited targets:

```text
http://127.0.0.1
http://localhost
http://10.0.0.1
http://172.16.0.1
http://192.168.1.1
http://169.254.169.254
http://[::1]
http://[::]
http://[fe80::1]
http://[fc00::1]
```

Also test:

- DNS rebinding.
- Mixed public/private DNS responses.
- IPv4-mapped IPv6.
- Alternate IP representations.
- Redirects to private destinations.
- Redirect loops.
- Unsupported URL schemes.
- Unsupported ports.
- Encoded hostnames.
- DNS failures.
- Malicious response sizes.

Expected result:

Prohibited destinations are rejected before a connection reaches the protected resource.

Use controlled DNS fixtures and isolated network test environments. Do not test SSRF by sending requests to real internal production services.

## 9.4 API Security

- [ ] Oversized request rejection.
- [ ] Invalid DTO rejection.
- [ ] Unknown field rejection.
- [ ] Rate-limit enforcement.
- [ ] CORS restrictions.
- [ ] Security header verification.
- [ ] Error response sanitization.
- [ ] SQL injection regression tests.

## 9.5 Queue Security

- [ ] Invalid job payload rejection.
- [ ] Unauthorized monitor reference rejection.
- [ ] Duplicate job handling.
- [ ] Bounded retries.
- [ ] Poison job handling.
- [ ] Queue secret exposure tests.
- [ ] Worker concurrency enforcement.

## 9.6 Secret Security

- [ ] Notification secrets are encrypted.
- [ ] Secrets are masked in API responses.
- [ ] Secrets are absent from logs.
- [ ] Secrets are absent from queue payloads.
- [ ] Invalid encryption keys fail startup.
- [ ] Invalid ciphertext fails securely.
- [ ] Key version handling works.

---

# 10. Scheduler and Worker Reliability Testing

This area deserves dedicated testing because asynchronous execution is the core of PulseWatch.

## 10.1 Scheduler Failure Scenarios

Test:

| Scenario | Expected Behavior |
|---|---|
| Scheduler crashes before claiming work | Work remains eligible |
| Scheduler crashes after claiming work | Lease recovery makes work eligible |
| Redis is unavailable | Durable occurrence is not lost |
| Duplicate scheduler execution | No duplicate occurrence |
| Monitor is disabled | Future work is not scheduled |
| Database temporarily unavailable | Scheduler retries safely |

## 10.2 Monitoring Worker Failure Scenarios

| Scenario | Expected Behavior |
|---|---|
| Worker crashes during request | Occurrence is recoverable |
| Worker crashes after receiving response | Duplicate execution does not create duplicate result |
| Database unavailable | No false endpoint failure |
| Redis unavailable | Job recovery follows queue policy |
| Target timeout | Endpoint failure recorded |
| Worker timeout | Infrastructure failure, not endpoint failure |
| Duplicate job | Idempotent processing |
| Invalid target URL | Request rejected |

## 10.3 Lease and Completion Semantics

Test the occurrence lifecycle:

```text
PENDING
   |
   v
CLAIMED
   |
   v
QUEUED
   |
   v
PROCESSING
   |
   v
COMPLETED
```

The exact states should match the database and architecture documents.

Also test:

- Expired lease recovery.
- Stale worker completion.
- Duplicate completion.
- Worker ownership checks.
- Atomic occurrence transitions.
- Queue dispatch failure.

A stale worker must not overwrite the result of a newer valid execution.

Use lease tokens or equivalent ownership checks to prevent stale workers from completing reclaimed work.

---

# 11. Notification Reliability Testing

## 11.1 Outbox Tests

Test:

- Incident and outbox event commit together.
- Transaction rollback removes both changes.
- Dispatcher retries unpublished events.
- Published events are not unnecessarily republished.
- Dispatcher crash after queue publishing is handled.
- Duplicate event delivery is harmless.

## 11.2 Delivery Tests

Test:

- Successful email submission.
- Provider timeout.
- Provider rate limiting.
- Invalid provider credentials.
- Temporary provider failure.
- Permanent provider rejection.
- Duplicate notification event.
- Retry exhaustion.

## 11.3 Idempotency

The logical delivery identity should be unique for:

```text
incidentId + channelId + eventKey
```

Duplicate processing must not create duplicate logical delivery records.

Provider-side delivery duplication may still be possible if a provider accepts a request but the worker crashes before recording the response. Where the provider supports idempotency keys, use them.

Do not claim exactly-once external email delivery.

---

# 12. Frontend Testing

Use React Testing Library for component behavior and Playwright for browser workflows.

## 12.1 Component Tests

Test:

- Login form.
- Registration form.
- Monitor creation form.
- Monitor edit form.
- Monitor status indicator.
- Incident status indicator.
- Dashboard statistics.
- Analytics charts.
- Notification channel forms.
- Confirmation dialogs.
- Loading states.
- Error states.
- Empty states.

## 12.2 Frontend Security Tests

- [ ] Untrusted content is rendered safely.
- [ ] No untrusted HTML is inserted unsafely.
- [ ] Server secrets are absent from browser bundles.
- [ ] Authentication state is cleared after logout.
- [ ] Protected pages handle expired sessions.
- [ ] Refresh requests do not create infinite retry loops.
- [ ] API errors do not expose sensitive internal details.

## 12.3 Accessibility

Verify:

- Keyboard navigation.
- Accessible labels.
- Form error announcements.
- Color contrast.
- Focus management.
- Dialog accessibility.
- Chart descriptions or accessible alternatives.

---

# 13. Performance and Load Testing

Use k6.

Performance testing must evaluate individual services and the complete system.

## 13.1 API Load Testing

Test:

- Authentication endpoints.
- Monitor CRUD endpoints.
- Monitor listing.
- Check history.
- Analytics endpoints.
- Dashboard endpoints.

Measure:

- Requests per second.
- p50 latency.
- p95 latency.
- p99 latency.
- Error rate.
- Database connection usage.

Initial targets:

| Metric | Initial Target |
|---|---|
| General API p95 | Below 500 ms |
| API error rate under expected load | Below 1% |
| Dashboard response p95 | Below 500 ms |
| Scheduler delay | Within 10 seconds under baseline workload |

These are initial engineering targets. They must be validated against actual deployment resources and workload.

## 13.2 Scheduler Load Testing

Test:

- Large monitor counts.
- Multiple scheduler instances.
- Large due-monitor batches.
- Redis interruptions.
- Database contention.
- Backlog recovery.

Measure:

- Due occurrence discovery rate.
- Occurrence creation throughput.
- Scheduling delay.
- Database query latency.
- Queue dispatch latency.

## 13.3 Worker Load Testing

Test:

- High job volume.
- Slow endpoints.
- Fast endpoints.
- Connection failures.
- Large response headers.
- Large response bodies.
- DNS failures.
- Worker restarts.
- Queue backlogs.

Measure:

- Jobs processed per second.
- Worker utilization.
- Memory usage.
- CPU usage.
- Active network connections.
- Queue waiting time.
- Check completion latency.

## 13.4 Database Load Testing

Test:

- Concurrent monitor reads.
- Concurrent occurrence creation.
- Concurrent result persistence.
- Incident state transitions.
- Analytics queries.
- Aggregate processing.

Monitor:

- Connection count.
- Query duration.
- Lock contention.
- Transaction duration.
- Slow queries.
- Database resource consumption.

## 13.5 Load Testing Safety

Never use public or third-party production endpoints as load-test targets without explicit authorization.

Use controlled local or dedicated test services.

---

# 14. Test Data and Fixtures

Use deterministic fixtures.

Suggested fixtures:

```text
tests/fixtures/
│
├── users.ts
├── monitors.ts
├── occurrences.ts
├── checks.ts
├── incidents.ts
├── notification-channels.ts
└── jobs.ts
```

Requirements:

- Use generated test identities.
- Use isolated test data.
- Avoid production data.
- Avoid real credentials.
- Clean up data after tests.
- Avoid time-dependent assertions where possible.
- Use fake clocks for time-sensitive business logic.

## 14.1 Time Testing

Monitoring and incident processing depend heavily on time.

Use an injectable clock abstraction for:

- Scheduler due-time calculations.
- Lease expiration.
- Token expiration.
- Incident timestamps.
- Aggregation windows.
- Data retention.

Avoid hardcoding `Date.now()` throughout business logic.

Example:

```typescript
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
```

Tests can provide a deterministic fake clock.

---

# 15. Test Environment Strategy

Maintain separate environments:

```text
development
test
staging
production
```

## 15.1 Development

Purpose:

- Local feature development.
- Manual debugging.
- Local integration testing.

Infrastructure:

- Local Redis.
- Dedicated development PostgreSQL or Supabase development database.
- Local test HTTP server.
- Fake email adapter.

## 15.2 Test

Purpose:

- Automated unit tests.
- Integration tests.
- E2E tests.
- Security regression tests.

Requirements:

- Isolated PostgreSQL.
- Isolated Redis.
- Deterministic fixtures.
- Fake email provider.
- Controlled DNS and HTTP fixtures.

## 15.3 Staging

Purpose:

- Production-like deployment validation.
- Migration testing.
- Service integration testing.
- Release candidate testing.

Requirements:

- Separate credentials.
- Separate database.
- Separate Redis.
- Production-like network restrictions.
- Test email provider or restricted sending domain.
- Representative infrastructure configuration.

## 15.4 Production

Production must never be used for:

- Destructive automated tests.
- Database cleanup tests.
- Load tests without explicit approval.
- SSRF experiments.
- Test notification floods.

---

# 16. CI/CD Testing Pipeline

Every pull request must run the appropriate automated checks.

Recommended pipeline:

```text
Pull Request
     |
     v
Install Dependencies
     |
     v
Secret Scanning
     |
     v
Dependency Scanning
     |
     v
Type Checking
     |
     v
Linting
     |
     v
Unit Tests
     |
     v
Integration Tests
     |
     v
Security Tests
     |
     v
Production Build
     |
     v
Merge Approval
```

## 16.1 Required CI Checks

- [ ] Dependency installation.
- [ ] Secret scanning.
- [ ] Dependency vulnerability scanning.
- [ ] TypeScript type checking.
- [ ] ESLint.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Critical security tests.
- [ ] Application builds.

## 16.2 Main Branch Protection

Require:

- Successful CI pipeline.
- Code review.
- No unresolved critical security findings.
- Approved database migrations.
- Passing critical test suites.

## 16.3 Deployment Pipeline

Recommended release pipeline:

```text
Merge to Main
     |
     v
Build Artifacts
     |
     v
Run Automated Tests
     |
     v
Deploy to Staging
     |
     v
Run Smoke Tests
     |
     v
Approve Production Release
     |
     v
Run Database Migrations
     |
     v
Deploy Services
     |
     v
Production Health Checks
```

Use expand-and-contract database migrations when rolling deployments may run old and new application versions simultaneously.

---

# 17. Test Coverage Requirements

Coverage is a signal, not proof of correctness.

Initial targets:

| Area | Target |
|---|---|
| Authentication business logic | 90% |
| Incident state machine | 95% |
| Scheduler business logic | 90% |
| Monitoring failure classification | 95% |
| SSRF validation logic | 95% |
| Uptime calculations | 95% |
| General backend business logic | 80% |
| Frontend business components | 70% |

Coverage must focus on meaningful branches and failure paths.

Do not increase coverage by writing tests that only execute code without verifying behavior.

Critical security and reliability requirements must have explicit tests regardless of overall coverage percentage.

---

# 18. Test Execution Commands

Exact scripts should be finalized in each workspace package.

Suggested root-level commands:

```bash
# Install dependencies
pnpm install

# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run security tests
pnpm test:security

# Generate coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

Only add scripts that are actually implemented in the workspace.

Do not create placeholder commands that silently succeed without running tests.

---

# 19. Definition of Done

A feature is considered test-complete only when:

- [ ] Unit tests cover core business logic.
- [ ] Relevant integration tests pass.
- [ ] Input validation is tested.
- [ ] Authorization is tested.
- [ ] Error paths are tested.
- [ ] Concurrency risks are considered.
- [ ] Idempotency is verified where applicable.
- [ ] Logging does not expose sensitive information.
- [ ] API contracts are verified.
- [ ] Documentation is updated.

For scheduler and monitoring worker features, completion additionally requires:

- [ ] Duplicate job tests.
- [ ] Worker crash recovery tests.
- [ ] Lease expiration tests.
- [ ] Database failure tests.
- [ ] Redis failure tests.
- [ ] Endpoint failure classification tests.

For incident processing:

- [ ] Every state transition is tested.
- [ ] Duplicate processing is tested.
- [ ] Concurrent transitions are tested.
- [ ] Outbox transaction behavior is tested.

For monitoring execution:

- [ ] SSRF tests pass.
- [ ] DNS rebinding protections are tested.
- [ ] Redirect policy is tested.
- [ ] Request timeouts are tested.
- [ ] Response limits are tested.
- [ ] Network egress controls are verified.

---

# 20. MVP Release Quality Gates

The MVP must not be released until all critical gates pass.

## Functional

- [ ] Registration and login work.
- [ ] Monitor CRUD works.
- [ ] Scheduler creates monitoring occurrences.
- [ ] Workers execute checks.
- [ ] Results are persisted.
- [ ] Incidents open correctly.
- [ ] Incidents recover correctly.
- [ ] Notifications are processed.
- [ ] Analytics are correct.
- [ ] Dashboard displays accurate information.

## Reliability

- [ ] Duplicate jobs are safe.
- [ ] Duplicate results are prevented.
- [ ] Scheduler recovery works.
- [ ] Worker recovery works.
- [ ] Queue failures are handled.
- [ ] Outbox delivery is retryable.
- [ ] Database transactions preserve invariants.

## Security

- [ ] Authentication tests pass.
- [ ] Authorization tests pass.
- [ ] SSRF tests pass.
- [ ] Secret handling tests pass.
- [ ] Rate limiting is enabled.
- [ ] Production network restrictions are verified.
- [ ] No critical unresolved security vulnerabilities remain.

## Performance

- [ ] API baseline targets are evaluated.
- [ ] Scheduler throughput is evaluated.
- [ ] Worker concurrency is bounded.
- [ ] Database connection limits are evaluated.
- [ ] Queue backlog recovery is tested.

## Deployment

- [ ] Staging deployment succeeds.
- [ ] Production migrations are reviewed.
- [ ] Smoke tests pass.
- [ ] Health checks work.
- [ ] Logs and metrics are available.
- [ ] Rollback and recovery procedures are documented.

---

# 21. Final Testing Principle

PulseWatch is a distributed monitoring system.

Its most important correctness properties are not limited to whether an API endpoint returns HTTP 200.

The system must prove that:

1. Scheduled work is not permanently lost.
2. Duplicate jobs do not create duplicate business results.
3. Infrastructure failures do not generate false outages.
4. Incident state transitions remain consistent under concurrency.
5. Notifications survive temporary queue and provider failures.
6. Monitoring workers cannot access prohibited internal destinations.
7. Uptime and response-time analytics reflect actual completed observations.

**Release principle:** Reliability, security, and data correctness take precedence over test quantity and feature count.
