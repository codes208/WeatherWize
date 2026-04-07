/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Tier 5: Stress & Load Tests
 * ──────────────────────────────────────────────────────────────
 * High-concurrency bursts to find breaking points, deadlocks,
 * and verify rate limiting behavior.
 *
 * Environment Variables:
 *   STRESS_WORKERS    — Concurrent workers per burst (default: 20)
 *   STRESS_BURST_SIZE — Total requests per burst (default: 50)
 * ──────────────────────────────────────────────────────────────
 */

const {
    api, registerUser, loginUser, loginAdmin,
    assert, assertStatus, section, summary, percentile, c, sleep
} = require('./helpers');

const WORKERS = parseInt(process.env.STRESS_WORKERS) || 20;
const BURST_SIZE = parseInt(process.env.STRESS_BURST_SIZE) || 50;
const CITIES = ['Seattle', 'Portland', 'Denver', 'Chicago', 'Miami', 'Houston', 'Phoenix', 'Dallas', 'Atlanta', 'Boston'];

// ─── Helpers ────────────────────────────────────────────────

/**
 * Run N concurrent async tasks, each returning a latency measurement.
 * @returns {Promise<{latencies: number[], results: object[]}>}
 */
async function burst(count, taskFn) {
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(taskFn(i));
    }
    const results = await Promise.allSettled(promises);

    const latencies = [];
    const responses = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
            latencies.push(r.value.latencyMs);
            responses.push(r.value);
        }
    }

    latencies.sort((a, b) => a - b);
    return { latencies, responses };
}

function formatStats(latencies) {
    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
    return {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
    };
}

function printTable(rows) {
    const colWidths = [22, 8, 8, 8, 9];
    const headers = ['Phase', 'P50', 'P95', 'P99', 'Errors'];

    const hr = '┼' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┼';
    const topHr = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐';
    const botHr = '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

    console.log('  ' + topHr);
    console.log('  │' + headers.map((h, i) => h.padStart(colWidths[i] - 1).padEnd(colWidths[i])).join('│') + '│');
    console.log('  ├' + hr.slice(1));

    for (const row of rows) {
        const cells = [
            row.phase.padEnd(colWidths[0]),
            `${row.p50}ms`.padStart(colWidths[1] - 1).padEnd(colWidths[1]),
            `${row.p95}ms`.padStart(colWidths[2] - 1).padEnd(colWidths[2]),
            `${row.p99}ms`.padStart(colWidths[3] - 1).padEnd(colWidths[3]),
            `${row.errors}`.padStart(colWidths[4] - 1).padEnd(colWidths[4]),
        ];
        console.log('  │' + cells.join('│') + '│');
    }

    console.log('  ' + botHr);
}

