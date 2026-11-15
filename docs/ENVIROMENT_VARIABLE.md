
# PulseWatch — Environment Variables Specification

**Document:** ENVIRONMENT_VARIABLES.md  
**Version:** 1.0  
**Status:** Implementation Specification  
**Project:** PulseWatch

---

# 1. Purpose

This document defines all environment variables required to run, develop, test, and deploy PulseWatch.

It covers:

- Application configuration.
- Frontend configuration.
- Backend API configuration.
- Supabase PostgreSQL configuration.
- Prisma configuration.
- Redis and BullMQ configuration.
- Authentication and security secrets.
- Monitoring worker configuration.
- Scheduler configuration.
- Notification worker configuration.
- Resend email configuration.
- Logging and observability.
- Testing configuration.
- Production deployment requirements.

## 1.1 Configuration Principles

1. Never hardcode environment-specific values.
2. Never commit production secrets.
3. Validate environment variables at application startup.
4. Fail fast when required configuration is missing.
5. Use separate environment configurations for development, staging, and production.
6. Never expose server-side secrets to the frontend.
7. Use explicit configuration names and types.
8. Avoid silently falling back to insecure defaults.
9. Share configuration schemas where appropriate.
10. Each application should load only the variables it actually requires.

---

# 2. Environment Files

Recommended repository structure:

```text
pulsewatch/
│
├── .env.example
├── .gitignore
│
├── apps/
│   ├── web/
│   │   └── .env.example
│   │
│   ├── api/
│   │   └── .env.example
│   │
│   ├── scheduler/
│   │   └── .env.example
│   │
│   ├── worker/
│   │   └── .env.example
│   │
│   └── notification-worker/
│       └── .env.example
│
└── packages/
    ├── database/
    └── config/
```

For local development, a root `.env` may be used as the source of local configuration if the workspace tooling and applications are explicitly configured to load it.

Do not assume every framework automatically loads the root environment file.

Use the deployment platform's secret management for staging and production rather than relying on committed environment files.

---

# 3. Environment Variable Classification

Variables fall into three categories.

| Classification | Description | Example |
|---|---|---|
| Public | Safe to expose to browser bundles | NEXT_PUBLIC_API_URL |
| Private | Server-side configuration, not necessarily secret | PORT |
| Secret | Credentials or cryptographic material | DATABASE_URL |

## 3.1 Public Variables

Public variables may be included in frontend bundles.

Examples:

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=
```

Never put these values in frontend-exposed variables:

- Database URLs.
- Redis URLs.
- JWT secrets.
- Encryption keys.
- Resend API keys.
- Internal service credentials.

## 3.2 Private Variables

Private variables are used by server-side applications.

Examples:

```env
NODE_ENV=
PORT=
LOG_LEVEL=
```

These must not be exposed to browser code unless explicitly designed to be public.

## 3.3 Secret Variables

Secret variables must be protected using deployment-platform secret management.

Examples:

```env
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
REFRESH_TOKEN_PEPPER=
ENCRYPTION_KEY=
RESEND_API_KEY=
```

---

# 4. Root Environment Configuration

The root environment file contains shared local-development configuration.

Recommended `.env.example`:

```env
# ==========================================
# APPLICATION
# ==========================================

NODE_ENV=development
APP_NAME=PulseWatch
APP_ENV=development
LOG_LEVEL=debug

# ==========================================
# FRONTEND
# ==========================================

NEXT_PUBLIC_APP_NAME=PulseWatch
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# ==========================================
# DATABASE
# ==========================================

DATABASE_URL="YOUR_Supabase_POOLED_CONNECTION_URL"
DIRECT_URL="YOUR_Supabase_DIRECT_CONNECTION_URL"

# ==========================================
# REDIS
# ==========================================

REDIS_URL=redis://localhost:6379

# ==========================================
# AUTHENTICATION
# ==========================================

JWT_ACCESS_SECRET=REPLACE_WITH_RANDOM_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_ISSUER=pulsewatch
JWT_AUDIENCE=pulsewatch-api

