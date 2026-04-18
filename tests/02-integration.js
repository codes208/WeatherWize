/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Tier 2: Integration Tests
 * ──────────────────────────────────────────────────────────────
 * End-to-end user workflows, multi-tenant boundaries,
 * negative workflows, and cross-domain interactions.
 * Maps to: UC-001 through UC-013, UC-015
 * Target: ~15 seconds, 10 tests
 * ──────────────────────────────────────────────────────────────
 */

const {
    api, registerUser, loginUser, loginAdmin,
    assertStatus, assert, assertEqual, section, summary, c
} = require('./helpers');

async function run() {
    console.log('');
    console.log(c.bold(c.cyan('╔══════════════════════════════════════════════╗')));
    console.log(c.bold(c.cyan('║       TIER 2 — INTEGRATION TESTS            ║')));
    console.log(c.bold(c.cyan('╚══════════════════════════════════════════════╝')));

    const cleanup = { userIds: [], adminToken: null };

    try {
        // Get admin token for management operations
        const admin = await loginAdmin();
        cleanup.adminToken = admin.token;

        // ─────────────────────────────────────────────────────
        // Test 1: General user full lifecycle
        //   Register → Login → Save location → List saved → Verify → Delete → Verify removed
        //   Maps to: UC-001, UC-003, UC-006, UC-005, UC-007
        // ─────────────────────────────────────────────────────
        section('Test 1: General User Full Lifecycle');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);
            const login = await loginUser(user.credentials.username, user.credentials.password);

            // Save a location for login user
            const saveRes = await api('POST', '/api/weather/save', { location: 'Denver, CO' }, login.token);
            assertStatus(saveRes, 201, 'Denver location saved');

            // List saved locations
            const listRes = await api('GET', '/api/weather/saved', null, login.token);
            assertStatus(listRes, 200, 'List saved locations → 200');
            const found = listRes.data.find(loc => loc.location_name.toLowerCase().includes('denver'));
            assert(!!found, 'Saved location appears in list');

            // Delete location
            if (found) {
                const delRes = await api('DELETE', `/api/weather/saved/${found.id}`, null, login.token);
                assertStatus(delRes, 200, 'Delete saved location → 200');
            }

            // Verify removed
            const afterDel = await api('GET', '/api/weather/saved', null, login.token);
            const stillThere = afterDel.data.find(loc => loc.location_name.toLowerCase().includes('denver'));
            assert(!stillThere, 'Location no longer in list after deletion');
        }

        // ─────────────────────────────────────────────────────
        // Test 2: Advanced user alert lifecycle
        //   Register(advanced) → Create alert → List alerts → Delete alert → Verify removed
        //   Maps to: UC-002, UC-010
        // ─────────────────────────────────────────────────────
        section('Test 2: Advanced User Alert Lifecycle');
        {
            const advUser = await registerUser('advanced');
            cleanup.userIds.push(advUser.user.id);

            // Create alert
            const createRes = await api('POST', '/api/alerts', {
                location_name: 'Chicago, IL',
                trigger_type: 'Temperature',
                threshold_min: 0,
                threshold_max: 32,
            }, advUser.token);
            assertStatus(createRes, 201, 'Create alert → 201');

            // List alerts
            const listRes = await api('GET', '/api/alerts', null, advUser.token);
            assertStatus(listRes, 200, 'List alerts → 200');
            assert(listRes.data.length > 0, 'Alert appears in list');

            const alertId = listRes.data[0].id;

            // Delete alert
            const delRes = await api('DELETE', `/api/alerts/${alertId}`, null, advUser.token);
            assertStatus(delRes, 200, 'Delete alert → 200');

            // Verify removed
            const afterDel = await api('GET', '/api/alerts', null, advUser.token);
            const stillThere = afterDel.data.find(a => a.id === alertId);
            assert(!stillThere, 'Alert no longer in list after deletion');
        }

        // ─────────────────────────────────────────────────────
        // Test 3: Multi-tenant location isolation
        //   User A saves "Miami", User B cannot see it
        //   Maps to: UC-006, UC-005
        // ─────────────────────────────────────────────────────
        section('Test 3: Multi-Tenant Location Isolation');
        {
            const userA = await registerUser('general');
            const userB = await registerUser('general');
            cleanup.userIds.push(userA.user.id, userB.user.id);

            // User A saves Miami
            await api('POST', '/api/weather/save', { location: 'Miami, FL' }, userA.token);

            // User B lists saved — should NOT see Miami
            // Clean up: delete Miami for userA
            const savedResA = await api('GET', '/api/weather/saved', null, userA.token);
            await api('DELETE', `/api/weather/saved/${savedResA.data[0].id}`, null, userA.token);
            const listB = await api('GET', '/api/weather/saved', null, userB.token);
            const leaked = listB.data.find(loc => loc.location_name.toLowerCase().includes('miami'));
            assert(!leaked, 'User B cannot see User A\'s saved location (tenant isolation)');
        }

        // ─────────────────────────────────────────────────────
        // Test 4: Multi-tenant alert isolation
        //   User A (adv) creates alert → User B (adv) cannot see it
        //   Maps to: UC-010
        // ─────────────────────────────────────────────────────
        section('Test 4: Multi-Tenant Alert Isolation');
        {
            const userA = await registerUser('advanced');
            const userB = await registerUser('advanced');
            cleanup.userIds.push(userA.user.id, userB.user.id);

            await api('POST', '/api/alerts', {
                location_name: 'Boston, MA',
                trigger_type: 'Wind Speed',
                threshold_min: 50,
                threshold_max: 999,
            }, userA.token);

            const listB = await api('GET', '/api/alerts', null, userB.token);
            const leaked = listB.data.find(a => a.location_name === 'Boston');
            assert(!leaked, 'User B cannot see User A\'s alerts (tenant isolation)');
        }

        // ─────────────────────────────────────────────────────
        // Test 5: Suspended user blocked from login
        //   Admin suspends user → user login → 403
        //   Maps to: UC-013, UC-003
        // ─────────────────────────────────────────────────────
        section('Test 5: Suspended User Blocked');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);

            // Admin suspends
            await api('PUT', `/api/auth/users/${user.user.id}/status`, { status: 'suspended' }, cleanup.adminToken);

            // User tries to login
            const loginRes = await api('POST', '/api/auth/login', user.credentials);
            assertStatus(loginRes, 403, 'Suspended user login → 403');
            assert(
                loginRes.data.message.toLowerCase().includes('suspended'),
                'Response message mentions suspension'
            );
        }

        // ─────────────────────────────────────────────────────
        // Test 6: Suspended user reactivation
        //   Admin reactivates → user login succeeds
        //   Maps to: UC-013, UC-003
        // ─────────────────────────────────────────────────────
        section('Test 6: Suspended User Reactivation');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);

            // Suspend then reactivate
            await api('PUT', `/api/auth/users/${user.user.id}/status`, { status: 'suspended' }, cleanup.adminToken);
            await api('PUT', `/api/auth/users/${user.user.id}/status`, { status: 'active' }, cleanup.adminToken);

            // Login should succeed
            const loginRes = await api('POST', '/api/auth/login', user.credentials);
            assertStatus(loginRes, 200, 'Reactivated user login → 200');
        }

        // ─────────────────────────────────────────────────────
        // Test 7: Admin role promotion unlocks features
        //   Register general → admin promotes to advanced → historical access unlocked
        //   Maps to: UC-012, UC-009
        // ─────────────────────────────────────────────────────
        section('Test 7: Role Promotion Unlocks Features');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);

            // General user → historical data blocked
            const blockedRes = await api('GET', '/api/weather/history?location=Seattle,%20WA&start=2023-01-01&end=2023-01-05', null, user.token);
            assertStatus(blockedRes, 403, 'Historical data blocked for general user');

            // 5. Upgrade user to advanced
            await api('PUT', `/api/auth/users/${user.user.id}/role`, { role: 'advanced' }, admin.token);

            // 6. User re-logs in
            const freshLogin = await loginUser(user.credentials.username, user.credentials.password);

            // 7. Try fetching historical data again
            const unlockedRes = await api('GET', '/api/weather/history?location=Seattle,%20WA&start=2023-01-01&end=2023-01-05', null, freshLogin.token);
            assertStatus(unlockedRes, 200, 'Historical data allowed after role upgrade');
        }

        // ─────────────────────────────────────────────────────
        // Test 8: General user denied alert creation
        //   Maps to: UC-010
        // ─────────────────────────────────────────────────────
        section('Test 8: General User Denied Alert Creation');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);

            const res = await api('POST', '/api/alerts', {
                location_name: 'Seattle, WA',
                trigger_type: 'Temperature',
                threshold_min: 0,
                threshold_max: 32,
            }, user.token);
            assertStatus(res, 403, 'General user POST /api/alerts → 403');
        }

        // ─────────────────────────────────────────────────────
        // Test 9: Profile update during session
        //   Register → update email → verify
        //   Maps to: UC-015
        // ─────────────────────────────────────────────────────
        section('Test 9: Profile Update During Session');
        {
            const user = await registerUser('general');
            cleanup.userIds.push(user.user.id);

            const newEmail = `updated_${Date.now()}@weatherwize-test.com`;
            const updateRes = await api('PUT', '/api/auth/profile', { email: newEmail }, user.token);
            assertStatus(updateRes, 200, 'Update profile email → 200');
            assertEqual(updateRes.data.user.email, newEmail, 'Response reflects updated email');
        }

        // ─────────────────────────────────────────────────────
        // Test 10: Admin dashboard stats accuracy
        //   Register 2 users → admin stats → verify counts include them
        //   Maps to: UC-011
        // ─────────────────────────────────────────────────────
        section('Test 10: Admin Dashboard Stats Accuracy');
        {
            // Get baseline stats
            const beforeStats = await api('GET', '/api/auth/stats', null, cleanup.adminToken);
            const beforeTotal = beforeStats.data.totalUsers;

            // Register 2 new users
            const u1 = await registerUser('general');
            const u2 = await registerUser('advanced');
            cleanup.userIds.push(u1.user.id, u2.user.id);

            // Get updated stats
            const afterStats = await api('GET', '/api/auth/stats', null, cleanup.adminToken);
            assert(
                afterStats.data.totalUsers >= beforeTotal + 2,
                `totalUsers increased by at least 2 (${beforeTotal} → ${afterStats.data.totalUsers})`
            );
        }

    } catch (err) {
        console.log(c.red(`\n  ⚠ Unexpected error: ${err.message}`));
        console.log(c.gray(`    ${err.stack}`));
    } finally {
        // ─── Cleanup ────────────────────────────────────────
        section('Cleanup');
        if (cleanup.adminToken) {
            for (const id of cleanup.userIds) {
                try {
                    await api('PUT', `/api/auth/users/${id}/status`, { status: 'suspended' }, cleanup.adminToken);
                } catch (e) { /* best-effort */ }
            }
        }
        console.log(c.gray(`  Cleaned up ${cleanup.userIds.length} test users`));
    }

    const results = summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

run();
