/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Tier 1: Smoke Tests
 * ──────────────────────────────────────────────────────────────
 * Quick verification of the most critical workflows.
 * Maps to: UC-001, UC-003, UC-005, UC-006, UC-009, UC-012
 * Target: <10 seconds, 8 tests
 * ──────────────────────────────────────────────────────────────
 */

const {
    api, registerUser, loginAdmin, assertStatus, assert, section, summary, c
} = require('./helpers');

async function run() {
    console.log('');
    console.log(c.bold(c.cyan('╔══════════════════════════════════════════════╗')));
    console.log(c.bold(c.cyan('║       TIER 1 — SMOKE TESTS                  ║')));
    console.log(c.bold(c.cyan('╚══════════════════════════════════════════════╝')));

    let generalToken = null;
    let generalUser = null;
    let adminToken = null;
    let savedLocationId = null;

    try {
        // ─── Registration & Auth ────────────────────────────
        section('Registration & Authentication');

        // Test 1: Register a general user (UC-001)
        const reg = await registerUser('general');
        generalToken = reg.token;
        generalUser = reg.user;
        assert(!!generalToken && !!generalUser, 'Register general user → 201 + token returned');

        // Test 2: Login with the new user (UC-003)
        const loginRes = await api('POST', '/api/auth/login', reg.credentials);
        assertStatus(loginRes, 200, 'Login with registered user → 200');
        generalToken = loginRes.data.token; // refresh token

        // ─── Core Weather ───────────────────────────────────
        section('Core Weather Functionality');

        // Test 3: Fetch current weather (UC-005)
        const weatherRes = await api('GET', '/api/weather?location=Seattle,%20WA', null, generalToken);
        assertStatus(weatherRes, 200, 'Fetch current weather for Seattle → 200');
        assert(
            weatherRes.data.temp !== undefined && weatherRes.data.condition !== undefined,
            'Weather response contains temp and condition fields'
        );

        // Test 4: Save a location (UC-006)
        const saveRes = await api('POST', '/api/weather/save', { location: 'Portland, OR' }, generalToken);
        assertStatus(saveRes, 201, 'Save location (Portland, OR) → 201');

        // Grab location ID for cleanup
        const savedRes = await api('GET', '/api/weather/saved', null, generalToken);
        if (savedRes.data && savedRes.data.length > 0) {
            savedLocationId = savedRes.data[savedRes.data.length - 1].id;
        }

        // ─── Admin & RBAC ───────────────────────────────────
        section('Admin & RBAC');

        // Test 5: Admin login (UC-003)
        const admin = await loginAdmin();
        adminToken = admin.token;
        assert(admin.user.role === 'admin', 'Admin login → role = admin');

        // Test 6: Admin can list all users (UC-012)
        const usersRes = await api('GET', '/api/auth/users', null, adminToken);
        assertStatus(usersRes, 200, 'Admin GET /api/auth/users → 200');
        assert(Array.isArray(usersRes.data), 'Users response is an array');

        // Test 7: General user blocked from admin endpoint (UC-012)
        const blockedRes = await api('GET', '/api/auth/users', null, generalToken);
        assertStatus(blockedRes, 403, 'General user GET /api/auth/users → 403 (RBAC)');

        // Test 8: General user blocked from historical data (UC-009)
        const histRes = await api('GET', '/api/weather/history?location=Seattle,%20WA', null, generalToken);
        assertStatus(histRes, 403, 'General user GET /api/weather/history → 403 (RBAC)');

    } catch (err) {
        console.log(c.red(`\n  ⚠ Unexpected error: ${err.message}`));
    } finally {
        // ─── Cleanup ────────────────────────────────────────
        section('Cleanup');
        try {
            if (savedLocationId && generalToken) {
                await api('DELETE', `/api/weather/saved/${savedLocationId}`, null, generalToken);
            }
            if (generalUser && adminToken) {
                await api('PUT', `/api/auth/users/${generalUser.id}/status`, { status: 'suspended' }, adminToken);
            }
            console.log(c.gray('  Test data cleaned up'));
        } catch (e) {
            console.log(c.yellow('  ⚠ Cleanup warning: ' + e.message));
        }
    }

    const results = summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

run();