REFRESH_TOKEN_PEPPER=REPLACE_WITH_RANDOM_SECRET
REFRESH_TOKEN_EXPIRES_IN_DAYS=30

# ==========================================
# ENCRYPTION
# ==========================================

ENCRYPTION_KEY=REPLACE_WITH_BASE64_ENCODED_32_BYTE_KEY
ENCRYPTION_KEY_VERSION=v1

# ==========================================
# API
# ==========================================

API_PORT=4000
API_PUBLIC_URL=http://localhost:4000
WEB_ORIGIN=http://localhost:3000

# ==========================================
# EMAIL
# ==========================================

RESEND_API_KEY=
EMAIL_FROM=PulseWatch <notifications@example.com>

# ==========================================
# MONITORING
# ==========================================

MONITOR_DEFAULT_INTERVAL_SECONDS=60
MONITOR_DEFAULT_TIMEOUT_MS=10000
MONITOR_MAX_TIMEOUT_MS=30000
MONITOR_FAILURE_THRESHOLD=3
MONITOR_RECOVERY_THRESHOLD=2

# ==========================================
# SCHEDULER
# ==========================================

SCHEDULER_POLL_INTERVAL_MS=5000
SCHEDULER_BATCH_SIZE=500
SCHEDULER_LEASE_DURATION_MS=60000

# ==========================================
# WORKER
# ==========================================

MONITOR_WORKER_CONCURRENCY=10
MONITOR_MAX_RESPONSE_BYTES=1048576
MONITOR_MAX_REDIRECTS=0

# ==========================================
# NOTIFICATION WORKER
# ==========================================

NOTIFICATION_WORKER_CONCURRENCY=5

# ==========================================
# RATE LIMITING
# ==========================================

RATE_LIMIT_ENABLED=true

# ==========================================
# OBSERVABILITY
# ==========================================

ENABLE_METRICS=true
```

The example file must contain placeholders only. It must never contain working production credentials.

---

# 5. Application Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| NODE_ENV | Yes | development | Node runtime environment |
| APP_NAME | Yes | PulseWatch | Application name |
| APP_ENV | Yes | development | Deployment environment |
| LOG_LEVEL | Yes | info | Logging verbosity |

Allowed values:

```text
NODE_ENV:
development
test
production

APP_ENV:
development
staging
production

LOG_LEVEL:
debug
info
warn
error
```

Validation requirements:

- Reject unknown environment values.
- Never use debug logging by default in production.
- Do not log secret environment variables.
- Keep APP_ENV separate from NODE_ENV.

---

# 6. Frontend Environment Variables

Application:

```text
apps/web
```

## 6.1 Variables

| Variable | Required | Public | Description |
|---|---|---|---|
| NEXT_PUBLIC_APP_NAME | Yes | Yes | Application display name |
| NEXT_PUBLIC_API_URL | Yes | Yes | Public backend API URL |

Example:

```env
NEXT_PUBLIC_APP_NAME=PulseWatch
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Production example:

```env
NEXT_PUBLIC_APP_NAME=PulseWatch
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
```

## 6.2 Security Rules

- Only expose intentionally public variables.
- Never expose database credentials.
- Never expose Redis credentials.
- Never expose JWT signing secrets.
- Never expose encryption keys.
- Never expose Resend credentials.
- Never use NEXT_PUBLIC for server-only configuration.

## 6.3 Validation

At frontend startup or build time:

- Verify API URL exists.
- Verify URL format.
- Require HTTPS in production.
- Reject malformed API URLs.

Important: Next.js public environment variables are generally embedded into browser bundles at build time. Changing a deployment environment variable after building may not update the already-built frontend.

---

# 7. Database Environment Variables

Database provider:

```text
Supabase PostgreSQL
```

ORM:

```text
Prisma
```

## 7.1 Required Variables

| Variable | Required | Secret | Description |
|---|---|---|---|
| DATABASE_URL | Yes | Yes | Supabase pooled connection |
| DIRECT_URL | Yes | Yes | Supabase direct connection |

