// Opt-out usage telemetry → Amplitude HTTP API (/2/httpapi). Non-blocking and fail-silent: never
// delays or fails a run. Sends a random per-install UUID (~/.perso/install-id), the account's
// userSeq as user_id (name/email/profile fields are never read or sent), coarse environment,
// system language, whether a key is registered (user) or used by the run (event), the
// caller-supplied counts, and the workspace number (space_seq). No API key, filenames, media
// content, email, or projectSeq is ever sent.
// Opt out with PERSO_NO_TELEMETRY. See README "Privacy & Telemetry".
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CRED_DIR, CRED_FILE, API_BASE } from './config.mjs';
import { CLIENT_VERSION, CLIENT_HOST, AGENT_HOST, AGENT_HOST_SOURCE } from './client_info.mjs';
import { readWebAttribution } from './web_attribution.mjs';

// Write-only ingestion (project API) key. Public by design — it can only SEND events, never read
// data; exposure in the repo allows spoofing at worst, not data access. Override via env for testing.
const API_KEY = process.env.PERSO_AMPLITUDE_KEY || 'd795c0c0328160be4d7df3365eb0c05e';
// US data residency. EU projects must use https://api.eu.amplitude.com/2/httpapi.
const ENDPOINT = process.env.PERSO_AMPLITUDE_URL || 'https://api2.amplitude.com/2/httpapi';
// 8s absorbs a cold DNS+TLS handshake on slow links (the first event of a run was the most dropped).
const TIMEOUT_MS = 8000; // per attempt
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [1000, 3000]; // before attempt 2 and 3
const TOTAL_BUDGET_MS = 15_000; // hard cap per track() call — some call sites await it (connect.mjs)

const ID_FILE = join(CRED_DIR, 'install-id');
const SENTINEL = join(CRED_DIR, 'installed'); // { version, at, method } — dedupes `install` per (install × version)
const USER_FILE = join(CRED_DIR, 'telemetry-user'); // { user_id, plan_tier, plan_name } — survives across runs
const NODE_MAJOR = Number(process.versions.node.split('.')[0]) || null;

// Server environment, derived from the API base host (PERSO_API_BASE override → qa/dev/stage runs):
// api.perso.ai → 'prod', <env>-api.perso.ai → '<env>', anything else → the host itself.
const API_ENV = (() => {
  const host = new URL(API_BASE).hostname;
  if (host === 'api.perso.ai') return 'prod';
  return /^([a-z0-9]+)-api\.perso\.ai$/.exec(host)?.[1] ?? host;
})();

// Coarse language/country, derived locally once per process (best-effort → omitted on failure).
// They describe the USER/machine, not the event, and fill Amplitude's built-in top-level fields
// (user-level dimensions). `country` is a locale-derived guess (likely-subtag for a bare
// language), not an IP location.
const TOP_GEO = (() => {
  const top = {};
  try {
    let loc = new Intl.DateTimeFormat().resolvedOptions().locale || '';
    // ICU falls back to 'en-US' when it cannot resolve the OS locale → prefer the POSIX env in that case.
    const env = (process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '').split(/[.@]/)[0].replace('_', '-');
    if ((!loc || loc === 'en-US') && env && !/^(C|POSIX)$/i.test(env)) loc = env;
    if (loc) {
      const l = new Intl.Locale(loc);
      top.language = l.language;                                // 'ko'
      const region = l.region ?? l.maximize().region ?? null;   // 'KR' (likely-subtag for a bare language)
      if (region) top.country = region;
    }
  } catch { /* omit */ }
  return top;
})();

// Did THIS run's operation/flow use a Perso API key? Set early per run by each entry script (keyed
// workers → true; local/offline features → false). Left null → omitted from events.
let _keyUsed = null;
export function setKeyUsed(used) { _keyUsed = used == null ? null : !!used; }

// Whether a key is registered on this install (user property). Presence only — never reads/decrypts it.
const keyRegistered = () => { try { return existsSync(CRED_FILE); } catch { return false; } };

