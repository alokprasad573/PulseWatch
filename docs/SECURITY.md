
# PulseWatch — Security Specification

**Document:** SECURITY.md  
**Version:** 1.0  
**Status:** Implementation Specification  
**Project:** PulseWatch  
**Security Classification:** Internal Engineering Document

---

# 1. Security Objectives

PulseWatch handles user accounts, monitoring configurations, operational data, notification credentials, and outbound HTTP requests.

The security architecture must protect:

1. User identities and authentication credentials.
2. Monitor configurations and monitoring history.
3. Incident information.
4. Notification channel credentials.
5. PostgreSQL and Redis infrastructure.
6. Internal services and cloud infrastructure.
7. Monitoring workers from malicious targets and responses.
8. Application availability against abuse and resource exhaustion.

## 1.1 Security Principles

- Defense in depth.
- Least privilege.
- Secure by default.
- Zero trust between application boundaries.
- Explicit authorization for every private resource.
- Strict validation of external inputs.
- No implicit trust in user-provided URLs.
- No secrets in source control or application logs.
- Fail securely when validation or security checks fail.
- Prefer database-enforced constraints for critical invariants.
- Keep security controls close to the resource they protect.

---

# 2. Threat Model

## 2.1 Assets

| Asset | Security Requirement |
|---|---|
| User accounts | Confidentiality and integrity |
| Password hashes | Confidentiality |
| Access tokens | Confidentiality and integrity |
| Refresh tokens | Confidentiality and integrity |
| Monitor configurations | Confidentiality and integrity |
| Monitoring results | Integrity and availability |
| Incident records | Integrity |
| Email credentials | Confidentiality |
| Slack webhook URLs | Confidentiality |
| PostgreSQL | Confidentiality, integrity, availability |
| Redis | Integrity and availability |
| Monitoring workers | Isolation and availability |
| Internal network | Confidentiality and availability |

## 2.2 Threat Actors

Consider these potential attackers:

- Unauthenticated internet attackers.
- Malicious authenticated users.
- Users attempting to access other users' resources.
- Attackers exploiting arbitrary URL monitoring.
- Attackers targeting worker resource limits.
- Attackers exploiting stolen credentials.
- Attackers exploiting vulnerable dependencies.
- Attackers attempting to manipulate queue jobs.
- Attackers attempting to extract notification secrets.

## 2.3 Primary Threats

| Threat | Risk | Required Protection |
|---|---|---|
| SSRF | Critical | URL and destination IP validation |
| DNS rebinding | Critical | Connection-time IP enforcement |
| Authentication bypass | Critical | Secure authentication and authorization |
| IDOR/BOLA | Critical | Resource ownership checks |
| Refresh token theft | High | Rotation and revocation |
| Password attacks | High | Argon2id and rate limiting |
| Secret exposure | Critical | Encryption and redaction |
| Queue job manipulation | High | Trusted producers and payload validation |
| Database injection | High | Parameterized queries |
| Resource exhaustion | High | Rate limits and bounded concurrency |
| Malicious redirects | Critical | Redirect validation |
| Dependency compromise | High | Dependency auditing and updates |
| Log injection | Medium | Structured logging and sanitization |

---

# 3. Authentication Security

## 3.1 Password Storage

Use Argon2id for password hashing.

Requirements:

- Never store plaintext passwords.
- Never log passwords.
- Never return password hashes in API responses.
- Use a unique salt per password.
- Use parameters appropriate for the production environment.
- Re-evaluate parameters as infrastructure changes.
- Validate password input length before hashing.

Suggested initial configuration:

```typescript
interface PasswordHashConfig {
  type: "argon2id";
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}
```

Do not hardcode weak or arbitrary parameters. Benchmark the selected configuration on production-class infrastructure.

## 3.2 Access Tokens

Use short-lived JWT access tokens.

Initial target:

- Access token lifetime: 15 minutes.
- Algorithm: Explicitly configured secure signing algorithm.
- Signing key: Stored in a secret manager.
- Token validation: Signature, issuer, audience, expiration, and required claims.

Example claims:

```typescript
interface AccessTokenPayload {
  sub: string;
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
```

Requirements:

- Reject expired tokens.
- Reject malformed tokens.
- Reject unsupported algorithms.
- Validate issuer and audience.
- Do not trust user identity from request payloads.
- Never store access tokens in browser localStorage.

