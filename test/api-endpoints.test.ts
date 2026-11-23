import { createApp } from '../backend/src/app';
import { Server } from 'http';
import { AddressInfo } from 'net';

async function runEndpointTests() {
  console.log('====================================================');
  console.log('       PULSEWATCH API ENDPOINT VERIFICATION         ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  const app = createApp();
  let server: Server;
  let baseUrl: string;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  try {
    // ------------------------------------------------------------------------
    // SUITE 1: AUTHENTICATION ROUTE CONTRACTS & REGISTRATION
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 1: AUTHENTICATION ROUTE CONTRACTS ---');

    // 1.1 GET /api/v1/auth/register must NOT exist (POST-only contract)
    const getRegRes = await fetch(`${baseUrl}/api/v1/auth/register`, { method: 'GET' });
    assert(
      getRegRes.status === 404,
      'GET /api/v1/auth/register returns 404 (POST-only contract enforced)',
      `Received status ${getRegRes.status}`
    );

    // 1.2 POST /api/v1/auth/register rejects missing fields
    const postRegEmpty = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const postRegEmptyJson = await postRegEmpty.json();
    assert(
      postRegEmpty.status === 400 &&
        postRegEmptyJson.success === false &&
        !!postRegEmptyJson.errors?.name &&
        !!postRegEmptyJson.errors?.email &&
        !!postRegEmptyJson.errors?.password,
      'POST /api/v1/auth/register validates required fields (name, email, password)',
      `Errors: ${JSON.stringify(postRegEmptyJson.errors)}`
    );

    // 1.3 POST /api/v1/auth/register rejects invalid email format
    const postRegInvalidEmail = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
      }),
    });
    const postRegInvalidEmailJson = await postRegInvalidEmail.json();
    assert(
      postRegInvalidEmail.status === 400 && !!postRegInvalidEmailJson.errors?.email,
      'POST /api/v1/auth/register rejects malformed email address',
      `Errors: ${JSON.stringify(postRegInvalidEmailJson.errors)}`
    );

    // 1.4 POST /api/v1/auth/register rejects password shorter than 8 chars
    const postRegShortPw = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'short',
      }),
    });
    const postRegShortPwJson = await postRegShortPw.json();
    assert(
      postRegShortPw.status === 400 && !!postRegShortPwJson.errors?.password,
      'POST /api/v1/auth/register enforces minimum password length (8 chars)',
      `Errors: ${JSON.stringify(postRegShortPwJson.errors)}`
    );

    // 1.5 GET /api/v1/auth/login must NOT exist (POST-only contract)
    const getLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'GET' });
    assert(
      getLoginRes.status === 404,
      'GET /api/v1/auth/login returns 404 (POST-only contract enforced)',
      `Received status ${getLoginRes.status}`
    );

    // 1.6 POST /api/v1/auth/login validates required fields
    const postLoginEmpty = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const postLoginEmptyJson = await postLoginEmpty.json();
    assert(
      postLoginEmpty.status === 400 &&
        postLoginEmptyJson.success === false &&
        !!postLoginEmptyJson.errors?.email &&
        !!postLoginEmptyJson.errors?.password,
      'POST /api/v1/auth/login validates required fields (email, password)',
      `Errors: ${JSON.stringify(postLoginEmptyJson.errors)}`
    );

    // 1.7 POST /api/v1/auth/refresh requires refresh cookie
    const postRefreshNoCookie = await fetch(`${baseUrl}/api/v1/auth/refresh`, { method: 'POST' });
    assert(
      postRefreshNoCookie.status === 401,
      'POST /api/v1/auth/refresh rejects request without refresh cookie (401)',
      `Status: ${postRefreshNoCookie.status}`
    );

    // 1.8 POST /api/v1/auth/logout succeeds (clears cookie)
    const postLogoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST' });
    const postLogoutJson = await postLogoutRes.json();
    assert(
      postLogoutRes.status === 200 && postLogoutJson.success === true,
      'POST /api/v1/auth/logout succeeds with 200 OK',
      `Status: ${postLogoutRes.status}`
    );

    // 1.9 GET /api/v1/auth/me requires authentication
    const getMeUnauth = await fetch(`${baseUrl}/api/v1/auth/me`, { method: 'GET' });
    assert(
      getMeUnauth.status === 401,
      'GET /api/v1/auth/me rejects unauthenticated request (401)',
      `Status: ${getMeUnauth.status}`
    );

    // ------------------------------------------------------------------------
    // SUITE 2: HEALTH PROBES & ROUTE MOUNTING
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 2: HEALTH PROBES & MOUNTING ---');

    // 2.1 Root health check
    const rootHealthRes = await fetch(`${baseUrl}/health`);
    const rootHealthJson = await rootHealthRes.json();
    assert(
      (rootHealthRes.status === 200 || rootHealthRes.status === 503) && typeof rootHealthJson.success === 'boolean',
      'GET /health root probe responds with standard JSON envelope',
      `Status: ${rootHealthRes.status}`
    );

    // 2.2 Root readiness check
    const rootReadyRes = await fetch(`${baseUrl}/ready`);
    const rootReadyJson = await rootReadyRes.json();
    assert(
      (rootReadyRes.status === 200 || rootReadyRes.status === 503) && typeof rootReadyJson.data?.ready === 'boolean',
      'GET /ready root probe responds with ready status',
      `Status: ${rootReadyRes.status}`
    );

    // 2.3 API v1 health check (mounted under /api/v1/health)
    const apiHealthRes = await fetch(`${baseUrl}/api/v1/health`);
    const apiHealthJson = await apiHealthRes.json();
    assert(
      (apiHealthRes.status === 200 || apiHealthRes.status === 503) && typeof apiHealthJson.success === 'boolean',
      'GET /api/v1/health resolves correctly (no 404 route mounting error)',
      `Status: ${apiHealthRes.status}`
    );

    // 2.4 API v1 sub-path health check
    const apiHealthSubRes = await fetch(`${baseUrl}/api/v1/health/health`);
    assert(
      apiHealthSubRes.status === 200 || apiHealthSubRes.status === 503,
      'GET /api/v1/health/health sub-route resolves correctly',
      `Status: ${apiHealthSubRes.status}`
    );

    // 2.5 API v1 readiness check
    const apiReadyRes = await fetch(`${baseUrl}/api/v1/health/ready`);
    assert(
      apiReadyRes.status === 200 || apiReadyRes.status === 503,
      'GET /api/v1/health/ready sub-route resolves correctly',
      `Status: ${apiReadyRes.status}`
    );

    // ------------------------------------------------------------------------
    // SUITE 3: DOMAIN ROUTE MOUNTING & AUTHENTICATION ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 3: DOMAIN ROUTE MOUNTING & AUTH ENFORCEMENT ---');

    // 3.1 Monitors Module
    const monitorsListRes = await fetch(`${baseUrl}/api/v1/monitors`);
    assert(monitorsListRes.status === 401, 'GET /api/v1/monitors requires auth (401)');

    const monitorsCreateRes = await fetch(`${baseUrl}/api/v1/monitors`, { method: 'POST' });
    assert(monitorsCreateRes.status === 401, 'POST /api/v1/monitors requires auth (401)');

    const monitorsGetRes = await fetch(`${baseUrl}/api/v1/monitors/test-id`);
    assert(monitorsGetRes.status === 401, 'GET /api/v1/monitors/:id requires auth (401)');

    const monitorsPatchRes = await fetch(`${baseUrl}/api/v1/monitors/test-id`, { method: 'PATCH' });
    assert(monitorsPatchRes.status === 401, 'PATCH /api/v1/monitors/:id requires auth (401)');

    const monitorsEnableRes = await fetch(`${baseUrl}/api/v1/monitors/test-id/enable`, { method: 'PATCH' });
    assert(monitorsEnableRes.status === 401, 'PATCH /api/v1/monitors/:id/enable requires auth (401)');

    const monitorsDisableRes = await fetch(`${baseUrl}/api/v1/monitors/test-id/disable`, { method: 'PATCH' });
    assert(monitorsDisableRes.status === 401, 'PATCH /api/v1/monitors/:id/disable requires auth (401)');

    const monitorsDeleteRes = await fetch(`${baseUrl}/api/v1/monitors/test-id`, { method: 'DELETE' });
    assert(monitorsDeleteRes.status === 401, 'DELETE /api/v1/monitors/:id requires auth (401)');

    const monitorsChecksRes = await fetch(`${baseUrl}/api/v1/monitors/test-id/checks`);
    assert(monitorsChecksRes.status === 401, 'GET /api/v1/monitors/:id/checks requires auth (401)');

    const monitorsMetricsRes = await fetch(`${baseUrl}/api/v1/monitors/test-id/metrics`);
    assert(monitorsMetricsRes.status === 401, 'GET /api/v1/monitors/:id/metrics requires auth (401)');

    // 3.2 Incidents Module
    const incidentsListRes = await fetch(`${baseUrl}/api/v1/incidents`);
    assert(incidentsListRes.status === 401, 'GET /api/v1/incidents requires auth (401)');

    const incidentsGetRes = await fetch(`${baseUrl}/api/v1/incidents/test-id`);
    assert(incidentsGetRes.status === 401, 'GET /api/v1/incidents/:id requires auth (401)');

    const incidentsPatchRes = await fetch(`${baseUrl}/api/v1/incidents/test-id`, { method: 'PATCH' });
    assert(incidentsPatchRes.status === 401, 'PATCH /api/v1/incidents/:id requires auth (401)');

    // 3.3 Dashboard Module
    const dashboardSummaryRes = await fetch(`${baseUrl}/api/v1/dashboard/summary`);
    assert(dashboardSummaryRes.status === 401, 'GET /api/v1/dashboard/summary requires auth (401)');

    const dashboardRootRes = await fetch(`${baseUrl}/api/v1/dashboard`);
    assert(dashboardRootRes.status === 401, 'GET /api/v1/dashboard requires auth (401)');

    // 3.4 404 handler returns structured error envelope
    const notFoundRes = await fetch(`${baseUrl}/api/v1/nonexistent-endpoint`);
    const notFoundJson = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 &&
        notFoundJson.success === false &&
        notFoundJson.statusCode === 404 &&
        notFoundJson.message.includes('not found'),
      'Unknown route returns centralized 404 error envelope',
      `Body: ${JSON.stringify(notFoundJson)}`
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`ENDPOINT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndpointTests().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