// ── account-level user state (user_id + plan), persisted best-effort across runs ─────────────
let _user = null;
const loadUser = () => {
  if (_user) return _user;
  try { _user = JSON.parse(readFileSync(USER_FILE, 'utf8')) ?? {}; } catch { _user = {}; }
  return _user;
};
const saveUser = () => {
  try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(USER_FILE, JSON.stringify(_user)); } catch { /* best-effort */ }
};

/** Whether an account identity was already resolved (persisted) — lets the space gate skip the
 *  member-info request on every run after the first. */
export const hasTelemetryUser = () => !!loadUser().user_id;

/** Account identity → Amplitude user_id: the caller's userSeq, sent as-is (stable across devices,
 *  spaces, and key re-issues). Amplitude merges every device_id reporting the same user_id into one
 *  user, including its earlier anonymous events. Resolved once by the space gate and persisted so
 *  later runs (including offline features) report the same user. */
export function setTelemetryAccount(userSeq) {
  const seq = Number(userSeq);
  if (!Number.isInteger(seq) || seq <= 0) return;
  const id = String(seq);
  const u = loadUser();
  if (u.user_id === id) return;
  u.user_id = id;
  saveUser();
}

/** Current plan of the run's workspace → plan_tier/plan_name user properties (event-level plan props
 *  stay per-call at the call sites). Called by spacePlanProps() whenever plan info is resolved. */
export function setTelemetryPlan(tier, name) {
  const t = tier ?? null, n = name ?? null;
  if (t == null && n == null) return;
  const u = loadUser();
  if (u.plan_tier === t && u.plan_name === n) return;
  u.plan_tier = t;
  u.plan_name = n;
  saveUser();
}


// Stable per install (machine × OS user): a random UUID persisted to ~/.perso/install-id and read
// on every run → same value across sessions and reboots. Returns { id, isNew }; isNew is true only
// the first time the file is created (→ emit `first_run` once). A write failure (read-only FS, CI)
// yields a fresh id each run — accepted; it only over-counts in ephemeral environments.
// The resolved id is exported to PERSO_INSTALL_ID (and read back first) so child processes spawned
// by this run (connect.mjs, resolve_key.mjs) inherit the SAME device_id even where ~/.perso is
// unwritable (sandboxed agents) — without this, one onboarding funnel splits across several
// Amplitude users, one per process.
function loadInstallId() {
  const inherited = (process.env.PERSO_INSTALL_ID || '').trim();
  if (inherited) return { id: inherited, isNew: false };
  let id = null;
  try { id = readFileSync(ID_FILE, 'utf8').trim() || null; } catch { /* create below */ }
  const isNew = id == null;
  if (isNew) {
    id = randomUUID();
    try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(ID_FILE, id); } catch { /* best-effort */ }
  }
  process.env.PERSO_INSTALL_ID = id; // spawn() passes process.env by default — every child inherits it
  return { id, isNew };
}

let cached = null;
const installId = () => (cached ??= loadInstallId());

/** This install's Amplitude device_id — handed to the /connect page (?did=…) so the page's
 *  onboarding events merge into the same Amplitude user. Null when telemetry is opted out. */
export function telemetryDeviceId() {
  if (process.env.PERSO_NO_TELEMETRY) return null;
  try { return installId().id; } catch { return null; }
}

// Which agent runs this — env/path detection by default (client_info), overridable by a worker's
// `--host` self-report. `agent_host_source` ('env'|'path'|'self'|'none') is sent so analysis can
// weight self-reported values (a model may not know its own harness) against detected ones.
let _agentHost = AGENT_HOST;
let _agentHostSource = AGENT_HOST_SOURCE;
export function setAgentHost(host) {
  const v = String(host ?? '').trim().toLowerCase();
  if (v) { _agentHost = v; _agentHostSource = 'self'; }
}