Example:

```env
DATABASE_URL="YOUR_Supabase_POOLED_CONNECTION_URL"
DIRECT_URL="YOUR_Supabase_DIRECT_CONNECTION_URL"
```

## 7.2 DATABASE_URL

Purpose:

- Normal application database operations.
- API queries.
- Worker database queries.
- Scheduler database queries.
- Transactional application operations.

Use the Supabase pooled connection URL when appropriate for the runtime's connection pattern.

## 7.3 DIRECT_URL

Purpose:

- Database migrations.
- Administrative database operations that require a direct connection.
- Operations incompatible with the selected pooled connection mode.

Do not use the direct connection indiscriminately in every application.

## 7.4 Prisma Configuration

The Prisma configuration must match the installed Prisma major version.

Before implementation:

1. Pin the Prisma version.
2. Confirm the supported datasource configuration.
3. Confirm where connection URLs are configured.
4. Confirm how Prisma CLI loads environment variables.
5. Confirm migration commands use the direct connection where required.
6. Confirm runtime applications use the intended pooled connection.

Do not mix Prisma v6 and Prisma v7 configuration conventions.

If using Prisma v7, configure the datasource URL through the supported Prisma configuration mechanism and configure the appropriate runtime adapter or driver according to the selected Prisma setup.

## 7.5 Database Security

- Never print connection URLs.
- Require TLS.
- Use separate database credentials for environments.
- Restrict production access.
- Monitor connection pool usage.
- Do not use migration credentials for normal application requests.

---

# 8. Redis Environment Variables

Queue infrastructure:

```text
Redis + BullMQ
```

## 8.1 Required Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| REDIS_URL | Yes | None | Redis connection URL |

Example:

```env
REDIS_URL=redis://localhost:6379
```

Production example:

```env
REDIS_URL=YOUR_MANAGED_REDIS_TLS_URL
```

The production URL must use the connection format provided by the Redis hosting provider.

## 8.2 Redis Requirements

- Require authentication.
- Require TLS in production where supported.
- Do not expose Redis publicly.
- Restrict access to authorized services.
- Configure connection limits.
- Monitor memory consumption.
- Configure recovery and persistence according to provider capabilities.

## 8.3 Redis Usage

Redis is used for:

- BullMQ queues.
- Background job coordination.
- Queue retries.
- Job processing state.

PostgreSQL remains the source of truth for durable application state.

---

# 9. Authentication Environment Variables

## 9.1 Required Variables

| Variable | Required | Secret | Description |
|---|---|---|---|
| JWT_ACCESS_SECRET | Yes | Yes | JWT signing secret |
| JWT_ACCESS_EXPIRES_IN | Yes | No | Access token lifetime |
| JWT_ISSUER | Yes | No | JWT issuer |
| JWT_AUDIENCE | Yes | No | JWT audience |
| REFRESH_TOKEN_PEPPER | Yes | Yes | Additional refresh-token hash secret |
| REFRESH_TOKEN_EXPIRES_IN_DAYS | Yes | No | Refresh token lifetime |

Example:

```env
JWT_ACCESS_SECRET=REPLACE_WITH_RANDOM_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_ISSUER=pulsewatch
JWT_AUDIENCE=pulsewatch-api

REFRESH_TOKEN_PEPPER=REPLACE_WITH_RANDOM_SECRET
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
```

## 9.2 JWT_ACCESS_SECRET

Requirements:

- Use cryptographically secure random material.
- Never commit it.
- Never return it through an API.
- Never log it.
- Rotate it through a controlled key-rotation process.
- Do not reuse development keys in production.

If using an asymmetric signing algorithm, replace the single secret with separately managed private and public key configuration.

## 9.3 REFRESH_TOKEN_PEPPER

Purpose:

- Add a server-side secret to refresh-token hashing.
- Protect stored token hashes against database-only compromise.

Requirements:

