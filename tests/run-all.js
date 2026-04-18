/**
 * ──────────────────────────────────────────────────────────────
 * WeatherWize — Master Test Runner
 * ──────────────────────────────────────────────────────────────
 * Runs all 5 test tiers in sequence. Fails fast by default
 * (smoke failure blocks everything).
 *
 * Usage:
 *   node scripts/testing/run-all.js
 *   node scripts/testing/run-all.js --skip-soak
 *   node scripts/testing/run-all.js --skip-stress
 *   node scripts/testing/run-all.js --continue-on-failure
 *   node scripts/testing/run-all.js --skip-soak --skip-stress
 * ──────────────────────────────────────────────────────────────
 */

const { execFileSync } = require('child_process');
const path = require('path');

// ─── Parse flags ────────────────────────────────────────────
const args = process.argv.slice(2);
const skipSoak = args.includes('--skip-soak');
const skipStress = args.includes('--skip-stress');
const continueOnFailure = args.includes('--continue-on-failure');

// ─── Colors ─────────────────────────────────────────────────
const c = {
    green:  (s) => `\x1b[32m${s}\x1b[0m`,
    red:    (s) => `\x1b[31m${s}\x1b[0m`,
    cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    gray:   (s) => `\x1b[90m${s}\x1b[0m`,
    bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

// ─── Test Tiers ─────────────────────────────────────────────
const tiers = [
    { name: 'Tier 1 — Smoke Tests',       file: '01-smoke.js',       skip: false },
    { name: 'Tier 2 — Integration Tests',  file: '02-integration.js', skip: false },
    { name: 'Tier 3 — Functional Tests',   file: '03-functional.js',  skip: false },
    { name: 'Tier 4 — Stability (Soak)',   file: '04-stability.js',   skip: skipSoak },
    { name: 'Tier 5 — Stress & Load',      file: '05-stress.js',      skip: skipStress },
];

// ─── Execute ────────────────────────────────────────────────
console.log('');
console.log(c.bold(c.cyan('╔══════════════════════════════════════════════════════╗')));
console.log(c.bold(c.cyan('║       WEATHERWIZE — FULL TEST SUITE                  ║')));
console.log(c.bold(c.cyan('╚══════════════════════════════════════════════════════╝')));
console.log('');

if (skipSoak) console.log(c.yellow('  ⚠ Tier 4 (Soak) will be SKIPPED'));
if (skipStress) console.log(c.yellow('  ⚠ Tier 5 (Stress) will be SKIPPED'));
if (continueOnFailure) console.log(c.yellow('  ⚠ Continue-on-failure mode enabled'));
console.log('');

const results = [];
let hasFailed = false;
const scriptDir = __dirname;

for (const tier of tiers) {
    if (tier.skip) {
        console.log(c.yellow(`⏭  SKIPPED  ${tier.name}`));
        results.push({ name: tier.name, status: 'SKIPPED' });
        continue;
    }

    if (hasFailed && !continueOnFailure) {
        console.log(c.gray(`⏭  BLOCKED  ${tier.name} (previous tier failed)`));
        results.push({ name: tier.name, status: 'BLOCKED' });
        continue;
    }

    const filePath = path.join(scriptDir, tier.file);
    const startTime = Date.now();

    try {
        console.log(c.cyan(`\n▶  RUNNING  ${tier.name}`));
        console.log(c.gray(`   ${filePath}`));
        console.log('');

        execFileSync('node', [filePath], {
            stdio: 'inherit',
            env: { ...process.env },
            timeout: tier.file === '04-stability.js' ? 300_000 : 120_000, // 5 min for soak, 2 min for others
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        results.push({ name: tier.name, status: 'PASSED', elapsed });
        console.log(c.green(`\n✅  PASSED  ${tier.name} (${elapsed}s)\n`));

    } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        hasFailed = true;
        results.push({ name: tier.name, status: 'FAILED', elapsed });
        console.log(c.red(`\n❌  FAILED  ${tier.name} (${elapsed}s)\n`));
    }
}

// ─── Final Summary ──────────────────────────────────────────
console.log('');
console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(c.bold('  FULL SUITE RESULTS'));
console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

for (const r of results) {
    let icon, color;
    switch (r.status) {
        case 'PASSED':  icon = '✅'; color = c.green; break;
        case 'FAILED':  icon = '❌'; color = c.red; break;
        case 'SKIPPED': icon = '⏭ '; color = c.yellow; break;
        case 'BLOCKED': icon = '🚫'; color = c.gray; break;
        default:        icon = '? '; color = c.gray;
    }
    const elapsed = r.elapsed ? ` (${r.elapsed}s)` : '';
    console.log(`  ${icon} ${color(r.status.padEnd(8))} ${r.name}${elapsed}`);
}

const passed = results.filter(r => r.status === 'PASSED').length;
const failed = results.filter(r => r.status === 'FAILED').length;
const skipped = results.filter(r => r.status === 'SKIPPED').length;
const blocked = results.filter(r => r.status === 'BLOCKED').length;

console.log('');
console.log(`  ${c.green(`${passed} passed`)} | ${failed > 0 ? c.red(`${failed} failed`) : `${failed} failed`} | ${skipped} skipped | ${blocked} blocked`);
console.log(c.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log('');

process.exit(hasFailed ? 1 : 0);
