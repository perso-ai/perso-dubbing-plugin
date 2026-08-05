#!/usr/bin/env node
// Fires the `install` telemetry event once per (install × version). Three entry points, because the
// install paths run different code at install time:
//   • Claude marketplace (`claude plugin install`): executes NONE of our code, so the plugin's
//     SessionStart hook (hooks/hooks.json) runs this script — the first new session after install is
//     the earliest moment we can beacon. method='marketplace'.
//   • npx (scripts/install.mjs): calls emitInstall('npx') directly right after copying the skills.
//   • Any other channel (manual copy, non-Claude marketplace-style installs): telemetry.initTelemetry
//     back-fills it on the first run with method='first_run_fallback'.
// Dedupe/persistence lives in telemetry.emitInstallOnce (~/.perso/installed sentinel) so all three
// paths share one counter. Fully fail-silent — never blocks, throws, or fails a run.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { emitInstallOnce } from '../skills/dubbing/lib/telemetry.mjs';
import { lingerWebAttribution } from '../skills/dubbing/lib/web_attribution.mjs';

// Cap the beacon's network budget: on the first session after a marketplace install this runs inside
// the (blocking) SessionStart hook, so it must return promptly regardless of link quality.
const BUDGET_MS = 3000;

/** Emit `install` once for this version. method: 'marketplace' | 'npx' | ... `extra` adds event props
 *  (e.g. { hosts }). No-op when opted out or when this version was already recorded. Never throws. */
export async function emitInstall(method, extra) {
  return emitInstallOnce(method || 'marketplace', extra, { budgetMs: BUDGET_MS });
}

// CLI entry (the SessionStart hook): `node install_beacon.mjs [--method <m>]`. Exit naturally (no
// process.exit) so any in-flight fetch drains without a hard kill.
const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (isMain) {
  const i = process.argv.indexOf('--method');
  emitInstall(i >= 0 ? process.argv[i + 1] : 'marketplace').then((fired) => {
    // Marketplace installs run none of our code at install time — the first session is the earliest
    // listening moment; detached so the blocking SessionStart hook returns promptly.
    if (fired) lingerWebAttribution();
  });
}