const SPACE_FILE = join(CRED_DIR, 'last-space');
const validSeq = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// Workspace attached to every event once known.
let _spaceSeq = null;
let _spaceSource = null; // 'cache' (previous run — a guess) | 'hint' (argv/env) | 'confirmed' (space gate)

/** Call once the run's workspace is confirmed (ensureSpace / --resume manifest / project-ref /
 *  billing --space). Persisted so the next run can attach it before its own space gate runs. */
export function setTelemetrySpace(seq) {
  _spaceSeq = validSeq(seq);
  _spaceSource = 'confirmed';
  if (_spaceSeq == null) return;
  try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(SPACE_FILE, String(_spaceSeq)); } catch { /* best-effort */ }
}

/** Best-effort workspace for the events that fire before the space gate (run_started, key_check,
 *  lang_invalid, early error). Uses an exact hint from argv/env/a state file when there is one,
 *  otherwise the previous run's workspace — a guess, flagged as space_seq_guess and replaced as soon
 *  as setTelemetrySpace confirms the real one. Safe to call repeatedly. */
export function primeTelemetrySpace(hint) {
  if (_spaceSource === 'confirmed') return;
  const exact = validSeq(hint) ?? validSeq(process.env.PERSO_SPACE_SEQ);
  if (exact != null) { _spaceSeq = exact; _spaceSource = 'hint'; return; }
  if (_spaceSeq != null) return;
  try {
    const cached = validSeq(readFileSync(SPACE_FILE, 'utf8').trim());
    if (cached != null) { _spaceSeq = cached; _spaceSource = 'cache'; }
  } catch { /* no cache yet */ }
}

/** Fire one event. Fail-silent and never throws; safe to call without awaiting (the run drains the
 *  pending request on exit). null/undefined properties are dropped so only set fields are sent.
 *  Transient failures (network error, timeout, 408/429/5xx) are retried with backoff; other 4xx are
 *  final. insert_id makes a retry after a lost response idempotent (Amplitude dedupes on it).
 *  opts.budgetMs overrides the default total budget — used by the install beacon, which runs inside a
 *  blocking SessionStart hook and must return promptly on slow links. */
export async function track(eventType, props = {}, opts = {}) {
  if (process.env.PERSO_NO_TELEMETRY || !API_KEY) return;
  try {
    const event_properties = { env: API_ENV, agent_host: _agentHost, agent_host_source: _agentHostSource, ...(NODE_MAJOR ? { node_major: NODE_MAJOR } : {}) };
    if (_spaceSeq != null) {
      event_properties.space_seq = _spaceSeq;
      if (_spaceSource === 'cache') event_properties.space_seq_guess = true;
    }
    if (_keyUsed != null) event_properties.key_used = _keyUsed;
    for (const [k, v] of Object.entries(props)) if (v != null) event_properties[k] = v;
    // Landing-page acquisition info rides only these two events — as event AND user properties.
    const attribution = (eventType === 'install' || eventType === 'first_run') ? readWebAttribution() : null;
    if (attribution) Object.assign(event_properties, attribution);
    const u = loadUser();
    const body = JSON.stringify({
      api_key: API_KEY,
      // Amplitude rejects ids shorter than 5 chars by default — early accounts have short userSeqs.
      options: { min_id_length: 1 },
      events: [{
        // Pseudonymous account id when known — Amplitude merges all device_ids sharing it into one user.
        ...(u.user_id ? { user_id: u.user_id } : {}),
        device_id: installId().id,
        insert_id: randomUUID(),
        event_type: eventType,
        time: Date.now(), // original occurrence time — identical across retries
        app_version: CLIENT_VERSION,
        platform: CLIENT_HOST, // 'agents' — one unified channel
        os_name: process.platform, // win32 | darwin | linux
        ...TOP_GEO, // language + country (locale-derived): Amplitude built-in user-level dimensions
        event_properties,
        // User-level attributes: agent_host reflects the most recently used agent (one install can run
        // under several — per-event attribution stays in event_properties.agent_host); locale/time_zone
        // describe the machine; plan reflects the last known workspace plan; install_method the channel.
        user_properties: {
          agent_host: _agentHost,
          key_registered: keyRegistered(),
          ...(u.plan_tier != null ? { plan_tier: u.plan_tier } : {}),
          ...(u.plan_name != null ? { plan_name: u.plan_name } : {}),
          ...(attribution ?? {}),
        },
      }],
    });
    const debug = (msg) => { if (process.env.PERSO_TELEMETRY_DEBUG) console.error(`[telemetry] ${eventType} → ${msg}`); };
    const deadline = Date.now() + (opts.budgetMs || TOTAL_BUDGET_MS);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt - 1]));
      const remaining = deadline - Date.now();
      if (remaining <= 0) { debug('budget exhausted — giving up'); return; }
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, remaining)),
          body,
        });
        debug(`HTTP ${res.status} (attempt ${attempt + 1}) ${JSON.stringify(event_properties)}`);
        // 2xx delivered; a non-408/429 4xx is a payload problem no retry can fix — stop either way.
        if (res.status < 500 && res.status !== 429 && res.status !== 408) return;
      } catch (e) {
        debug(`failed (attempt ${attempt + 1}): ${e?.message ?? e}`);
      }
    }
  } catch (e) {
    if (process.env.PERSO_TELEMETRY_DEBUG) console.error(`[telemetry] ${eventType} → failed: ${e?.message ?? e}`);
    /* non-blocking, fail-silent */
  }
}