- Store it in a secret manager.
- Keep it separate from JWT signing material.
- Never expose it to the browser.
- Plan for controlled rotation.

Changing this value can invalidate existing refresh tokens unless the application supports versioned pepper handling.

---

# 10. Encryption Environment Variables

## 10.1 Required Variables

| Variable | Required | Secret | Description |
|---|---|---|---|
| ENCRYPTION_KEY | Yes | Yes | Encryption key |
| ENCRYPTION_KEY_VERSION | Yes | No | Active encryption key version |

Example:

```env
ENCRYPTION_KEY=REPLACE_WITH_BASE64_ENCODED_32_BYTE_KEY
ENCRYPTION_KEY_VERSION=v1
```

## 10.2 Key Requirements

Use:

```text
AES-256-GCM
```

Requirements:

- Key must decode to exactly 32 bytes.
- Generate keys using a cryptographically secure random generator.
- Use a unique nonce for every encryption operation.
- Store the authentication tag.
- Store the key version with encrypted data.
- Never reuse a nonce with the same key.
- Never log encryption material.

## 10.3 Key Rotation

Support multiple encryption key versions.

The application must be able to:

1. Identify the key version associated with stored data.
2. Decrypt using the corresponding historical key.
3. Encrypt new data using the active key.
4. Re-encrypt old data during a controlled migration.
5. Retire old keys only after all dependent data is migrated or intentionally invalidated.

For multiple instances, all instances that need to read existing encrypted records must have access to the required historical keys.

---

# 11. API Environment Variables

Application:

```text
apps/api
```

## 11.1 Required Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| API_PORT | Yes | 4000 | API listening port |
| API_PUBLIC_URL | Yes | None | Public API base origin |
| WEB_ORIGIN | Yes | None | Frontend origin |
| DATABASE_URL | Yes | None | Database connection |
| REDIS_URL | Yes | None | Redis connection |
| JWT_ACCESS_SECRET | Yes | None | JWT signing material |
| JWT_ACCESS_EXPIRES_IN | Yes | 15m | Access token lifetime |
| JWT_ISSUER | Yes | pulsewatch | JWT issuer |
| JWT_AUDIENCE | Yes | pulsewatch-api | JWT audience |

Example:

```env
API_PORT=4000
API_PUBLIC_URL=http://localhost:4000
WEB_ORIGIN=http://localhost:3000
```

## 11.2 API Configuration Rules

- Validate the listening port.
- Validate API_PUBLIC_URL.
- Validate WEB_ORIGIN.
- Use explicit allowed origins.
- Require HTTPS in production.
- Configure trusted proxy behavior.
- Never trust arbitrary forwarded IP headers.
- Configure request size limits.
- Configure rate limiting.
- Configure graceful shutdown.

## 11.3 Proxy Configuration

If the API is deployed behind a reverse proxy:

- Configure the trusted proxy explicitly.
- Do not blindly trust `X-Forwarded-For`.
- Ensure client IP extraction uses only trusted proxy headers.
- Apply rate limits using the verified client IP and authenticated identity where appropriate.

---

# 12. Monitoring Configuration

Used by:

```text
apps/api
apps/scheduler
apps/worker
```

## 12.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| MONITOR_DEFAULT_INTERVAL_SECONDS | Yes | 60 | Default monitoring interval |
| MONITOR_DEFAULT_TIMEOUT_MS | Yes | 10000 | Default request timeout |
| MONITOR_MAX_TIMEOUT_MS | Yes | 30000 | Maximum request timeout |
| MONITOR_FAILURE_THRESHOLD | Yes | 3 | Consecutive failures before incident |
| MONITOR_RECOVERY_THRESHOLD | Yes | 2 | Consecutive successes before resolution |
| MONITOR_MAX_RESPONSE_BYTES | Yes | 1048576 | Maximum response body size |
| MONITOR_MAX_REDIRECTS | Yes | 0 | Maximum redirect count |

Example:

