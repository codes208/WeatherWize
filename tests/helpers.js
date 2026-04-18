/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Shared Test Infrastructure
 * ──────────────────────────────────────────────────────────────
 * Zero-dependency test utilities using native Node.js 18+ fetch.
 * All test scripts import this module for consistent API access,
 * assertions, and console formatting.
 * ──────────────────────────────────────────────────────────────
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_CREDS = { username: 'admin', password: 'admin' };

// ─── Counters ───────────────────────────────────────────────
let _passed = 0;
let _failed = 0;
let _errors = [];

// ─── Colors ─────────────────────────────────────────────────
const c = {
    green:  (s) => `\x1b[32m${s}\x1b[0m`,
    red:    (s) => `\x1b[31m${s}\x1b[0m`,
    cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    gray:   (s) => `\x1b[90m${s}\x1b[0m`,
    bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

// ─── API Client ─────────────────────────────────────────────

/**
 * Makes an HTTP request to the WeatherWize API.
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API path (e.g., '/api/auth/login')
 * @param {object|null} body - Request body (JSON-serializable)
 * @param {string|null} token - JWT Bearer token
 * @returns {Promise<{status: number, data: any, latencyMs: number}>}
 */
async function api(method, path, body = null, token = null) {
    const url = `${BASE_URL}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const start = Date.now();
    const response = await fetch(url, options);
    const latencyMs = Date.now() - start;

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return { status: response.status, data, latencyMs };
}

// ─── User Helpers ───────────────────────────────────────────

/**
 * Registers a unique test user.
 * @param {string} role - 'general' or 'advanced'
 * @param {object} overrides - optional field overrides
 * @returns {Promise<{token: string, user: object, credentials: {username: string, password: string}}>}
 */
async function registerUser(role = 'general', overrides = {}) {
    const suffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const credentials = {
        username: overrides.username || `test_${role}_${suffix}`,
        password: overrides.password || 'TestPass123!',
        email: overrides.email || `test_${role}_${suffix}@weatherwize-test.com`,
        role: role,
    };

    const res = await api('POST', '/api/auth/register', credentials);
    if (res.status !== 201) {
        throw new Error(`registerUser failed (${res.status}): ${JSON.stringify(res.data)}`);
    }

    return {
        token: res.data.token,
        user: res.data.user,
        credentials: { username: credentials.username, password: credentials.password },
    };
}

/**
 * Logs in an existing user.
 * @returns {Promise<{token: string, user: object}>}
 */
async function loginUser(username, password) {
    const res = await api('POST', '/api/auth/login', { username, password });
    if (res.status !== 200) {
        throw new Error(`loginUser failed (${res.status}): ${JSON.stringify(res.data)}`);
    }
    return { token: res.data.token, user: res.data.user };
}

/**
 * Logs in as the default admin user.
 * @returns {Promise<{token: string, user: object}>}
 */
async function loginAdmin() {
    return loginUser(ADMIN_CREDS.username, ADMIN_CREDS.password);
}

// ─── Assertions ─────────────────────────────────────────────

function assert(condition, testName) {
    if (condition) {
        _passed++;
        console.log(`  ${c.green('✅ PASS')}  ${testName}`);
    } else {
        _failed++;
        _errors.push(testName);
        console.log(`  ${c.red('❌ FAIL')}  ${testName}`);
    }
}

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        _passed++;
        console.log(`  ${c.green('✅ PASS')}  ${testName}`);
    } else {
        _failed++;
        _errors.push(`${testName} (expected: ${expected}, got: ${actual})`);
        console.log(`  ${c.red('❌ FAIL')}  ${testName} ${c.gray(`(expected: ${expected}, got: ${actual})`)}`);
    }
}

function assertStatus(response, expectedStatus, testName) {
    assertEqual(response.status, expectedStatus, testName);
}

function assertIncludes(str, substring, testName) {
    const condition = typeof str === 'string' && str.includes(substring);
    if (condition) {
        _passed++;
        console.log(`  ${c.green('✅ PASS')}  ${testName}`);
    } else {
        _failed++;
        _errors.push(`${testName} (expected to include: "${substring}")`);
        console.log(`  ${c.red('❌ FAIL')}  ${testName} ${c.gray(`(expected to include: "${substring}")`)}`);
    }
}

// ─── Console Formatting ────────────────────────────────────

function section(name) {
    console.log('');
    console.log(`${c.cyan('━━━')} ${c.bold(name)} ${c.cyan('━━━')}`);
}

function summary() {
    const total = _passed + _failed;
    console.log('');
    console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(c.bold('  RESULTS'));
    console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(`  Total:  ${total}`);
    console.log(`  Passed: ${c.green(_passed)}`);
    console.log(`  Failed: ${_failed > 0 ? c.red(_failed) : _failed}`);

    if (_errors.length > 0) {
        console.log('');
        console.log(c.red('  Failed tests:'));
        _errors.forEach((e) => console.log(`    ${c.red('•')} ${e}`));
    }

    console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');

    return { passed: _passed, failed: _failed, total };
}

function resetCounters() {
    _passed = 0;
    _failed = 0;
    _errors = [];
}

// ─── Utilities ──────────────────────────────────────────────

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute percentile from a sorted array of numbers.
 */
function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, idx)];
}

module.exports = {
    BASE_URL,
    ADMIN_CREDS,
    api,
    registerUser,
    loginUser,
    loginAdmin,
    assert,
    assertEqual,
    assertStatus,
    assertIncludes,
    section,
    summary,
    resetCounters,
    sleep,
    percentile,
    c,
};