## 3.3 Refresh Tokens

Refresh tokens must be:

- Cryptographically random.
- High entropy.
- Stored only as hashes in PostgreSQL.
- Delivered using Secure, HttpOnly cookies.
- Rotated after successful refresh.
- Revocable.
- Expiring.

Recommended cookie configuration:

```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/api/v1/auth",
}
```

Cookie domain and SameSite settings must match the production frontend/API topology.

### Refresh Token Rotation

1. Client sends refresh cookie.
2. API hashes the supplied token.
3. API finds the matching active token record.
4. API validates expiration and revocation state.
5. API creates a replacement token.
6. API stores the replacement token hash.
7. API revokes the previous token.
8. API sends the replacement token through the cookie.

All rotation steps must happen transactionally.

### Reuse Detection

If a previously rotated token is presented again:

- Treat it as potential token theft.
- Revoke the affected token family or session according to the session model.
- Record a security event.
- Require reauthentication.

Do not silently accept reused refresh tokens.

## 3.4 Logout

Logout must:

- Revoke the active refresh token.
- Clear the refresh cookie.
- Prevent further refresh operations using that token.

Support session revocation when the account password changes or suspicious activity is detected.

## 3.5 CSRF Protection

Cookie-based refresh authentication introduces CSRF considerations.

Implement:

- SameSite cookie policy.
- Origin validation for state-changing browser requests.
- CSRF tokens where the deployment topology requires them.
- Strict CORS configuration.
- No wildcard origins with credentialed requests.

Do not assume SameSite alone protects every deployment configuration.

---

# 4. Authorization and Resource Ownership

Every private resource must belong to an authenticated user or an explicitly authorized organization.

## 4.1 Ownership Enforcement

The API must never trust a client-supplied owner ID.

Bad:

```typescript
await prisma.monitor.findUnique({
  where: { id: monitorId },
});
```

Better:

```typescript
await prisma.monitor.findFirst({
  where: {
    id: monitorId,
    userId: authenticatedUserId,
  },
});
```

The authenticated user ID must come from a validated authentication context.

## 4.2 Protected Resources

Ownership checks are mandatory for:

- Monitors.
- Monitor checks.
- Incidents.
- Notification channels.
- Notification deliveries.
- Status pages.
- User settings.
- Session management.

For nested resources, validate ownership through the complete parent-child relationship.

For example, a user must not retrieve a monitor check merely by knowing its check ID.

## 4.3 Authorization Rules

- Users can only manage their own monitors.
- Users can only access their own private incidents.
- Users cannot access another user's notification channels.
- Users cannot associate another user's monitors with their status pages.
- Public status pages expose only explicitly published information.
- Internal operational fields must not be exposed publicly.

## 4.4 Database-Level Protection

Where practical:

- Use foreign keys.
- Use unique constraints.
- Use composite constraints for ownership-sensitive relationships.
- Use transactions for multi-resource operations.

Service-layer authorization is mandatory even when database constraints exist.

---

# 5. SSRF Protection

**Security priority: Critical**

PulseWatch accepts user-controlled URLs and performs outbound HTTP requests.

This creates an SSRF attack surface.

A malicious user could attempt to access:

- Cloud metadata endpoints.
- Internal databases.
- Redis.
- Internal APIs.
- Private network services.
- Localhost services.
- Internal administrative interfaces.

URL parsing alone is not sufficient.

## 5.1 Allowed URL Schemes

Allow only:

```text
http://
https://
```

Reject:

```text
file://
ftp://
gopher://
data://
javascript:
dict://
```

Also reject malformed URLs and unsupported URL encodings.

## 5.2 Port Restrictions

For MVP, allow only:

- HTTP: port 80.
- HTTPS: port 443.

Any future support for custom ports must be introduced through an explicit security review and configurable allowlist.

## 5.3 IP Address Restrictions

Reject destinations resolving to:

- IPv4 loopback addresses.
- IPv4 private ranges.
- IPv4 link-local ranges.
- IPv4 unspecified addresses.
- IPv4 multicast and reserved ranges.
- IPv6 loopback addresses.
- IPv6 unique-local addresses.
- IPv6 link-local addresses.
- IPv6 unspecified addresses.
- IPv6 multicast addresses.
- IPv4-mapped IPv6 addresses containing prohibited IPv4 destinations.

