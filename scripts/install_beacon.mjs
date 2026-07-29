#!/usr/bin/env node
// Fires the `install` telemetry event once per (install × version). Two entry points, because the
// two install paths run different code at install time:
//   • Claude marketplace (`claude plugin install`): executes NONE of our code, so the plugin's
//     SessionStart hook (hooks/hooks.json) runs this script — the first new session after install is
//     the earliest moment we can beacon. method='marketplace'.
//   • npx (scripts/install.mjs): calls emitInstall('npx') directly right after copying the skills.
// Deduped via ~/.perso/installed so it fires only on a fresh install or a version upgrade; every later
// session is a fast no-op with no network. Fully fail-silent — never blocks, throws, or fails a run.
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CRED_DIR } from '../skills/dubbing/lib/config.mjs';
import { CLIENT_VERSION } from '../skills/dubbing/lib/client_info.mjs';
import { track } from '../skills/dubbing/lib/telemetry.mjs';

const SENTINEL = join(CRED_DIR, 'installed');
// Cap the beacon's network budget: on the first session after a marketplace install this runs inside
// the (blocking) SessionStart hook, so it must return promptly regardless of link quality.
const BUDGET_MS = 3000;

function priorVersion() {
  try { return JSON.parse(readFileSync(SENTINEL, 'utf8')).version || null; } catch { return null; }
}
function writeSentinel() {
  try {
    mkdirSync(CRED_DIR, { recursive: true });
    // Written before the beacon so a slow/failed send never re-fires on the next session (installs
    // must never over-count). Best-effort: a write failure just means the event may repeat.
    writeFileSync(SENTINEL, JSON.stringify({ version: CLIENT_VERSION, at: new Date().toISOString() }) + '\n');
  } catch { /* best-effort */ }
}

/**
 * Emit `install` once for this version. method: 'marketplace' | 'npx' | ... `extra` adds event props
 * (e.g. { hosts }). No-op when opted out or when this version was already recorded. Never throws.
 */
export async function emitInstall(method, extra) {
  try {
    if (process.env.PERSO_NO_TELEMETRY) return;
    const prev = priorVersion();
    if (prev === CLIENT_VERSION) return; // already counted this version
    writeSentinel();
    const props = { method: method || 'marketplace', ...(extra || {}) };
    if (prev) props.from_version = prev; // an upgrade, not a first install
    await track('install', props, { budgetMs: BUDGET_MS });
  } catch { /* fail-silent */ }
}

// CLI entry (the SessionStart hook): `node install_beacon.mjs [--method <m>]`. Exit naturally (no
// process.exit) so any in-flight fetch drains without a hard kill.
const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (isMain) {
  const i = process.argv.indexOf('--method');
  emitInstall(i >= 0 ? process.argv[i + 1] : 'marketplace');
}