```env
MONITOR_DEFAULT_INTERVAL_SECONDS=60
MONITOR_DEFAULT_TIMEOUT_MS=10000
MONITOR_MAX_TIMEOUT_MS=30000
MONITOR_FAILURE_THRESHOLD=3
MONITOR_RECOVERY_THRESHOLD=2

MONITOR_MAX_RESPONSE_BYTES=1048576
MONITOR_MAX_REDIRECTS=0
```

## 12.2 Validation

- Intervals must be positive integers.
- Timeouts must be positive integers.
- Default timeout must not exceed maximum timeout.
- Failure threshold must be at least 1.
- Recovery threshold must be at least 1.
- Response size must have a positive upper bound.
- Redirect count must be non-negative and bounded.

These values must also be validated when monitor configurations are created or updated.

Environment defaults do not replace request-level validation.

## 12.3 Important Security Rule

Do not expose these internal environment settings through public API responses.

Users may configure only the options explicitly supported by the product.

---

# 13. Scheduler Environment Variables

Application:

```text
apps/scheduler
```

## 13.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | Yes | None | PostgreSQL connection |
| REDIS_URL | Yes | None | Redis connection |
| SCHEDULER_POLL_INTERVAL_MS | Yes | 5000 | Scheduler polling interval |
| SCHEDULER_BATCH_SIZE | Yes | 500 | Maximum monitors per batch |
| SCHEDULER_LEASE_DURATION_MS | Yes | 60000 | Occurrence lease duration |

Example:

```env
SCHEDULER_POLL_INTERVAL_MS=5000
SCHEDULER_BATCH_SIZE=500
SCHEDULER_LEASE_DURATION_MS=60000
```

## 13.2 Scheduler Rules

- Polling interval must be positive.
- Batch size must be bounded.
- Lease duration must be positive.
- Lease duration must account for scheduling and dispatch latency.
- Scheduler must support safe restart.
- Scheduler must not rely on in-memory state for durable scheduling.
- Multiple scheduler instances must safely coordinate through PostgreSQL.

## 13.3 Reliability

The scheduler must:

- Create durable occurrence records.
- Avoid duplicate occurrence creation.
- Claim work atomically.
- Recover expired leases.
- Dispatch eligible occurrences to BullMQ.
- Handle Redis outages.
- Avoid marking work permanently dispatched before the required dispatch state is safely recorded.

---

# 14. Monitoring Worker Environment Variables

Application:

```text
apps/worker
```

## 14.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | Yes | None | PostgreSQL connection |
| REDIS_URL | Yes | None | Redis connection |
| MONITOR_WORKER_CONCURRENCY | Yes | 10 | Concurrent monitoring jobs |
| MONITOR_MAX_RESPONSE_BYTES | Yes | 1048576 | Response body limit |
| MONITOR_MAX_REDIRECTS | Yes | 0 | Redirect limit |
| MONITOR_MAX_TIMEOUT_MS | Yes | 30000 | Maximum monitoring timeout |

Example:

```env
MONITOR_WORKER_CONCURRENCY=10
MONITOR_MAX_RESPONSE_BYTES=1048576
MONITOR_MAX_REDIRECTS=0
MONITOR_MAX_TIMEOUT_MS=30000
```

## 14.2 Worker Requirements

- Concurrency must be bounded.
- Response size must be bounded.
- Redirect count must be bounded.
- HTTP timeout must be enforced.
- DNS resolution must be validated.
- Destination IPs must be validated.
- Connection pinning must be enforced.
- Internal destinations must be blocked.
- Queue payloads must be validated.
- Monitor configuration must be loaded from PostgreSQL.

## 14.3 Critical Rule

The worker must not accept an arbitrary URL from a queue job and immediately execute it.

The worker must retrieve the authoritative monitor configuration from PostgreSQL and perform security validation immediately before making the outbound connection.

---

# 15. Notification Worker Environment Variables

Application:

```text
apps/notification-worker
```