/** Emit `install` once per (install × version), deduped via the ~/.perso/installed sentinel.
 *  method: 'marketplace' | 'npx' | 'first_run_fallback' | ... `extra` adds event props (e.g. { hosts });
 *  a version change re-fires with from_version (an upgrade). opts.budgetMs caps the send (blocking
 *  hook); opts.requirePersist skips the event when the sentinel cannot be written — used by the
 *  first-run fallback, which would otherwise re-fire on every run in sandboxed (read-only-home)
 *  environments. Never throws. Returns true when the event was emitted (fresh install or upgrade) —
 *  callers use it to run first-install-only work (e.g. the web-attribution receiver). */
export async function emitInstallOnce(method, extra = null, opts = {}) {
  try {
    if (process.env.PERSO_NO_TELEMETRY) return false;
    let prev = null;
    try { prev = JSON.parse(readFileSync(SENTINEL, 'utf8')); } catch { /* fresh install */ }
    if (prev?.version === CLIENT_VERSION) return false; // already counted this version
    let persisted = true;
    try {
      // Written before the beacon so a slow/failed send never re-fires on the next session (installs
      // must never over-count).
      mkdirSync(CRED_DIR, { recursive: true });
      writeFileSync(SENTINEL, JSON.stringify({ version: CLIENT_VERSION, at: new Date().toISOString(), method }) + '\n');
    } catch { persisted = false; }
    if (!persisted && opts.requirePersist) return false;
    const props = { method, ...(extra || {}) };
    if (prev?.version) props.from_version = prev.version; // an upgrade, not a first install
    await track('install', props, opts.budgetMs ? { budgetMs: opts.budgetMs } : {});
    return true;
  } catch { return false; }
}

/** Call once at process start (before other track calls). Emits `first_run` the first time this
 *  install is seen, and back-fills `install` for channels whose install path runs none of our code
 *  (e.g. manual/marketplace installs on non-Claude agents) — method 'first_run_fallback' marks these
 *  so channel analysis can tell them from installer-reported ones. No-op when opted out. Never throws. */
export function initTelemetry() {
  if (process.env.PERSO_NO_TELEMETRY) return;
  try { if (installId().isNew) track('first_run'); } catch { /* fail-silent */ }
  emitInstallOnce('first_run_fallback', null, { requirePersist: true }); // async fire-and-forget
}
