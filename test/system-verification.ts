import { getEnv } from '@pulsewatch/config';
import { prisma, disconnectPrisma } from '@pulsewatch/database';
import { AuthService } from '../backend/src/services/auth.service';
import { MonitorService } from '../backend/src/services/monitor.service';
import { validateTargetUrl, SsrfValidationError, isPrivateIp } from '../services/worker/src/ssrf';
import { executeHttpCheck } from '../services/worker/src/executor';
import { evaluateIncidentState } from '../services/worker/src/incidents';
import { DashboardService } from '../backend/src/services/dashboard.service';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   PULSEWATCH COMPREHENSIVE SYSTEM VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extra?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  async function retryOnDisconnect<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        if ((err.code === 'P1001' || err.message?.includes("Can't reach database server")) && attempt < retries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  const authService = new AuthService();
  const monitorsService = new MonitorService();
  const dashboardService = new DashboardService();

  const testId = Date.now();
  const userAEmail = `user_a_${testId}@pulsewatch.test`;
  const userBEmail = `user_b_${testId}@pulsewatch.test`;
  const testPassword = 'Password123!';

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: AUTHENTICATION & SECURITY (PHASE 3)
    // ----------------------------------------------------
    console.log('\n--- SUITE 1: AUTHENTICATION & SECURITY ---');

    // 1.1 User Registration
    const regResA = await authService.register({
      name: 'User A',
      email: userAEmail,
      password: testPassword,
    });
    assert(
      !!regResA.tokens.accessToken && !!regResA.rawRefreshToken && regResA.tokens.user.email === userAEmail,
      'User A registration succeeds with access token and refresh token'
    );

    // 1.2 Duplicate Email Rejection
    let duplicateRejected = false;
    try {
      await authService.register({
        name: 'User A Duplicate',
        email: userAEmail,
        password: testPassword,
      });
    } catch (err: any) {
      duplicateRejected = err.status === 409 || err.message.includes('already exists');
    }
    assert(duplicateRejected, 'Duplicate registration is rejected with 409 Conflict');

    // 1.3 User Login with Valid Credentials
    const loginRes = await authService.login({
      email: userAEmail,
      password: testPassword,
    });
    assert(
      !!loginRes.tokens.accessToken && !!loginRes.rawRefreshToken,
      'Login with valid credentials returns tokens'
    );

    // 1.4 User Login with Invalid Password
    let invalidPwRejected = false;
    try {
      await authService.login({
        email: userAEmail,
        password: 'WrongPassword!',
      });
    } catch (err: any) {
      invalidPwRejected = err.status === 401;
    }
    assert(invalidPwRejected, 'Login with incorrect password is rejected with 401 Unauthorized');

    // 1.5 Refresh Token Rotation
    const initialRefresh = regResA.rawRefreshToken;
    const rotated = await authService.refreshTokens(initialRefresh);
    assert(
      !!rotated.tokens.accessToken && rotated.rawRefreshToken !== initialRefresh,
      'Refresh token rotation produces a new pair of tokens'
    );

    // 1.6 Refresh Token Reuse Detection
    let reuseDetected = false;
    try {
      // Reusing the already rotated token
      await authService.refreshTokens(initialRefresh);
    } catch (err: any) {
      reuseDetected = err.status === 401 && err.message.includes('reuse');
    }
    assert(reuseDetected, 'Reusing an old refresh token triggers security revocation');

    // 1.7 Current User Profile Retrieval
    const profile = await authService.getProfile(regResA.tokens.user.id);
    assert(profile.id === regResA.tokens.user.id && profile.name === 'User A', 'Profile endpoint returns correct user data');

    // Register User B for authorization/IDOR tests
    const regResB = await authService.register({
      name: 'User B',
      email: userBEmail,
      password: testPassword,
    });

    // ----------------------------------------------------
    // TEST SUITE 2: MONITOR MANAGEMENT & OWNERSHIP (PHASE 4)
    // ----------------------------------------------------
    console.log('\n--- SUITE 2: MONITOR MANAGEMENT & AUTHORIZATION ---');

    // 2.1 Create Monitor for User A
    const monitorA = await monitorsService.create(regResA.tokens.user.id, {
      name: 'User A Production API',
      url: 'https://httpbin.org/status/200',
      intervalSeconds: 60,
      timeoutMs: 5000,
      expectedStatusCode: 200,
    });
    assert(
      !!monitorA.id && monitorA.name === 'User A Production API' && monitorA.enabled === true,
      'User A creates a monitor successfully'
    );

    // 2.2 User A can read their monitor
    const fetchedA = await monitorsService.findOne(regResA.tokens.user.id, monitorA.id);
    assert(fetchedA.id === monitorA.id, 'User A can view their own monitor');

    // 2.3 IDOR / BOLA Prevention: User B cannot access User A's monitor
    let accessBlocked = false;
    try {
      await monitorsService.findOne(regResB.tokens.user.id, monitorA.id);
    } catch (err: any) {
      accessBlocked = err.status === 403;
    }
    assert(accessBlocked, 'IDOR Protection: User B cannot view User A monitor (403 Forbidden)');

    // 2.4 User B cannot update User A's monitor
    let updateBlocked = false;
    try {
      await monitorsService.update(regResB.tokens.user.id, monitorA.id, { name: 'Hacked Monitor' });
    } catch (err: any) {
      updateBlocked = err.status === 403;
    }
    assert(updateBlocked, 'IDOR Protection: User B cannot modify User A monitor (403 Forbidden)');

    // 2.5 Pause / Resume Monitor
    const paused = await monitorsService.setEnabled(regResA.tokens.user.id, monitorA.id, false);
    assert(paused.enabled === false && paused.status === 'PAUSED', 'Monitor can be paused');
    const resumed = await monitorsService.setEnabled(regResA.tokens.user.id, monitorA.id, true);
    assert(resumed.enabled === true, 'Monitor can be resumed');

    // ----------------------------------------------------
    // TEST SUITE 3: SSRF PROTECTION (PHASE 6)
    // ----------------------------------------------------
    console.log('\n--- SUITE 3: SSRF PROTECTION ENGINE ---');

    // 3.1 Loopback rejection (127.0.0.1)
    let loopbackBlocked = false;
    try {
      await validateTargetUrl('http://127.0.0.1:8080/admin');
    } catch (err: any) {
      loopbackBlocked = err instanceof SsrfValidationError;
    }
    assert(loopbackBlocked, 'SSRF: Loopback 127.0.0.1 is rejected');

    // 3.2 Private RFC1918 rejection (10.0.0.1, 192.168.1.1, 172.16.0.1)
    assert(isPrivateIp('10.0.0.1'), 'SSRF: 10.0.0.1 classified as private');
    assert(isPrivateIp('192.168.1.1'), 'SSRF: 192.168.1.1 classified as private');
    assert(isPrivateIp('172.16.5.5'), 'SSRF: 172.16.5.5 classified as private');

    // 3.3 Cloud metadata endpoint rejection (169.254.169.254)
    let metadataBlocked = false;
    try {
      await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    } catch (err: any) {
      metadataBlocked = err instanceof SsrfValidationError;
    }
    assert(metadataBlocked, 'SSRF: AWS/GCP metadata IP 169.254.169.254 is rejected');

    // 3.4 Localhost hostname rejection
    let localhostBlocked = false;
    try {
      await validateTargetUrl('http://localhost:3000');
    } catch (err: any) {
      localhostBlocked = err instanceof SsrfValidationError;
    }
    assert(localhostBlocked, 'SSRF: Localhost hostname is rejected');

    // 3.5 IPv6 loopback rejection (::1)
    assert(isPrivateIp('::1'), 'SSRF: IPv6 ::1 loopback classified as private');

    // 3.6 IPv4-mapped IPv6 rejection (::ffff:127.0.0.1)
    assert(isPrivateIp('::ffff:127.0.0.1'), 'SSRF: IPv4-mapped IPv6 loopback classified as private');

    // ----------------------------------------------------
    // TEST SUITE 4: INCIDENT STATE MACHINE (PHASE 7)
    // ----------------------------------------------------
    console.log('\n--- SUITE 4: INCIDENT STATE MACHINE ---');

    // We will simulate 3 consecutive failures to trigger OPEN,
    // then 1 success for RECOVERING, then 1 failure for REOPENED,
    // then 2 successes for RESOLVED!

    // Step A: 3 Consecutive Failures -> OPEN
    await prisma.$transaction(async (tx) => {
      // Create occurrence & check 1
      const occ1 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() - 3000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ1.id, isSuccess: false, statusCode: 500, errorMessage: 'Internal Error', checkedAt: new Date(Date.now() - 3000) },
      });
      await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: false, failureThreshold: 3, recoveryThreshold: 2, statusCode: 500 });

      // Check 2
      const occ2 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() - 2000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ2.id, isSuccess: false, statusCode: 500, errorMessage: 'Internal Error', checkedAt: new Date(Date.now() - 2000) },
      });
      await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: false, failureThreshold: 3, recoveryThreshold: 2, statusCode: 500 });

      // Check 3 (Threshold reached!)
      const occ3 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() - 1000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ3.id, isSuccess: false, statusCode: 500, errorMessage: 'Internal Error', checkedAt: new Date(Date.now() - 1000) },
      });
      const res = await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: false, failureThreshold: 3, recoveryThreshold: 2, statusCode: 500 });
      assert(res.action === 'OPENED', 'State Machine: 3 consecutive failures transitions to OPEN');
    }, { timeout: 30000, maxWait: 15000 });

    const incidentAfterFailures = await prisma.incident.findFirst({
      where: { monitorId: monitorA.id, status: 'OPEN' },
    });
    assert(!!incidentAfterFailures, 'Incident record is created with status OPEN in database');

    const monitorDown = await prisma.monitor.findUnique({ where: { id: monitorA.id } });
    assert(monitorDown?.status === 'DOWN', 'Monitor status is updated to DOWN');

    // Step B: 1 Success -> RECOVERING
    await prisma.$transaction(async (tx) => {
      const occ4 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ4.id, isSuccess: true, statusCode: 200, responseTimeMs: 150, checkedAt: new Date() },
      });
      const res = await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: true, failureThreshold: 3, recoveryThreshold: 2, statusCode: 200 });
      assert(res.action === 'RECOVERING', 'State Machine: First successful check transitions to RECOVERING', JSON.stringify(res));
    }, { timeout: 30000, maxWait: 15000 });

    // Step C: 1 Failure during RECOVERING -> REOPENED
    await prisma.$transaction(async (tx) => {
      const occ5 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() + 1000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ5.id, isSuccess: false, statusCode: 503, checkedAt: new Date(Date.now() + 1000) },
      });
      const res = await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: false, failureThreshold: 3, recoveryThreshold: 2, statusCode: 503 });
      assert(res.action === 'REOPENED', 'State Machine: Failure during recovery returns incident to OPEN');
    }, { timeout: 30000, maxWait: 15000 });

    // Step D: First Success again -> RECOVERING
    await prisma.$transaction(async (tx) => {
      const occ6 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() + 2000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ6.id, isSuccess: true, statusCode: 200, responseTimeMs: 120, checkedAt: new Date(Date.now() + 2000) },
      });
      await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: true, failureThreshold: 3, recoveryThreshold: 2, statusCode: 200 });
    }, { timeout: 30000, maxWait: 15000 });

    // Step E: Second Consecutive Success -> RESOLVED
    await prisma.$transaction(async (tx) => {
      const occ7 = await tx.monitoringOccurrence.create({
        data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() + 3000), status: 'COMPLETED' },
      });
      await tx.monitorCheck.create({
        data: { monitorId: monitorA.id, occurrenceId: occ7.id, isSuccess: true, statusCode: 200, responseTimeMs: 110, checkedAt: new Date(Date.now() + 3000) },
      });
      const res = await evaluateIncidentState(tx, { monitorId: monitorA.id, isSuccess: true, failureThreshold: 3, recoveryThreshold: 2, statusCode: 200 });
      assert(res.action === 'RESOLVED', 'State Machine: 2 consecutive successes transition incident to RESOLVED', JSON.stringify(res));
    }, { timeout: 30000, maxWait: 15000 });

    const monitorRestored = await prisma.monitor.findUnique({ where: { id: monitorA.id } });
    assert(monitorRestored?.status === 'UP', 'Monitor status is restored to UP upon resolution');

    // ----------------------------------------------------
    // TEST SUITE 5: TRANSACTIONAL OUTBOX ARCHITECTURE
    // ----------------------------------------------------
    console.log('\n--- SUITE 5: TRANSACTIONAL OUTBOX ARCHITECTURE ---');

    const pendingOutbox = await prisma.outboxEvent.count({ where: { status: 'PENDING' } });
    assert(pendingOutbox > 0, `Outbox events created atomically with incident changes (Found: ${pendingOutbox})`);

    const latestOutbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: incidentAfterFailures!.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(latestOutbox !== null, 'Transactional outbox captured incident lifecycle event');
    assert((latestOutbox?.payload as any)?.monitorId === monitorA.id, 'Outbox event payload contains accurate monitor metadata');

    // ----------------------------------------------------
    // TEST SUITE 6: DASHBOARD & ANALYTICS (PHASE 9)
    // ----------------------------------------------------
    console.log('\n--- SUITE 6: DASHBOARD & ANALYTICS ---');

    const summary = await retryOnDisconnect(() => dashboardService.getSummary(regResA.tokens.user.id));
    assert(summary.totalMonitors === 1, 'Dashboard summary returns accurate monitor count');
    assert(summary.operationalMonitors === 1, 'Dashboard summary tracks operational monitors');
    assert(summary.activeIncidents === 0, 'Dashboard summary reflects resolved incidents (0 active)');
    assert(summary.overallUptime24h > 0 && summary.overallUptime24h <= 100, `Uptime 24h calculated accurately: ${summary.overallUptime24h}%`);
    assert(summary.recentChecks.length > 0, 'Dashboard includes recent check stream');

    // ----------------------------------------------------
    // TEST SUITE 7: RANGE METRICS & CHECK PAGINATION/SORT
    // ----------------------------------------------------
    console.log('\n--- SUITE 7: RANGE METRICS & CHECK PAGINATION/SORT ---');

    const olderOcc1 = await prisma.monitoringOccurrence.create({
      data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() - 45 * 86400000), status: 'COMPLETED' },
    });
    await prisma.monitorCheck.create({
      data: { monitorId: monitorA.id, occurrenceId: olderOcc1.id, isSuccess: true, statusCode: 200, responseTimeMs: 210, checkedAt: new Date(Date.now() - 45 * 86400000) },
    });

    const olderOcc2 = await prisma.monitoringOccurrence.create({
      data: { monitorId: monitorA.id, scheduledAt: new Date(Date.now() - 220 * 86400000), status: 'COMPLETED' },
    });
    await prisma.monitorCheck.create({
      data: { monitorId: monitorA.id, occurrenceId: olderOcc2.id, isSuccess: true, statusCode: 200, responseTimeMs: 310, checkedAt: new Date(Date.now() - 220 * 86400000) },
    });

    const m1d = await monitorsService.getMetrics(regResA.tokens.user.id, monitorA.id, '1d');
    const m3m = await monitorsService.getMetrics(regResA.tokens.user.id, monitorA.id, '3m');
    const m9m = await monitorsService.getMetrics(regResA.tokens.user.id, monitorA.id, '9m');
    const mLife = await monitorsService.getMetrics(regResA.tokens.user.id, monitorA.id, 'lifetime');
    assert(m1d.rangeStats?.totalChecks === 7, `1d range returns 7 recent checks (got ${m1d.rangeStats?.totalChecks})`);
    assert(m3m.rangeStats?.totalChecks === 8, `3m range includes 45-day check (got ${m3m.rangeStats?.totalChecks})`);
    assert(m9m.rangeStats?.totalChecks === 9 && mLife.rangeStats?.totalChecks === 9, '9m and lifetime include 220-day check');

    const newestPage1 = await monitorsService.getChecks(regResA.tokens.user.id, monitorA.id, 1, 3, 'newest');
    const newestPage2 = await monitorsService.getChecks(regResA.tokens.user.id, monitorA.id, 2, 3, 'newest');
    const oldestPage1 = await monitorsService.getChecks(regResA.tokens.user.id, monitorA.id, 1, 3, 'oldest');
    assert(
      newestPage1.meta.total === 9 && newestPage1.meta.totalPages === 3 && newestPage1.data.length === 3,
      'Checks pagination returns accurate meta totals and page size'
    );
    assert(
      new Date(newestPage1.data[0].checkedAt).getTime() >= new Date(newestPage2.data[0].checkedAt).getTime(),
      'Newest sort orders page 1 ahead of page 2'
    );
    assert(
      new Date(oldestPage1.data[0].checkedAt).getTime() <= new Date(oldestPage1.data[1].checkedAt).getTime(),
      'Oldest sort orders checks in ascending chronological order'
    );

    // Clean up test data
    await prisma.$transaction([
      prisma.monitorCheck.deleteMany({ where: { monitorId: monitorA.id } }),
      prisma.monitoringOccurrence.deleteMany({ where: { monitorId: monitorA.id } }),
      prisma.incidentEvent.deleteMany({ where: { incident: { monitorId: monitorA.id } } }),
      prisma.outboxEvent.deleteMany({ where: { aggregateId: incidentAfterFailures!.id } }),
      prisma.incident.deleteMany({ where: { monitorId: monitorA.id } }),
      prisma.monitor.deleteMany({ where: { userId: regResA.tokens.user.id } }),
      prisma.refreshToken.deleteMany({ where: { userId: regResA.tokens.user.id } }),
      prisma.refreshToken.deleteMany({ where: { userId: regResB.tokens.user.id } }),
      prisma.user.deleteMany({ where: { id: { in: [regResA.tokens.user.id, regResB.tokens.user.id] } } }),
    ]);

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Test Suite encountered fatal error:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

runTestSuite();