## 15.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | Yes | None | PostgreSQL connection |
| REDIS_URL | Yes | None | Redis connection |
| NOTIFICATION_WORKER_CONCURRENCY | Yes | 5 | Notification job concurrency |
| RESEND_API_KEY | Yes | None | Resend API credential |
| EMAIL_FROM | Yes | None | Verified sender identity |
| ENCRYPTION_KEY | Yes | None | Notification secret encryption key |
| ENCRYPTION_KEY_VERSION | Yes | v1 | Active encryption key version |

Example:

```env
NOTIFICATION_WORKER_CONCURRENCY=5

RESEND_API_KEY=
EMAIL_FROM=PulseWatch <notifications@example.com>

ENCRYPTION_KEY=
ENCRYPTION_KEY_VERSION=v1
```

## 15.2 Notification Rules

- Validate notification job payloads.
- Load channel configuration from PostgreSQL.
- Decrypt credentials only when required.
- Never log decrypted credentials.
- Use bounded concurrency.
- Use retry and backoff policies.
- Record delivery outcomes.
- Prevent duplicate logical deliveries.
- Handle provider rate limits.
- Avoid exposing provider errors containing secrets.

---

# 16. Email Configuration

Provider:

```text
Resend
```

## 16.1 Variables

| Variable | Required | Secret | Description |
|---|---|---|---|
| RESEND_API_KEY | Yes | Yes | Resend API key |
| EMAIL_FROM | Yes | No | Verified sender identity |

Example:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=PulseWatch <notifications@example.com>
```

## 16.2 Requirements

- Use a verified sending domain.
- Configure SPF.
- Configure DKIM.
- Configure DMARC.
- Keep API keys private.
- Use separate credentials for development and production.
- Handle provider errors safely.
- Track notification delivery outcomes.

Do not assume that an HTTP success response from the email provider means the recipient received or read the email.

---

# 17. Rate Limiting Variables

Application:

```text
apps/api
```

## 17.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| RATE_LIMIT_ENABLED | Yes | true | Enable API rate limiting |

Example:

```env
RATE_LIMIT_ENABLED=true
```

Initial limits should be defined in centralized application configuration:

| Endpoint | Limit |
|---|---|
| Login | 5/minute/IP |
| Registration | 5/hour/IP |
| Refresh | 10/minute/session |
| Monitor creation | 20/hour/user |
| General API | 100/minute/user |
| Analytics | 30/minute/user |

Rate limits must be configurable independently from application code when operational requirements justify it.

Redis-backed counters must use atomic operations or a suitable rate-limiting implementation.

Production must not silently disable rate limiting because Redis becomes unavailable. Define an explicit fail-closed or controlled fallback policy for security-sensitive endpoints.

---

# 18. Observability Variables

Used by all services.

## 18.1 Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| LOG_LEVEL | Yes | info | Logging level |
| ENABLE_METRICS | Yes | true | Enable application metrics |

Example:

```env
LOG_LEVEL=info
ENABLE_METRICS=true
```

## 18.2 Logging Rules

- Use structured JSON logs in production.
- Include service name.
- Include request or job correlation IDs.
- Include event names.
- Redact secrets.
- Avoid logging full request bodies.
- Avoid logging full authorization headers.
- Avoid logging database URLs.
- Avoid logging notification webhook URLs.

## 18.3 Metrics

Track:

- API request count.
- API latency.
- API error count.
- Scheduler polling duration.
- Scheduler delay.
- Occurrence backlog.
- BullMQ queue depth.
- Worker concurrency.
- Monitoring request duration.
- Monitoring execution failures.
- Incident transitions.
- Notification delivery failures.
- Database connection usage.

Do not expose unrestricted internal metrics publicly.

---

# 19. Testing Environment Variables

Used by automated tests.

Example:

```env
NODE_ENV=test
APP_ENV=test
LOG_LEVEL=error

DATABASE_URL=YOUR_TEST_DATABASE_URL
DIRECT_URL=YOUR_TEST_DIRECT_DATABASE_URL

REDIS_URL=redis://localhost:6379

