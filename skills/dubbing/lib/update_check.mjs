// Once-a-day (UTC) check against the npm registry for a newer release. Both npx and the plugin marketplace
// install from npm, so the registry is the single source of truth. Non-blocking, fail-silent, throttled to
// at most one network call per UTC day; never delays or fails a run. Opt out with PERSO_NO_UPDATE_CHECK.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { CRED_DIR } from './config.mjs';
import { CLIENT_VERSION } from './client_info.mjs';

const PKG = 'perso-dubbing';
const REGISTRY = `https://registry.npmjs.org/${PKG}/latest`;
const CACHE_FILE = join(CRED_DIR, 'update-check.json');
const TIMEOUT_MS = 3000;

const utcDate = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

function readCache() {
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; }
}
function writeCache(obj) {
  try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(CACHE_FILE, JSON.stringify(obj)); } catch { /* ignore */ }
}

// x.y.z compare: a>b → 1, a<b → -1, equal → 0. parseInt drops any pre-release/build suffix (e.g. "3-beta" → 3).
function cmpSemver(a, b) {
  const part = (s) => String(s).split('.').map((n) => parseInt(n, 10) || 0);
  const pa = part(a), pb = part(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function fetchLatest() {
  try {
    const res = await fetch(REGISTRY, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j?.version === 'string' ? j.version : null;
  } catch { return null; }
}

// Best-effort install-method guess from the running file path (marketplace copies live under a plugins dir).
function installMethod() {
  try {
    const p = fileURLToPath(import.meta.url).replace(/\\/g, '/').toLowerCase();
    if (p.includes('/plugins/') || p.includes('/marketplace')) return 'marketplace';
  } catch { /* fall through */ }
  return 'npx';
}

function buildNotice(latest) {
  const lines = [`ℹ️  Update available: ${PKG} ${latest} (you have ${CLIENT_VERSION}).`];
  if (installMethod() === 'marketplace') {
    lines.push('   In Claude Code (plugin):  /plugin update perso-dubbing');
    lines.push('   Otherwise (npx / manual): npx perso-dubbing@latest');
  } else {
    lines.push('   Update:                   npx perso-dubbing@latest');
    lines.push('   In Claude Code (plugin):  /plugin update perso-dubbing');
  }
  return lines.join('\n');
}

/** Returns a one-line update notice (string) if a newer version exists, else null. Never throws.
 *  Fetches from npm at most once per UTC day (cached); reuses the last known result otherwise. */
export async function checkForUpdate() {
  if (process.env.PERSO_NO_UPDATE_CHECK) return null;
  if (CLIENT_VERSION === '0.0.0') return null; // version unknown → can't compare reliably

  const today = utcDate();
  const cache = readCache();
  let latest = cache.latest ?? null;
  if (cache.date !== today) {
    const fetched = await fetchLatest();
    latest = fetched ?? cache.latest ?? null; // keep last known on failure
    writeCache({ date: today, latest }); // mark checked today regardless → ≤1 fetch/day
  }

  if (!latest || cmpSemver(latest, CLIENT_VERSION) <= 0) return null;
  return buildNotice(latest);
}