Use a maintained IP-address classification library rather than implementing CIDR parsing manually.

Also reject non-public destinations and special-purpose ranges according to the current IANA IPv4 and IPv6 special-purpose registries.

## 5.4 DNS Resolution Validation

The monitoring worker must:

1. Parse the hostname.
2. Resolve all relevant A and AAAA records.
3. Validate every resolved IP.
4. Reject the destination if any candidate address violates the network policy.
5. Connect only to a validated address.
6. Preserve the original hostname for TLS SNI and HTTP Host handling.
7. Avoid an independent second DNS resolution during connection establishment.

This prevents the application from validating one IP address and connecting to a different one.

### DNS Rebinding Protection

A vulnerable sequence:

```text
Validation:
example.com -> Public IP

Actual request:
example.com -> 127.0.0.1
```

Mitigation:

- Validate DNS results.
- Pin the validated destination IP for the request.
- Ensure the HTTP client uses that validated address.
- Preserve TLS hostname verification.
- Do not disable certificate verification.
- Avoid connection reuse across incompatible security contexts.

If a DNS result changes, repeat validation before creating a new connection.

## 5.5 Redirect Protection

The safest MVP policy is to disable automatic redirects.

If redirects are supported later:

1. Receive the redirect response.
2. Resolve the redirect destination.
3. Validate the scheme.
4. Validate the port.
5. Resolve and validate destination IPs.
6. Apply the same connection-pinning policy.
7. Enforce a strict redirect limit.
8. Prevent credentials or sensitive headers from being forwarded across origins.

Every redirect is a new security decision.

## 5.6 HTTP Client Restrictions

The monitoring HTTP client must:

- Disable proxy environment-variable inheritance unless explicitly configured.
- Never forward application cookies.
- Never forward internal authorization headers.
- Never attach ambient credentials.
- Disable automatic redirects by default.
- Enforce connection timeout.
- Enforce total request timeout.
- Limit response body size.
- Limit decompressed response size.
- Limit response header size.
- Avoid unbounded buffering.
- Restrict supported HTTP methods.
- Avoid arbitrary user-controlled request headers in MVP.

## 5.7 Network-Level SSRF Protection

Application-level validation is not sufficient by itself.

The monitoring worker must run in a restricted network environment.

Recommended controls:

- Separate worker network from API/database network where possible.
- Block access to private and internal network ranges.
- Block cloud metadata endpoints.
- Restrict access to internal service ports.
- Restrict outbound traffic through firewall or egress proxy rules.
- Prevent worker access to management interfaces.
- Prevent direct access to Redis and PostgreSQL unless required by the worker's role.

Because workers require database and queue access, define narrowly scoped infrastructure exceptions rather than allowing unrestricted internal network access.

## 5.8 SSRF Acceptance Tests

The following cases must be tested:

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
- Redirects to private IP addresses.
- Redirect loops.
- Alternate numeric IP representations.
- Encoded hostnames.
- Invalid ports.
- Invalid URL schemes.
- DNS resolution failures.
- DNS changes between validation and connection.

Expected result: prohibited destinations are rejected before the outbound request reaches the protected destination.

---

# 6. API Security

## 6.1 Input Validation

Every API endpoint must validate incoming data.

Use:

- NestJS DTOs.
- class-validator.
- class-transformer.
- Strict validation settings.
- Explicit field allowlists.