async function run() {
    console.log('');
    console.log(c.bold(c.cyan('╔══════════════════════════════════════════════╗')));
    console.log(c.bold(c.cyan('║       TIER 5 — STRESS & LOAD TESTS          ║')));
    console.log(c.bold(c.cyan('╚══════════════════════════════════════════════╝')));
    console.log('');
    console.log(c.gray(`  Workers:    ${WORKERS}`));
    console.log(c.gray(`  Burst size: ${BURST_SIZE}`));

    const cleanup = { userIds: [], adminToken: null };
    const tableRows = [];
    let originalThrottle = 500;

    try {
        // ─── Bootstrap ──────────────────────────────────────
        section('Bootstrap');
        const admin = await loginAdmin();
        cleanup.adminToken = admin.token;

        // Save original throttle limit and raise it temporarily
        const settingsRes = await api('GET', '/api/settings', null, admin.token);
        if (settingsRes.data && settingsRes.data.api_throttle_limit) {
            originalThrottle = parseInt(settingsRes.data.api_throttle_limit) || 500;
        }
        await api('PUT', '/api/settings', { api_throttle_limit: 99999 }, admin.token);
        console.log(c.yellow(`  Throttle limit raised to 99999 (was ${originalThrottle})`));

        // Create a base user for login storm
        const baseUser = await registerUser('general');
        cleanup.userIds.push(baseUser.user.id);
        const advUser = await registerUser('advanced');
        cleanup.userIds.push(advUser.user.id);
        console.log(c.green('  Test users ready'));

        // ═══════════════════════════════════════════════════
        //  PHASE 1: Registration Burst
        // ═══════════════════════════════════════════════════
        section('Phase 1: Registration Burst');
        {
            const { latencies, responses } = await burst(BURST_SIZE, async (i) => {
                return await api('POST', '/api/auth/register', {
                    username: `stress_reg_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                    password: 'StressTest123!',
                    email: `stress_reg_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}@test.com`,
                    role: 'general',
                });
            });

            const stats = formatStats(latencies);
            const errors = responses.filter(r => r.status !== 201).length;

            // Track user IDs for cleanup
            for (const r of responses) {
                if (r.status === 201 && r.data && r.data.user) {
                    cleanup.userIds.push(r.data.user.id);
                }
            }

            tableRows.push({ phase: 'Registration Burst', ...stats, errors });
            console.log(c.gray(`  ${responses.length} responses | P50=${stats.p50}ms P95=${stats.p95}ms P99=${stats.p99}ms | ${errors} errors`));

            assert(errors === 0, `Registration burst: zero errors (${errors} errors)`);
        }

        // ═══════════════════════════════════════════════════
        //  PHASE 2: Auth Storm (bcrypt-heavy)
        // ═══════════════════════════════════════════════════
        section('Phase 2: Auth Storm');
        {
            const { latencies, responses } = await burst(WORKERS, async () => {
                return await api('POST', '/api/auth/login', baseUser.credentials);
            });

            const stats = formatStats(latencies);
            const errors = responses.filter(r => r.status !== 200).length;

            tableRows.push({ phase: 'Auth Storm', ...stats, errors });
            console.log(c.gray(`  ${responses.length} responses | P50=${stats.p50}ms P95=${stats.p95}ms P99=${stats.p99}ms | ${errors} errors`));

            assert(errors === 0, `Auth storm: zero errors (${errors} errors)`);
        }

        // ═══════════════════════════════════════════════════
        //  PHASE 3: Mixed API Load
        // ═══════════════════════════════════════════════════
        section('Phase 3: Mixed API Load');
        {
            const { latencies, responses } = await burst(BURST_SIZE, async (i) => {
                const op = i % 4;
                const city = CITIES[i % CITIES.length];

                switch (op) {
                    case 0: return await api('GET', `/api/weather?location=${city}`, null, baseUser.token);
                    case 1: return await api('GET', '/api/auth/users', null, admin.token);
                    case 2: return await api('GET', '/api/weather/saved', null, baseUser.token);
                    case 3: return await api('GET', `/api/weather/hourly?location=${city}`, null, advUser.token);
                }
            });

            const stats = formatStats(latencies);
            const errors = responses.filter(r => r.status >= 500).length;

            tableRows.push({ phase: 'Mixed API Load', ...stats, errors });
            console.log(c.gray(`  ${responses.length} responses | P50=${stats.p50}ms P95=${stats.p95}ms P99=${stats.p99}ms | ${errors} server errors`));

            assert(errors === 0, `Mixed load: zero 5xx errors (${errors} errors)`);
        }

        // ═══════════════════════════════════════════════════
        //  PHASE 4: Rate Limit Verification
        // ═══════════════════════════════════════════════════
        section('Phase 4: Rate Limit Verification');
        {
            // Lower throttle to trigger rate limiting
            await api('PUT', '/api/settings', { api_throttle_limit: 10 }, admin.token);
            // Give the rate limiter a moment to pick up the new config
            await sleep(500);

            const { responses } = await burst(50, async () => {
                return await api('GET', '/api/weather?location=Seattle', null, baseUser.token);
            });

            const rateLimited = responses.filter(r => r.status === 429).length;
            const stats = formatStats(responses.map(r => r.latencyMs).sort((a, b) => a - b));

            tableRows.push({ phase: 'Rate Limit Check', ...stats, errors: `429s:${rateLimited}` });
            console.log(c.gray(`  ${responses.length} responses | ${rateLimited} rate-limited (429) | P50=${stats.p50}ms`));

            assert(rateLimited > 0, `Rate limiter activated: at least 1 x 429 received (got ${rateLimited})`);

            // CRITICAL: Raise throttle very high to neutralize the accumulated counter.
            // The in-memory rate limiter counter doesn't reset when you change the limit,
            // so we must set the limit high enough to exceed the counter for the remainder
            // of the 15-minute window. We restore the *original* value in the finally block.
            await api('PUT', '/api/settings', { api_throttle_limit: 99999 }, admin.token);
            console.log(c.yellow(`  Throttle limit raised to 99999 (counter neutralized)`));
        }

        // ═══════════════════════════════════════════════════
        //  Summary Table
        // ═══════════════════════════════════════════════════
        section('Performance Summary');
        printTable(tableRows);

    } catch (err) {
        console.log(c.red(`\n  ⚠ Unexpected error: ${err.message}`));
        console.log(c.gray(`    ${err.stack}`));
    } finally {
        // ─── CRITICAL: Restore throttle limit ───────────────
        try {
            if (cleanup.adminToken) {
                await api('PUT', '/api/settings', { api_throttle_limit: originalThrottle }, cleanup.adminToken);
            }
        } catch (e) { /* last resort */ }

        // ─── Cleanup test users ─────────────────────────────
        section('Cleanup');
        if (cleanup.adminToken) {
            let cleaned = 0;
            for (const id of cleanup.userIds) {
                try {
                    await api('PUT', `/api/auth/users/${id}/status`, { status: 'suspended' }, cleanup.adminToken);
                    cleaned++;
                } catch (e) { /* best-effort */ }
            }
            console.log(c.gray(`  Cleaned up ${cleaned}/${cleanup.userIds.length} test users`));
            console.log(c.gray(`  Throttle limit restored to ${originalThrottle}`));
        }
    }

    const results = summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

run();
