/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Tier 4: Stability (Soak) Tests
 * ──────────────────────────────────────────────────────────────
 * Runs continuous mixed traffic for a configurable duration to
 * detect memory leaks, latency degradation, and error drift.
 *
 * Environment Variables:
 *   SOAK_DURATION_MS       — Total soak duration (default: 120000 = 2 min)
 *   SOAK_INTERVAL_MS       — Delay between cycles (default: 500ms)
 *   LATENCY_THRESHOLD_PCT  — Max allowed degradation % (default: 50)
 * ──────────────────────────────────────────────────────────────
 */

const {
    api, registerUser, loginUser, loginAdmin,
    assert, section, summary, c, sleep
} = require('./helpers');

const SOAK_DURATION_MS = parseInt(process.env.SOAK_DURATION_MS) || 120_000; // 2 minutes
const SOAK_INTERVAL_MS = parseInt(process.env.SOAK_INTERVAL_MS) || 500;
const CITIES = (process.env.SOAK_CITIES || 'Seattle, WA;Portland, OR;Denver, CO;Chicago, IL;Miami, FL').split(';');
const LATENCY_THRESHOLD_PCT = parseInt(process.env.LATENCY_THRESHOLD_PCT) || 50;

// ─── Circular Buffer ────────────────────────────────────────
class LatencyBuffer {
    constructor(maxSize = 200) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    push(val) {
        if (this.buffer.length >= this.maxSize) this.buffer.shift();
        this.buffer.push(val);
    }
    first(n) { return this.buffer.slice(0, n); }
    last(n) { return this.buffer.slice(-n); }
    all() { return [...this.buffer]; }
    get length() { return this.buffer.length; }
}

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function run() {
    console.log('');
    console.log(c.bold(c.cyan('╔══════════════════════════════════════════════╗')));
    console.log(c.bold(c.cyan('║       TIER 4 — STABILITY (SOAK) TEST        ║')));
    console.log(c.bold(c.cyan('╚══════════════════════════════════════════════╝')));
    console.log('');
    console.log(c.gray(`  Duration:   ${(SOAK_DURATION_MS / 1000).toFixed(0)}s`));
    console.log(c.gray(`  Interval:   ${SOAK_INTERVAL_MS}ms`));
    console.log(c.gray(`  Threshold:  ${LATENCY_THRESHOLD_PCT}% degradation`));
    console.log(c.gray(`  Cities:     ${CITIES.join(', ')}`));

    const cleanup = { userIds: [], adminToken: null };
    const latencies = new LatencyBuffer(200);
    let totalRequests = 0;
    let errorCount = 0;
    let serverErrors = 0; // 5xx
    let originalThrottle = 500;

    try {
        // ─── Bootstrap ──────────────────────────────────────
        section('Bootstrap');
        const admin = await loginAdmin();
        cleanup.adminToken = admin.token;

        // Raise throttle to prevent rate limiting during soak
        const settingsRes = await api('GET', '/api/settings', null, admin.token);
        if (settingsRes.data && settingsRes.data.api_throttle_limit) {
            originalThrottle = parseInt(settingsRes.data.api_throttle_limit) || 500;
        }
        await api('PUT', '/api/settings', { api_throttle_limit: 99999 }, admin.token);
        console.log(c.yellow(`  Throttle limit raised to 99999 (was ${originalThrottle})`));

        const generalUser = await registerUser('general');
        cleanup.userIds.push(generalUser.user.id);
        const advancedUser = await registerUser('advanced');
        cleanup.userIds.push(advancedUser.user.id);

        console.log(c.green('  3 test sessions ready'));

        // ─── Soak Loop ──────────────────────────────────────
        section('Soak Loop');
        const startTime = Date.now();
        let lastStatusTime = startTime;
        let cycleCount = 0;

        while (Date.now() - startTime < SOAK_DURATION_MS) {
            cycleCount++;
            const city = CITIES[cycleCount % CITIES.length];

            // Choose random operation
            const op = cycleCount % 5;
            let res;

            try {
                switch (op) {
                    case 0: // Weather lookup
                        res = await api('GET', `/api/weather?location=${encodeURIComponent(city)}`, null, generalUser.token);
                        break;
                    case 1: // Login (bcrypt)
                        res = await api('POST', '/api/auth/login', generalUser.credentials);
                        break;
                    case 2: // List saved locations
                        res = await api('GET', '/api/weather/saved', null, generalUser.token);
                        break;
                    case 3: // Admin stats
                        res = await api('GET', '/api/auth/stats', null, admin.token);
                        break;
                    case 4: // Hourly forecast
                        res = await api('GET', `/api/weather/hourly?location=${encodeURIComponent(city)}`, null, advancedUser.token);
                        break;
                }

                totalRequests++;
                latencies.push(res.latencyMs);

                if (res.status >= 500) {
                    serverErrors++;
                    errorCount++;
                } else if (res.status === 429) {
                    // Rate limited — count but don't treat as error for soak
                } else if (res.status >= 400) {
                    // Client errors are unexpected in soak test
                    errorCount++;
                }
            } catch (e) {
                totalRequests++;
                errorCount++;
            }

            // ─── Status line every 10 seconds ───────────────
            if (Date.now() - lastStatusTime >= 10_000) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                const remaining = (((startTime + SOAK_DURATION_MS) - Date.now()) / 1000).toFixed(0);
                const avgLatency = mean(latencies.all()).toFixed(0);
                const rps = (totalRequests / (elapsed || 1)).toFixed(1);

                process.stdout.write(
                    `\r  ${c.cyan('⏱')} ${elapsed}s elapsed | ${remaining}s remaining | ` +
                    `${totalRequests} req | ${rps} rps | ` +
                    `avg ${avgLatency}ms | ${errorCount} errors   `
                );
                lastStatusTime = Date.now();
            }

            await sleep(SOAK_INTERVAL_MS);
        }

        // Clear status line
        process.stdout.write('\r' + ' '.repeat(100) + '\r');

        // ─── Results ────────────────────────────────────────
        section('Soak Results');

        const BASELINE_SIZE = 20;
        const baselineLatencies = latencies.first(BASELINE_SIZE);
        const finalLatencies = latencies.last(BASELINE_SIZE);
        const baselineAvg = mean(baselineLatencies);
        const finalAvg = mean(finalLatencies);
        const degradationPct = baselineAvg > 0 ? ((finalAvg - baselineAvg) / baselineAvg) * 100 : 0;
        const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

        console.log(c.gray(`  Total requests:    ${totalRequests}`));
        console.log(c.gray(`  Total errors:      ${errorCount} (${errorRate.toFixed(1)}%)`));
        console.log(c.gray(`  Server errors:     ${serverErrors}`));
        console.log(c.gray(`  Baseline latency:  ${baselineAvg.toFixed(0)}ms (first ${BASELINE_SIZE} requests)`));
        console.log(c.gray(`  Final latency:     ${finalAvg.toFixed(0)}ms (last ${BASELINE_SIZE} requests)`));
        console.log(c.gray(`  Degradation:       ${degradationPct.toFixed(1)}%`));
        console.log('');

        // ─── Assertions ─────────────────────────────────────
        section('Assertions');

        assert(errorRate < 5, `Error rate < 5% (actual: ${errorRate.toFixed(1)}%)`);
        assert(serverErrors === 0, `Zero HTTP 5xx responses (actual: ${serverErrors})`);
        assert(
            degradationPct <= LATENCY_THRESHOLD_PCT,
            `Latency degradation ≤ ${LATENCY_THRESHOLD_PCT}% (actual: ${degradationPct.toFixed(1)}%)`
        );

    } catch (err) {
        console.log(c.red(`\n  ⚠ Unexpected error: ${err.message}`));
        console.log(c.gray(`    ${err.stack}`));
    } finally {
        section('Cleanup');
        try {
            // Restore throttle limit
            if (cleanup.adminToken) {
                await api('PUT', '/api/settings', { api_throttle_limit: originalThrottle }, cleanup.adminToken);
                console.log(c.yellow(`  Throttle limit restored to ${originalThrottle}`));
            }
        } catch (e) { /* best-effort */ }
        try {
            if (cleanup.adminToken) {
                for (const id of cleanup.userIds) {
                    try {
                        await api('PUT', `/api/auth/users/${id}/status`, { status: 'suspended' }, cleanup.adminToken);
                    } catch (e) { /* best-effort */ }
                }
            }
        } catch (e) { /* best-effort */ }
        console.log(c.gray(`  Cleaned up ${cleanup.userIds.length} test users`));
    }

    const results = summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

run();