RATE_LIMIT_ENABLED=false
```

## 19.1 Testing Rules

- Use a dedicated test database.
- Never run destructive tests against production.
- Use isolated test Redis databases or instances.
- Use fake email providers in automated tests.
- Use generated test secrets.
- Clean up test data.
- Avoid depending on public external endpoints for deterministic unit tests.

Integration and E2E tests should verify actual PostgreSQL and Redis behavior using isolated test infrastructure.

Security-sensitive tests must explicitly verify the behavior expected when security configuration is missing or invalid.

---

# 20. Environment Variables by Application

This table defines which applications consume each major configuration group.

| Configuration | Web | API | Scheduler | Worker | Notification Worker |
|---|---|---|---|---|---|
| NODE_ENV | Yes | Yes | Yes | Yes | Yes |
| APP_ENV | Yes | Yes | Yes | Yes | Yes |
| LOG_LEVEL | Yes | Yes | Yes | Yes | Yes |
| NEXT_PUBLIC_API_URL | Yes | No | No | No | No |
| DATABASE_URL | No | Yes | Yes | Yes | Yes |
| DIRECT_URL | No | Migration process | No | No | No |
| REDIS_URL | No | Yes | Yes | Yes | Yes |
| JWT_ACCESS_SECRET | No | Yes | No | No | No |
| REFRESH_TOKEN_PEPPER | No | Yes | No | No | No |
| ENCRYPTION_KEY | No | Yes if handling secrets | No | No | Yes |
| RESEND_API_KEY | No | No | No | No | Yes |
| EMAIL_FROM | No | No | No | No | Yes |
| Scheduler settings | No | No | Yes | No | No |
| Monitor settings | No | Yes | Yes | Yes | No |
| Notification concurrency | No | No | No | No | Yes |

The API should not receive notification provider credentials unless the API itself directly performs a required provider operation. Prefer keeping email delivery inside the notification worker.

The migration process is separate from the runtime applications and should be the only routine consumer of `DIRECT_URL`.

---

# 21. Environment Validation Strategy

Use centralized configuration validation.

Recommended package:

```text
packages/config/
```

Suggested structure:

```text
packages/config/
│
├── src/
│   ├── common.schema.ts
│   ├── api.schema.ts
│   ├── web.schema.ts
│   ├── scheduler.schema.ts
│   ├── worker.schema.ts
│   ├── notification.schema.ts
│   ├── env-loader.ts
│   └── index.ts
│
└── package.json
```

Use Zod for runtime validation.

## 21.1 Example Schema

```typescript
import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const commonEnvSchema = z.object({
  NODE_ENV: z.enum([
    "development",
    "test",
    "production",
  ]),

  APP_ENV: z.enum([
    "development",
    "staging",
    "production",
  ]),

  LOG_LEVEL: z.enum([
    "debug",
    "info",
    "warn",
    "error",
  ]).default("info"),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),
});

export const apiEnvSchema = commonEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535),

  API_PUBLIC_URL: z.string().url(),

  WEB_ORIGIN: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES_IN: z.string().min(1),

  JWT_ISSUER: z.string().min(1),

  JWT_AUDIENCE: z.string().min(1),

  REFRESH_TOKEN_PEPPER: z.string().min(32),

  RATE_LIMIT_ENABLED: booleanFromEnv.default(true),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
```

This is a starting point. Add validation for production-only requirements, encryption key decoding, URL protocols, and cross-variable constraints.

## 21.2 Fail Fast

If a required variable is missing or invalid:

- Application startup must fail.
- Do not silently substitute insecure values.
- Do not print secret values in validation errors.
- Log the variable name and validation reason only.

## 21.3 Cross-Variable Validation

Validate relationships such as:

- Default monitor timeout must not exceed maximum timeout.
- API port must be valid.
- Production public URLs must use HTTPS.
- Production database and Redis connections must use secure transport.
- Encryption key must decode to exactly 32 bytes.
- Scheduler lease duration must be positive.
- Worker concurrency must be within a configured safe range.
- Redirect count must be within the approved security policy.

---

# 22. Generating Secure Secrets

Use a cryptographically secure generator.

For a random hexadecimal secret:

```bash
openssl rand -hex 32
```

For a 32-byte base64 encryption key:

```bash
openssl rand -base64 32
```

The encryption key must decode to exactly 32 bytes.

Do not:

- Use weak passwords as signing keys.
- Reuse one secret for multiple purposes.
- Generate secrets using `Math.random()`.
- Commit generated values.
- Send production secrets through chat or issue trackers.

---

# 23. Git and Environment File Security

Add these patterns to `.gitignore`:

```gitignore
# Environment files
.env
.env.*
!.env.example