Recommended global validation configuration:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
  }),
);
```

Never pass unvalidated client objects directly into Prisma create or update operations.

## 6.2 Request Size Limits

Set request size limits.

Initial policy:

- JSON request body: maximum 1 MB.
- Smaller limits for authentication endpoints where practical.
- No arbitrary file uploads in MVP.
- Reject oversized requests with HTTP 413.

These limits should be configurable and enforced at both application and reverse-proxy layers.

## 6.3 Rate Limiting

Use Redis-backed rate limiting in production.

Suggested initial limits:

| Endpoint | Initial Limit |
|---|---|
| Login | 5 requests/minute/IP |
| Registration | 5 requests/hour/IP |
| Refresh | 10 requests/minute/session |
| Monitor creation | 20 requests/hour/user |
| General API | 100 requests/minute/user |
| Analytics | 30 requests/minute/user |

These are initial operational values, not universal security guarantees.

Requirements:

- Return HTTP 429 when limits are exceeded.
- Include Retry-After where appropriate.
- Use account and IP-based limits where suitable.
- Avoid trusting arbitrary forwarded IP headers.
- Configure trusted proxy behavior explicitly.
- Consider account enumeration risks in authentication responses.

## 6.4 CORS

Allow only explicitly configured frontend origins.

Production example:

```typescript
app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: [
    "GET",
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
  ],
});
```

Never use:

```typescript
origin: "*",
credentials: true,
```

## 6.5 Security Headers

Configure appropriate HTTP security headers:

- Strict-Transport-Security.
- X-Content-Type-Options.
- Referrer-Policy.
- Content-Security-Policy.
- Frame restrictions through CSP.
- Permissions-Policy.

Configure Content Security Policy based on actual frontend dependencies and deployment requirements.

## 6.6 Error Handling

Do not expose:

- Stack traces.
- SQL errors.
- Database connection strings.
- Internal service hostnames.
- File paths.
- Authentication secrets.
- Internal exception details.

Return stable, documented error codes.

---

# 7. Database Security

## 7.1 Supabase PostgreSQL

PulseWatch uses Supabase as its managed PostgreSQL provider.

Security requirements:

- Require TLS connections.
- Keep connection strings in environment secrets.
- Never commit credentials.
- Use pooled connections for normal application traffic where appropriate.
- Use direct connections for migration operations that require them.
- Restrict database access to trusted application services.
- Monitor database connection usage.
- Review backup and recovery settings.

Environment variables:

```env
DATABASE_URL="Supabase_POOLED_CONNECTION_URL"
DIRECT_URL="Supabase_DIRECT_CONNECTION_URL"
```

These values must never be printed in application logs.

## 7.2 Database Permissions

Use separate credentials where practical for:

- Application runtime.
- Migration operations.
- Administrative operations.

The runtime account should not have unnecessary schema-management privileges.

Never use unrestricted administrative database credentials in normal application containers.

## 7.3 SQL Injection

Use Prisma's parameterized query APIs.

Avoid unsafe raw SQL with interpolated user input.

Bad:

```typescript
await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${email}'`,
);
```

Use parameterized queries:

```typescript
await prisma.$queryRaw`
  SELECT id
  FROM users
  WHERE email = ${email}
`;
```

If dynamic identifiers or SQL fragments are required, validate them against strict allowlists.

## 7.4 Database Migrations

- Review migrations before deployment.
- Avoid destructive changes without a recovery plan.
- Prefer expand-and-contract migrations.
- Test migrations against representative data.
- Never run migrations automatically from every application replica.
- Use a controlled migration process.
- Verify backup and restore procedures.

## 7.5 Sensitive Data

Never store plaintext:

- Passwords.
- Refresh tokens.
- Notification credentials.
- API secrets.

Encrypt sensitive notification configuration using authenticated encryption.

---

# 8. Secrets Management

## 8.1 Secrets

Examples:

```text
DATABASE_URL
DIRECT_URL
REDIS_URL
JWT_ACCESS_SECRET
REFRESH_TOKEN_PEPPER
ENCRYPTION_KEY
RESEND_API_KEY
SLACK_WEBHOOK_SECRET
```

Use a production secret manager or the hosting provider's encrypted environment-variable facility.

## 8.2 Secret Storage Rules

- Never commit secrets to Git.
- Never include secrets in Docker images.
- Never expose secrets to frontend bundles.
- Never log secrets.
- Never include secrets in queue payloads.
- Never return plaintext secrets from API endpoints.
- Rotate credentials when compromise is suspected.

## 8.3 Notification Secret Encryption

Notification credentials must be encrypted before database persistence.

Use authenticated encryption, such as AES-256-GCM, with:

- Unique nonce/IV per encryption operation.
- Authentication tag.
- Explicit key version.
- Strict key access controls.

Example conceptual structure:

```typescript
interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}
```

Never reuse a nonce with the same AES-GCM key.

Support key rotation by retaining the key version needed to decrypt existing records until re-encryption is complete.

## 8.4 Secret Rotation

Document rotation procedures for:

- Database credentials.
- Redis credentials.
- JWT signing keys.
- Encryption keys.
- Resend API keys.
- Slack webhook URLs.

JWT signing key rotation should support a controlled transition between old and new verification keys.

---

# 9. Redis and BullMQ Security

Redis contains job coordination data and may contain operational metadata.

## 9.1 Redis Configuration

- Require authentication.
- Require TLS where supported.
- Restrict network access.
- Do not expose Redis publicly.
- Use separate credentials or instances where practical.
- Disable unnecessary Redis commands through provider controls or ACLs.
- Monitor memory consumption.
- Configure appropriate persistence and recovery behavior.

## 9.2 Queue Job Validation

Never assume a job payload is trusted simply because it came from BullMQ.

Validate every job payload.

Example:

```typescript
interface MonitoringJob {
  monitorId: string;
  occurrenceId: string;
  scheduledAt: string;
}
```

Before execution:

- Validate identifier formats.
- Load the authoritative monitor configuration from PostgreSQL.
- Verify that the occurrence belongs to that monitor.
- Verify that the occurrence is eligible for processing.
- Verify that the monitor is enabled.
- Apply current security policy to the URL.
- Reject malformed or inconsistent jobs.

Do not trust URL, timeout, method, or expected status copied into a stale job payload. Load authoritative configuration from the database.

## 9.3 Job Reliability

- Make job handlers idempotent.
- Use bounded retries.
- Use exponential backoff.
- Apply queue concurrency limits.
- Handle failed jobs.
- Monitor queue depth.
- Define failed-job retention.
- Avoid storing secrets in job data.
- Avoid logging complete sensitive payloads.

## 9.4 Worker Isolation

Workers should have only the permissions required for their role.

For example:

- Monitoring worker: read monitor configuration, update occurrences, persist checks, and publish incident-related events as required.
- Notification worker: read notification events, access authorized channel credentials, and update delivery records.
- Scheduler: discover due monitors, create occurrences, and publish jobs.

Avoid sharing unrestricted database credentials across all processes.

---

# 10. Monitoring Worker Resource Protection

The monitoring worker executes external requests and is therefore exposed to untrusted network behavior.

## 10.1 Timeouts

Enforce:

- DNS timeout.
- Connection timeout.
- TLS handshake timeout where supported.
- Total request timeout.
- Worker job execution deadline.

Initial monitoring timeout defaults to 10 seconds, with a maximum of 30 seconds as defined by the product requirements.

## 10.2 Response Limits

Enforce limits on:

- Response body size.
- Decompressed body size.
- Response header size.
- Redirect count.
- Concurrent connections.
- Per-host connection usage.

For MVP, do not persist entire response bodies.

Store only the operational metadata needed for monitoring and debugging.

## 10.3 Concurrency

- Use bounded worker concurrency.
- Apply queue backpressure.
- Avoid unbounded promise creation.
- Limit connections per destination.
- Prevent one slow destination from exhausting all worker capacity.
- Consider fairness between users with different monitor counts.

## 10.4 Target Abuse

A user must not be able to use PulseWatch to:

- Perform unrestricted port scanning.
- Flood a target with requests.
- Send arbitrary HTTP headers.
- Send arbitrary request bodies.
- Use the platform as an unrestricted proxy.
- Access internal infrastructure.
- Bypass configured rate limits through multiple monitors.

Apply per-user monitor quotas and reasonable target request frequency limits.

---

# 11. Frontend Security

## 11.1 Token Handling

- Do not store access or refresh tokens in localStorage.
- Keep access tokens in memory where the selected authentication architecture requires them.
- Keep refresh tokens in Secure, HttpOnly cookies.
- Never expose server-only environment variables to the browser.
- Avoid logging authentication data in browser consoles.

## 11.2 XSS Protection

- Avoid unsafe HTML rendering.
- Sanitize untrusted HTML if HTML rendering becomes necessary.
- Do not use dangerouslySetInnerHTML with untrusted content.
- Configure a suitable Content Security Policy.
- Escape user-controlled text in rendered UI.

## 11.3 Authentication UX

- Handle expired sessions safely.
- Prevent uncontrolled refresh request loops.
- Coordinate refresh operations when multiple requests fail simultaneously.
- Clear authentication state after logout.
- Avoid exposing detailed authentication failure reasons.

## 11.4 Public Status Pages

Public status pages must expose only explicitly published information.

Never expose:

- Internal target credentials.
- Private monitor configuration.
- Internal error stack traces.
- Notification secrets.
- Private incident notes.
- Database identifiers or internal operational metadata unless intentionally designed for public consumption.

---

# 12. Logging and Audit Security

## 12.1 Structured Logging

Use structured JSON logging.

Recommended fields:

```typescript
interface SecurityLogContext {
  timestamp: string;
  level: string;
  service: string;
  requestId?: string;
  userId?: string;
  event: string;
  outcome: "success" | "failure";
}
```

Do not include:

- Passwords.
- Access tokens.
- Refresh tokens.
- Cookie values.
- Authorization headers.
- Database connection strings.
- Webhook URLs.
- Encryption keys.
- Complete sensitive request bodies.

## 12.2 Security Events

Record relevant events:

- Login success.
- Login failure.
- Refresh token reuse.
- Password change.
- Session revocation.
- Repeated authorization failures.
- Suspicious monitor URL rejection.
- SSRF policy violation.
- Notification secret modification.
- Administrative security changes.

## 12.3 Log Retention

Define retention according to operational and legal requirements.

Logs must have:

- Access controls.
- Redaction.
- Retention limits.
- Restricted export permissions.
- Protection against accidental credential exposure.

Avoid logging every monitoring response body.

---

# 13. Dependency and Supply Chain Security

## 13.1 Dependency Management

- Keep dependencies updated.
- Review security advisories.
- Avoid unnecessary packages.
- Prefer maintained libraries.
- Pin dependencies through the lockfile.
- Review new packages before introducing them.
- Remove unused dependencies.

## 13.2 Automated Checks

Add CI checks for:

- Dependency vulnerability scanning.
- Secret scanning.
- Static analysis.
- Type checking.
- Linting.
- Unit tests.
- Build validation.

Use tools such as:

- GitHub Dependabot.
- GitHub secret scanning.
- npm audit or an equivalent dependency scanner.
- CodeQL or an equivalent static analysis tool.

Tool selection may depend on repository and hosting capabilities.

## 13.3 Docker Security

- Use minimal base images.
- Pin base image versions.
- Avoid running containers as root.
- Do not embed secrets in image layers.
- Keep images patched.
- Use read-only filesystems where practical.
- Drop unnecessary Linux capabilities.
- Set CPU and memory limits.
- Scan images before release.

---

# 14. Infrastructure and Deployment Security

## 14.1 Network Boundaries

Recommended logical separation:

```text
                    Internet
                       |
                       v
                 Reverse Proxy
                       |
              +--------+--------+
              |                 |
              v                 v
          Next.js Web         NestJS API
                                  |
                                  v
                             PostgreSQL
                                  |
                                  v
                                Redis
                                  |
                 +----------------+----------------+
                 |                |                |
                 v                v                v
             Scheduler      Monitor Worker   Notification Worker
                                  |
                                  v
                            External Targets
