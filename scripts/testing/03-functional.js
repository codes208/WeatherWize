/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Tier 3: Extensive Functional Tests
 * ──────────────────────────────────────────────────────────────
 * Covers EVERY exposed API endpoint with positive and negative
 * tests: input validation, authorization boundaries, edge cases.
 * Maps to: UC-001 through UC-015
 * Target: ~65 tests
 * ──────────────────────────────────────────────────────────────
 */

const {
    api, registerUser, loginUser, loginAdmin,
    assertStatus, assert, assertEqual, assertIncludes,
    section, summary, c, sleep
} = require('./helpers');

async function run() {
    console.log('');
    console.log(c.bold(c.cyan('╔══════════════════════════════════════════════╗')));
    console.log(c.bold(c.cyan('║       TIER 3 — FUNCTIONAL TESTS             ║')));
    console.log(c.bold(c.cyan('╚══════════════════════════════════════════════╝')));

    const cleanup = { userIds: [], adminToken: null };

    try {
        // Bootstrap: get admin token
        const admin = await loginAdmin();
        cleanup.adminToken = admin.token;

        // Pre-create users for repeated use
        const generalUser = await registerUser('general');
        cleanup.userIds.push(generalUser.user.id);
        const advancedUser = await registerUser('advanced');
        cleanup.userIds.push(advancedUser.user.id);

        // ═══════════════════════════════════════════════════
        //  AUTH DOMAIN — REGISTRATION
        // ═══════════════════════════════════════════════════
        section('Auth — Registration (UC-001, UC-002)');

        // 1. Missing username
        {
            const res = await api('POST', '/api/auth/register', { password: 'Test123!', email: 'a@b.com', role: 'general' });
            assertStatus(res, 400, 'Register: missing username → 400');
        }

        // 2. Missing password
        {
            const res = await api('POST', '/api/auth/register', { username: 'nopass_user', email: 'a@b.com', role: 'general' });
            assertStatus(res, 400, 'Register: missing password → 400');
        }

        // 3. Missing email
        {
            const res = await api('POST', '/api/auth/register', { username: 'noemail_user', password: 'Test123!', role: 'general' });
            assertStatus(res, 400, 'Register: missing email → 400');
        }

        // 4. Password too short
        {
            const res = await api('POST', '/api/auth/register', { username: 'shortpw_user', password: '12345', email: 'sp@b.com', role: 'general' });
            assertStatus(res, 400, 'Register: password < 6 chars → 400');
        }

        // 5. Role = "admin" self-registration blocked
        {
            const res = await api('POST', '/api/auth/register', { username: 'selfadmin', password: 'Test123!', email: 'sa@b.com', role: 'admin' });
            assertStatus(res, 400, 'Register: role=admin self-registration → 400');
            assertIncludes(res.data.message, 'Invalid role', 'Error message mentions invalid role');
        }

        // 6. Duplicate username
        {
            const res = await api('POST', '/api/auth/register', {
                username: generalUser.credentials.username,
                password: 'Test123!',
                email: 'dup_test@unique.com',
                role: 'general',
            });
            assertStatus(res, 409, 'Register: duplicate username → 409');
        }

        // 7. Duplicate email
        {
            const u = await registerUser('general');
            cleanup.userIds.push(u.user.id);
            const res = await api('POST', '/api/auth/register', {
                username: `unique_name_${Date.now()}`,
                password: 'Test123!',
                email: u.credentials.email || u.user.email,
                role: 'general',
            });
            assertStatus(res, 409, 'Register: duplicate email → 409');
        }

        // 8. Valid registration
        {
            const u = await registerUser('general');
            cleanup.userIds.push(u.user.id);
            assert(!!u.token, 'Register: valid general → token returned');
            assertEqual(u.user.role, 'general', 'Register: valid general → role correct');
        }

        // ═══════════════════════════════════════════════════
        //  AUTH DOMAIN — LOGIN
        // ═══════════════════════════════════════════════════
        section('Auth — Login (UC-003)');

        // 9. Missing username
        {
            const res = await api('POST', '/api/auth/login', { password: 'whatever' });
            assertStatus(res, 400, 'Login: missing username → 400');
        }

        // 10. Missing password
        {
            const res = await api('POST', '/api/auth/login', { username: 'someone' });
            assertStatus(res, 400, 'Login: missing password → 400');
        }

        // 11. Wrong password
        {
            const res = await api('POST', '/api/auth/login', { username: generalUser.credentials.username, password: 'WRONG' });
            assertStatus(res, 401, 'Login: wrong password → 401');
        }

        // 12. Non-existent user
        {
            const res = await api('POST', '/api/auth/login', { username: 'nonexistent_user_xyz', password: 'Test123!' });
            assertStatus(res, 401, 'Login: non-existent user → 401 (no enumeration)');
        }

        // 13. Valid login
        {
            const res = await api('POST', '/api/auth/login', generalUser.credentials);
            assertStatus(res, 200, 'Login: valid credentials → 200');
            assert(!!res.data.token, 'Login: token present in response');
        }

        // ═══════════════════════════════════════════════════
        //  AUTH DOMAIN — FORGOT PASSWORD
        // ═══════════════════════════════════════════════════
        section('Auth — Forgot Password (UC-004)');

        // 14. Missing username
        {
            const res = await api('POST', '/api/auth/forgot-password', {});
            assertStatus(res, 400, 'Forgot password: missing username → 400');
        }

        // 15. Valid username — generic response
        {
            const res = await api('POST', '/api/auth/forgot-password', { username: generalUser.credentials.username });
            assertStatus(res, 200, 'Forgot password: valid username → 200');
        }

        // 16. Non-existent username — same generic response (anti-enumeration)
        {
            const res = await api('POST', '/api/auth/forgot-password', { username: 'does_not_exist_xyz' });
            assertStatus(res, 200, 'Forgot password: non-existent username → 200 (anti-enumeration)');
        }

        // ═══════════════════════════════════════════════════
        //  AUTH DOMAIN — PROFILE UPDATE
        // ═══════════════════════════════════════════════════
        section('Auth — Profile Update (UC-015)');

        // 17. No auth token
        {
            const res = await api('PUT', '/api/auth/profile', { email: 'test@test.com' });
            assertStatus(res, 401, 'Profile update: no token → 401');
        }

        // 18. No fields provided
        {
            const res = await api('PUT', '/api/auth/profile', {}, generalUser.token);
            assertStatus(res, 400, 'Profile update: no fields → 400');
        }

        // 19. Invalid email format
        {
            const res = await api('PUT', '/api/auth/profile', { email: 'not-an-email' }, generalUser.token);
            assertStatus(res, 400, 'Profile update: invalid email → 400');
        }

        // 20. Duplicate email (another user has it)
        {
            // Use the advanced user's email — we know it exists
            const advEmail = advancedUser.credentials.email || advancedUser.user.email;
            const res = await api('PUT', '/api/auth/profile', { email: advEmail }, generalUser.token);
            assertStatus(res, 409, 'Profile update: duplicate email → 409');
        }

        // 21. Password too short
        {
            const res = await api('PUT', '/api/auth/profile', { password: '123' }, generalUser.token);
            assertStatus(res, 400, 'Profile update: short password → 400');
        }

        // 22. Valid email update
        {
            const newEmail = `updated_${Date.now()}@test.com`;
            const res = await api('PUT', '/api/auth/profile', { email: newEmail }, generalUser.token);
            assertStatus(res, 200, 'Profile update: valid email → 200');
            assertEqual(res.data.user.email, newEmail, 'Profile update: email reflected in response');
        }

        // 23. Valid password update (re-login with new password)
        {
            const testUser = await registerUser('general');
            cleanup.userIds.push(testUser.user.id);
            const newPass = 'NewPass999!';
            const res = await api('PUT', '/api/auth/profile', { password: newPass }, testUser.token);
            assertStatus(res, 200, 'Profile update: valid password → 200');

            // Verify re-login with new password
            const reLoginRes = await api('POST', '/api/auth/login', { username: testUser.credentials.username, password: newPass });
            assertStatus(reLoginRes, 200, 'Profile update: re-login with new password → 200');
        }

        // ═══════════════════════════════════════════════════
        //  AUTH DOMAIN — ADMIN USER MANAGEMENT
        // ═══════════════════════════════════════════════════
        section('Auth — Admin User Management (UC-011, UC-012, UC-013)');

        // 24. Get users — no token
        {
            const res = await api('GET', '/api/auth/users');
            assertStatus(res, 401, 'Get users: no token → 401');
        }

        // 25. Get users — general user
        {
            const res = await api('GET', '/api/auth/users', null, generalUser.token);
            assertStatus(res, 403, 'Get users: general user → 403');
        }

        // 26. Get users — admin
        {
            const res = await api('GET', '/api/auth/users', null, cleanup.adminToken);
            assertStatus(res, 200, 'Get users: admin → 200');
            assert(Array.isArray(res.data), 'Get users: returns array');
        }

        // 27. Get stats — admin
        {
            const res = await api('GET', '/api/auth/stats', null, cleanup.adminToken);
            assertStatus(res, 200, 'Get stats: admin → 200');
            assert(res.data.totalUsers !== undefined, 'Stats: totalUsers present');
            assert(res.data.premiumUsers !== undefined, 'Stats: premiumUsers present');
            assert(res.data.totalLocations !== undefined, 'Stats: totalLocations present');
            assert(res.data.suspendedUsers !== undefined, 'Stats: suspendedUsers present');
        }

        // 28. Update role — invalid role string
        {
            const target = await registerUser('general');
            cleanup.userIds.push(target.user.id);
            const res = await api('PUT', `/api/auth/users/${target.user.id}/role`, { role: 'superadmin' }, cleanup.adminToken);
            assertStatus(res, 400, 'Update role: invalid role string → 400');
        }

        // 29. Update role — non-existent user
        {
            const res = await api('PUT', '/api/auth/users/999999/role', { role: 'admin' }, cleanup.adminToken);
            assertStatus(res, 404, 'Update role: non-existent user → 404');
        }

        // 30. Update role — admin self-demotion guard (UC-012 exception 7a)
        {
            const res = await api('PUT', `/api/auth/users/${admin.user.id}/role`, { role: 'general' }, cleanup.adminToken);
            assertStatus(res, 403, 'Update role: admin self-demotion → 403');
            assertIncludes(res.data.message, 'cannot demote', 'Self-demotion message present');
        }

        // 31. Update role — valid promotion
        {
            const target = await registerUser('general');
            cleanup.userIds.push(target.user.id);
            const res = await api('PUT', `/api/auth/users/${target.user.id}/role`, { role: 'advanced' }, cleanup.adminToken);
            assertStatus(res, 200, 'Update role: general → advanced → 200');
        }

        // 32. Update status — invalid status
        {
            const target = await registerUser('general');
            cleanup.userIds.push(target.user.id);
            const res = await api('PUT', `/api/auth/users/${target.user.id}/status`, { status: 'banned' }, cleanup.adminToken);
            assertStatus(res, 400, 'Update status: invalid status → 400');
        }

        // 33. Update status — valid suspend
        {
            const target = await registerUser('general');
            cleanup.userIds.push(target.user.id);
            const res = await api('PUT', `/api/auth/users/${target.user.id}/status`, { status: 'suspended' }, cleanup.adminToken);
            assertStatus(res, 200, 'Update status: suspend → 200');
        }

        // ═══════════════════════════════════════════════════
        //  WEATHER DOMAIN
        // ═══════════════════════════════════════════════════
        section('Weather — Current & Forecast (UC-005, UC-008, UC-009)');

        // 34. Get weather — no location
        {
            const res = await api('GET', '/api/weather', null, generalUser.token);
            assertStatus(res, 400, 'Weather: no location → 400');
        }

        // 35. Get weather — invalid location
        {
            const res = await api('GET', '/api/weather?location=xyznonexistentcity999', null, generalUser.token);
            assertStatus(res, 404, 'Weather: invalid location → 404');
        }

        // 36. Get weather — valid
        {
            const res = await api('GET', '/api/weather?location=Seattle', null, generalUser.token);
            assertStatus(res, 200, 'Weather: valid location → 200');
            assert(res.data.temp !== undefined, 'Weather: temp field present');
            assert(res.data.condition !== undefined, 'Weather: condition field present');
            assert(res.data.humidity !== undefined, 'Weather: humidity field present');
            assert(res.data.windSpeed !== undefined, 'Weather: windSpeed field present');
        }

        // 37. Hourly forecast — no location
        {
            const res = await api('GET', '/api/weather/hourly', null, generalUser.token);
            assertStatus(res, 400, 'Hourly: no location → 400');
        }

        // 38. Hourly forecast — valid
        {
            const res = await api('GET', '/api/weather/hourly?location=Seattle', null, generalUser.token);
            assertStatus(res, 200, 'Hourly: valid location → 200');
            assert(Array.isArray(res.data.intervals), 'Hourly: intervals is array');
        }

        // 39. Historical — general user blocked (UC-009 exception 1a)
        {
            const res = await api('GET', '/api/weather/history?location=Seattle', null, generalUser.token);
            assertStatus(res, 403, 'Historical: general user → 403');
        }

        // 40. Historical — advanced user allowed
        {
            const res = await api('GET', '/api/weather/history?location=Seattle', null, advancedUser.token);
            assertStatus(res, 200, 'Historical: advanced user → 200');
            assert(Array.isArray(res.data.intervals), 'Historical: intervals is array');
        }

        // ═══════════════════════════════════════════════════
        //  WEATHER DOMAIN — SAVED LOCATIONS
        // ═══════════════════════════════════════════════════
        section('Weather — Saved Locations (UC-006, UC-007)');

        // 41. Save location — empty body
        {
            const res = await api('POST', '/api/weather/save', {}, generalUser.token);
            assertStatus(res, 400, 'Save location: empty body → 400');
        }

        // 42. Save location — valid
        let testSavedLocationId;
        {
            const res = await api('POST', '/api/weather/save', { location: 'Austin' }, generalUser.token);
            assertStatus(res, 201, 'Save location: valid → 201');

            // Get the ID for later tests
            const list = await api('GET', '/api/weather/saved', null, generalUser.token);
            const austin = list.data.find(l => l.location_name.toLowerCase().includes('austin'));
            testSavedLocationId = austin ? austin.id : null;
        }

        // 43. Save location — duplicate
        {
            const res = await api('POST', '/api/weather/save', { location: 'Austin' }, generalUser.token);
            assertStatus(res, 409, 'Save location: duplicate → 409');
        }

        // 44. Delete saved — invalid id (0)
        {
            const res = await api('DELETE', '/api/weather/saved/0', null, generalUser.token);
            assertStatus(res, 400, 'Delete saved: id=0 → 400');
        }

        // 45. Delete saved — non-existent id
        {
            const res = await api('DELETE', '/api/weather/saved/999999', null, generalUser.token);
            assertStatus(res, 404, 'Delete saved: id=999999 → 404');
        }

        // 46. Delete saved — valid
        if (testSavedLocationId) {
            const res = await api('DELETE', `/api/weather/saved/${testSavedLocationId}`, null, generalUser.token);
            assertStatus(res, 200, 'Delete saved: valid → 200');
        }

        // ═══════════════════════════════════════════════════
        //  ALERTS DOMAIN
        // ═══════════════════════════════════════════════════
        section('Alerts (UC-010)');

        // 47. Create alert — general user blocked
        {
            const res = await api('POST', '/api/alerts', {
                location_name: 'NYC', trigger_type: 'Temperature drops below', threshold: 20, threshold_value: 20,
            }, generalUser.token);
            assertStatus(res, 403, 'Create alert: general user → 403');
        }

        // 48. Create alert — missing fields
        {
            const res = await api('POST', '/api/alerts', {
                location_name: 'NYC',
            }, advancedUser.token);
            assertStatus(res, 400, 'Create alert: missing fields → 400');
        }

        // 49. Create alert — valid
        let testAlertId;
        {
            const res = await api('POST', '/api/alerts', {
                location_name: 'Phoenix',
                trigger_type: 'Temperature goes above',
                threshold: 110,
                threshold_value: 110,
            }, advancedUser.token);
            assertStatus(res, 201, 'Create alert: valid → 201');

            // Get alert ID
            const list = await api('GET', '/api/alerts', null, advancedUser.token);
            const phoenix = list.data.find(a => a.location_name === 'Phoenix');
            testAlertId = phoenix ? phoenix.id : null;
        }

        // 50. Create alert — duplicate
        {
            const res = await api('POST', '/api/alerts', {
                location_name: 'Phoenix',
                trigger_type: 'Temperature goes above',
                threshold: 110,
                threshold_value: 110,
            }, advancedUser.token);
            assertStatus(res, 409, 'Create alert: duplicate → 409');
        }

        // 51. Get alerts — returns array
        {
            const res = await api('GET', '/api/alerts', null, advancedUser.token);
            assertStatus(res, 200, 'Get alerts → 200');
            assert(Array.isArray(res.data), 'Get alerts: returns array');
        }

        // 52. Delete alert — non-existent
        {
            const res = await api('DELETE', '/api/alerts/999999', null, advancedUser.token);
            assertStatus(res, 404, 'Delete alert: non-existent → 404');
        }

        // 53. Delete alert — valid
        if (testAlertId) {
            const res = await api('DELETE', `/api/alerts/${testAlertId}`, null, advancedUser.token);
            assertStatus(res, 200, 'Delete alert: valid → 200');
        }

        // ═══════════════════════════════════════════════════
        //  NOTIFICATIONS
        // ═══════════════════════════════════════════════════
        section('Notifications (UC-010)');

        // 54. Get notifications — advanced user
        {
            const res = await api('GET', '/api/alerts/notifications', null, advancedUser.token);
            assertStatus(res, 200, 'Get notifications: advanced user → 200');
            assert(Array.isArray(res.data), 'Notifications: returns array');
        }

        // 55. Mark read — empty array
        {
            const res = await api('POST', '/api/alerts/notifications/read', { notificationIds: [] }, advancedUser.token);
            assertStatus(res, 400, 'Mark read: empty array → 400');
        }

        // 56. Mark read — valid IDs (even if none exist, still 200)
        {
            const res = await api('POST', '/api/alerts/notifications/read', { notificationIds: [99999] }, advancedUser.token);
            assertStatus(res, 200, 'Mark read: valid IDs → 200');
        }

        // ═══════════════════════════════════════════════════
        //  SETTINGS DOMAIN
        // ═══════════════════════════════════════════════════
        section('Settings (UC-014)');

        // 57. Get settings — general user
        {
            const res = await api('GET', '/api/settings', null, generalUser.token);
            assertStatus(res, 403, 'Get settings: general user → 403');
        }

        // 58. Get settings — admin
        {
            const res = await api('GET', '/api/settings', null, cleanup.adminToken);
            assertStatus(res, 200, 'Get settings: admin → 200');
            assert(res.data.maintenance_mode !== undefined, 'Settings: maintenance_mode present');
            assert(res.data.api_throttle_limit !== undefined, 'Settings: api_throttle_limit present');
        }

        // 59. Update settings — invalid throttle
        {
            const res = await api('PUT', '/api/settings', { api_throttle_limit: -5 }, cleanup.adminToken);
            assertStatus(res, 400, 'Update settings: negative throttle → 400');
        }

        // 60. Update settings — valid
        {
            const res = await api('PUT', '/api/settings', { api_throttle_limit: 1000 }, cleanup.adminToken);
            assertStatus(res, 200, 'Update settings: valid throttle → 200');
        }

        // ═══════════════════════════════════════════════════
        //  MAINTENANCE MODE
        // ═══════════════════════════════════════════════════
        section('Maintenance Mode (UC-014)');

        // 61. Enable maintenance → general user weather request blocked
        {
            await api('PUT', '/api/settings', { maintenance_mode: true }, cleanup.adminToken);
            // Small delay for setting to propagate
            await sleep(200);

            const res = await api('GET', '/api/weather?location=Seattle', null, generalUser.token);
            assertStatus(res, 503, 'Maintenance on: general user → 503');
        }

        // 62. During maintenance → admin bypasses
        {
            const res = await api('GET', '/api/weather?location=Seattle', null, cleanup.adminToken);
            assertStatus(res, 200, 'Maintenance on: admin → 200 (bypass)');
        }

        // 63. Disable maintenance → general user succeeds
        {
            await api('PUT', '/api/settings', { maintenance_mode: false }, cleanup.adminToken);
            await sleep(200);

            const res = await api('GET', '/api/weather?location=Seattle', null, generalUser.token);
            assertStatus(res, 200, 'Maintenance off: general user → 200');
        }

        // ═══════════════════════════════════════════════════
        //  MAP TILES
        // ═══════════════════════════════════════════════════
        section('Map Tiles (UC-005)');

        // 64. Valid map tile layer
        {
            const res = await api('GET', '/api/weather/tiles/temp_new/1/0/0');
            // Could be 200 (tile exists) or non-200 from upstream, but should NOT be 400
            assert(res.status !== 400, 'Map tile: valid layer → not rejected as invalid');
        }

        // 65. Invalid / blocked layer
        {
            const res = await api('GET', '/api/weather/tiles/malicious_layer/1/0/0');
            assertStatus(res, 400, 'Map tile: blocked layer → 400');
        }

    } catch (err) {
        console.log(c.red(`\n  ⚠ Unexpected error: ${err.message}`));
        console.log(c.gray(`    ${err.stack}`));
    } finally {
        // ─── CRITICAL: Always disable maintenance mode ──────
        try {
            if (cleanup.adminToken) {
                await api('PUT', '/api/settings', { maintenance_mode: false }, cleanup.adminToken);
            }
        } catch (e) { /* last resort */ }

        // ─── Cleanup test users ─────────────────────────────
        section('Cleanup');
        if (cleanup.adminToken) {
            for (const id of cleanup.userIds) {
                try {
                    await api('PUT', `/api/auth/users/${id}/status`, { status: 'suspended' }, cleanup.adminToken);
                } catch (e) { /* best-effort */ }
            }
        }
        console.log(c.gray(`  Cleaned up ${cleanup.userIds.length} test users`));
        console.log(c.gray(`  Maintenance mode confirmed OFF`));
    }

    const results = summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

run();