# Local application environments
apps/*/.env
apps/*/.env.local

# Secrets and credentials
*.pem
*.key
*.p12
*.pfx

# Logs
*.log
logs/
```

Review the ignore rules carefully to ensure legitimate example files remain committed.

Before pushing code:

- Run secret scanning.
- Review changed files.
- Check Docker build contexts.
- Verify environment files are excluded.
- Verify CI logs do not expose secret values.

If a secret is accidentally committed, removing it from the latest commit is not enough. Rotate the compromised credential.

---

# 24. Production Environment Checklist

## Application

- [ ] NODE_ENV=production.
- [ ] APP_ENV=production.
- [ ] LOG_LEVEL is not debug.
- [ ] Production URLs use HTTPS.
- [ ] Frontend points to the production API.
- [ ] CORS allows only approved origins.

## Database

- [ ] DATABASE_URL uses the intended Supabase pooled connection.
- [ ] DIRECT_URL uses the intended Supabase direct connection.
- [ ] Database connections use TLS.
- [ ] Production credentials are separate from development.
- [ ] Database permissions are restricted.
- [ ] Migration process is controlled.

## Redis

- [ ] REDIS_URL uses the managed production instance.
- [ ] Authentication is enabled.
- [ ] TLS is enabled where supported.
- [ ] Redis is not publicly exposed.
- [ ] Queue monitoring is configured.

## Authentication

- [ ] JWT signing material is strong and secret.
- [ ] Refresh-token pepper is strong and secret.
- [ ] Token expiry is configured.
- [ ] Cookie security attributes are configured.
- [ ] CSRF protections are configured.

## Encryption

- [ ] Encryption key decodes to exactly 32 bytes.
- [ ] Key version is configured.
- [ ] Historical key handling is documented.
- [ ] Encryption keys are stored in a secret manager.

## Monitoring

- [ ] Worker concurrency is bounded.
- [ ] HTTP timeouts are enforced.
- [ ] Response limits are configured.
- [ ] SSRF protection is enabled.
- [ ] Redirects are disabled or securely validated.
- [ ] Network egress restrictions are active.

## Notifications

- [ ] Resend API key is configured.
- [ ] Sender domain is verified.
- [ ] SPF, DKIM, and DMARC are configured.
- [ ] Notification credentials are encrypted.
- [ ] Notification worker concurrency is bounded.

## Observability

- [ ] Structured logging is enabled.
- [ ] Sensitive fields are redacted.
- [ ] Metrics are enabled.
- [ ] Queue depth is monitored.
- [ ] Worker failures are monitored.
- [ ] Scheduler delays are monitored.

---

# 25. Final Rules

1. Every application must validate its own required environment variables.
2. Shared configuration must not cause unrelated applications to require unnecessary secrets.
3. Frontend variables must never contain backend credentials.
4. Database and Redis credentials must remain server-side.
5. Prisma migrations must use the intended direct database connection.
6. Normal application queries should use the intended pooled database connection where appropriate.
7. Monitoring workers must use bounded execution settings.
8. Production secrets must be managed outside Git.
9. Missing security configuration must cause startup failure.
10. Environment changes must be reviewed and deployed through a controlled process.

**Final principle:** Environment variables are part of the application's security boundary. Treat credentials, cryptographic keys, and infrastructure endpoints as sensitive configuration—not ordinary application constants.