```

The diagram represents logical dependencies, not permission to allow unrestricted network access.

Implement firewall rules so each service can reach only the systems and destinations it requires.

The monitoring worker needs carefully controlled outbound internet access. It must not have unrestricted access to internal infrastructure.

## 14.2 Deployment Requirements

- Use HTTPS.
- Store secrets outside source control.
- Restrict administrative access.
- Enable database TLS.
- Enable Redis authentication and TLS where supported.
- Use least-privilege service credentials.
- Configure container resource limits.
- Configure health checks.
- Configure graceful shutdown.
- Keep deployment artifacts patched.

## 14.3 Environment Separation

Maintain separate environments:

```text
development
staging
production
```

Each environment must use separate:

- Database credentials.
- Redis credentials.
- JWT signing keys.
- Encryption keys.
- Email credentials.
- Application secrets.

Never use production credentials in local development.

---

# 15. Privacy and Data Retention

Store only information required for product functionality.

## 15.1 Data Classification

| Data | Classification |
|---|---|
| Password hash | Highly sensitive |
| Refresh token hash | Highly sensitive |
| Encryption keys | Highly sensitive |
| Notification credentials | Highly sensitive |
| Email address | Personal data |
| Monitor URL | Potentially sensitive |
| Check result | Operational data |
| Incident history | Operational data |
| Public status information | Public only when published |

## 15.2 Retention Policy

Follow the database specification:

| Data | Retention |
|---|---|
| Raw monitoring checks | 30 days |
| Hourly aggregates | 90 days |
| Daily aggregates | 1 year |
| Incident history | Indefinite by default |
| Notification delivery logs | 90 days |
| Published outbox events | 7 days |
| Expired refresh tokens | 30 days after expiry |

Retention jobs must be idempotent and safe to retry.

Any legal, contractual, or account-deletion requirements must override default retention where applicable.

## 15.3 User Deletion

Define an account deletion workflow that:

- Revokes sessions.
- Removes or anonymizes personal information according to policy.
- Handles owned monitors and incidents.
- Handles notification channels and secrets.
- Handles public status pages.
- Handles retained operational records.
- Prevents orphaned records.

Account deletion must use an explicit, tested data-retention policy rather than uncontrolled cascading deletion.

---

# 16. Security Testing Strategy

Security testing is mandatory before MVP release.

## 16.1 Authentication Tests

- [ ] Invalid credentials are rejected.
- [ ] Expired tokens are rejected.
- [ ] Invalid signatures are rejected.
- [ ] Unsupported JWT algorithms are rejected.
- [ ] Refresh token rotation works.
- [ ] Refresh token reuse is detected.
- [ ] Logout revokes the session.
- [ ] Cookie security attributes are correct.

## 16.2 Authorization Tests

- [ ] User A cannot access User B's monitor.
- [ ] User A cannot modify User B's monitor.
- [ ] User A cannot access User B's incident.
- [ ] User A cannot access User B's notification channel.
- [ ] User A cannot associate User B's monitor with a status page.
- [ ] Nested resource ownership is enforced.

## 16.3 SSRF Tests

- [ ] Localhost is blocked.
- [ ] Private IPv4 addresses are blocked.
- [ ] Private IPv6 addresses are blocked.
- [ ] Link-local addresses are blocked.
- [ ] Cloud metadata endpoints are blocked.
- [ ] IPv4-mapped IPv6 is validated.
- [ ] DNS rebinding is mitigated.
- [ ] Mixed public/private DNS responses are rejected.
- [ ] Redirects to prohibited addresses are blocked.
- [ ] Unsupported schemes are rejected.
- [ ] Unsupported ports are rejected.
- [ ] Connection pinning is verified.

## 16.4 API Tests

- [ ] Oversized requests are rejected.
- [ ] Invalid payloads are rejected.
- [ ] Unknown fields are rejected.
- [ ] Rate limits are enforced.
- [ ] CORS restrictions work.
- [ ] Security headers are present.
- [ ] Internal errors do not expose stack traces.

## 16.5 Queue and Worker Tests

- [ ] Invalid job payloads are rejected.
- [ ] Duplicate jobs do not create duplicate results.
- [ ] Infrastructure failures do not count as endpoint failures.
- [ ] Job retries are bounded.
- [ ] Worker concurrency is bounded.
- [ ] Malicious response sizes are limited.
- [ ] Redirect handling follows security policy.
- [ ] Worker shutdown does not permanently lose work.

## 16.6 Secret Handling Tests

- [ ] Secrets are encrypted at rest.
- [ ] Secret API responses are masked.
- [ ] Secrets are not logged.
- [ ] Secrets are absent from queue payloads.
- [ ] Encryption key versions are validated.
- [ ] Decryption failures fail securely.

---

# 17. CI/CD Security Gates

Every pull request should pass:

```text
1. Dependency installation
2. Secret scanning
3. Dependency vulnerability scanning
4. Type checking
5. Linting
6. Unit tests
7. Integration tests
8. Security-focused tests
9. Production build
```

Additional release gates:

- [ ] Database migrations reviewed.
- [ ] Docker images scanned.
- [ ] Production environment variables verified.
- [ ] SSRF tests pass.
- [ ] Authorization tests pass.
- [ ] No critical or high unresolved security vulnerabilities without an approved exception.
- [ ] Rollback procedure documented.

Security exceptions must have an owner, documented justification, mitigation, and review date.

---

# 18. Security Incident Response

## 18.1 Incident Categories

| Severity | Example |
|---|---|
| Critical | Confirmed SSRF access to internal infrastructure |
| Critical | Database or encryption key compromise |
| High | Authentication bypass |
| High | Cross-user data exposure |
| High | Notification credential exposure |
| Medium | Repeated account abuse |
| Low | Non-sensitive configuration exposure |

## 18.2 Response Procedure

When a security incident is detected:

1. Identify the affected service and resources.
2. Contain the incident.
3. Revoke compromised credentials.
4. Disable vulnerable functionality if necessary.
5. Preserve relevant security logs.
6. Determine the scope of exposure.
7. Patch the vulnerability.
8. Test the mitigation.
9. Restore normal operations.
10. Document the root cause and preventive actions.

## 18.3 Credential Compromise

For suspected credential compromise:

- Rotate affected credentials.
- Revoke affected sessions.
- Rotate signing keys when necessary.
- Rotate encryption keys when necessary.
- Review access logs.
- Identify potentially exposed data.
- Verify that old credentials can no longer be used.

---

# 19. Security Implementation Priority

| Priority | Security Control | Required Phase |
|---|---|---|
| P0 | SSRF protection | Monitoring worker |
| P0 | Resource ownership | Authentication and API |
| P0 | Secure authentication | Authentication |
| P0 | Secret management | Infrastructure setup |
| P0 | Network isolation | Deployment |
| P0 | Database access restrictions | Infrastructure setup |
| P1 | Refresh token reuse detection | Authentication |
| P1 | Rate limiting | API |
| P1 | Queue payload validation | Scheduler and workers |
| P1 | Notification encryption | Notifications |
| P1 | Structured log redaction | All services |
| P1 | Security testing in CI | QA |
| P2 | Advanced audit logging | Post-MVP |
| P2 | Organization-level RBAC | Future |
| P2 | Automated security alerting | Future |

P0 controls are release blockers. P1 controls should be completed before public production release unless an explicitly documented and approved risk exception exists.

---

# 20. Definition of Security Done

A feature is not security-complete until:

- [ ] Inputs are validated.
- [ ] Authentication requirements are enforced.
- [ ] Authorization requirements are enforced.
- [ ] Sensitive information is protected.
- [ ] Errors do not leak internal details.
- [ ] Logs are appropriately redacted.
- [ ] Relevant abuse cases are considered.
- [ ] Security tests are implemented.
- [ ] Failure behavior is safe.
- [ ] Documentation is updated.

For monitoring execution, security completion additionally requires:

- [ ] Destination IP validation.
- [ ] DNS rebinding mitigation.
- [ ] Connection-time destination enforcement.
- [ ] Redirect validation.
- [ ] Network-level egress restrictions.
- [ ] Request and response limits.
- [ ] Bounded worker concurrency.

---

# 21. Final Security Release Checklist

## Application

- [ ] Authentication is secure.
- [ ] Authorization is enforced.
- [ ] Passwords are hashed.
- [ ] Refresh tokens are rotated.
- [ ] CSRF protections are configured.
- [ ] CORS is restricted.
- [ ] Rate limiting is enabled.
- [ ] Input validation is enabled.
- [ ] Security headers are configured.

## Monitoring

- [ ] SSRF protection is implemented.
- [ ] Private IP destinations are blocked.
- [ ] DNS rebinding is mitigated.
- [ ] Redirect destinations are validated.
- [ ] HTTP timeouts are enforced.
- [ ] Response sizes are limited.
- [ ] Worker concurrency is bounded.
- [ ] Outbound network access is restricted.

## Infrastructure

- [ ] Supabase connections use TLS.
- [ ] Redis is private and authenticated.
- [ ] Secrets are stored securely.
- [ ] Containers run with least privilege.
- [ ] Database permissions are restricted.
- [ ] Production credentials are separated.
- [ ] Backups and recovery are verified.
- [ ] Health checks are configured.

## Data

- [ ] Sensitive data is encrypted where required.
- [ ] Secrets are never returned in plaintext.
- [ ] Logs are redacted.
- [ ] Retention jobs are implemented.
- [ ] Account deletion behavior is documented.

## Testing

- [ ] Authentication security tests pass.
- [ ] Authorization security tests pass.
- [ ] SSRF tests pass.
- [ ] Queue security tests pass.
- [ ] Secret handling tests pass.
- [ ] Dependency scanning is enabled.
- [ ] Secret scanning is enabled.

---

# 22. Final Security Principle

PulseWatch is an outbound HTTP execution platform.

Its monitoring worker must be treated as a security-sensitive network component, not as a generic HTTP client.

The most important security requirement is:

**A user-controlled monitor URL must never provide access to internal infrastructure, cloud metadata, private network services, or unauthorized resources.**

Application validation, connection-time destination enforcement, worker isolation, and network-level egress restrictions must work together.

No MVP release should proceed with an unmitigated critical SSRF vulnerability, cross-user authorization vulnerability, or exposed production secret.
