// Opt-out usage telemetry → Amplitude HTTP API (/2/httpapi). Non-blocking and fail-silent: never
// delays or fails a run. Sends a random per-install UUID (~/.perso/install-id), coarse environment,
// the caller-supplied counts, and the workspace number (space_seq). No API key,
// filenames, media content, account/email, or projectSeq is ever sent.
// Opt out with PERSO_NO_TELEMETRY. See README "Privacy & Telemetry".
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CRED_DIR, API_BASE } from './config.mjs';
import { CLIENT_VERSION, CLIENT_HOST } from './client_info.mjs';

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
const NODE_MAJOR = Number(process.versions.node.split('.')[0]) || null;

// Server environment, derived from the API base host (PERSO_API_BASE override → qa/dev/stage runs):
// api.perso.ai → 'prod', <env>-api.perso.ai → '<env>', anything else → the host itself.
const API_ENV = (() => {
  const host = new URL(API_BASE).hostname;
  if (host === 'api.perso.ai') return 'prod';
  return /^([a-z0-9]+)-api\.perso\.ai$/.exec(host)?.[1] ?? host;
})();

// Stable per install (machine × OS user): a random UUID persisted to ~/.perso/install-id and read
// on every run → same value across sessions and reboots. Returns { id, isNew }; isNew is true only
// the first time the file is created (→ emit `first_run` once). A write failure (read-only FS, CI)
// yields a fresh id each run — accepted; it only over-counts in ephemeral environments.
function loadInstallId() {
  try {
    const id = readFileSync(ID_FILE, 'utf8').trim();
    if (id) return { id, isNew: false };
  } catch { /* create below */ }
  const id = randomUUID();
  try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(ID_FILE, id); } catch { /* best-effort */ }
  return { id, isNew: true };
}

let cached = null;
const installId = () => (cached ??= loadInstallId());

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
 *  final. insert_id makes a retry after a lost response idempotent (Amplitude dedupes on it). */
export async function track(eventType, props = {}) {
  if (process.env.PERSO_NO_TELEMETRY || !API_KEY) return;
  try {
    const event_properties = { env: API_ENV, ...(NODE_MAJOR ? { node_major: NODE_MAJOR } : {}) };
    if (_spaceSeq != null) {
      event_properties.space_seq = _spaceSeq;
      if (_spaceSource === 'cache') event_properties.space_seq_guess = true;
    }
    for (const [k, v] of Object.entries(props)) if (v != null) event_properties[k] = v;
    const body = JSON.stringify({
      api_key: API_KEY,
      events: [{
        device_id: installId().id,
        insert_id: randomUUID(),
        event_type: eventType,
        time: Date.now(), // original occurrence time — identical across retries
        app_version: CLIENT_VERSION,
        platform: CLIENT_HOST, // 'agents' — one unified channel
        os_name: process.platform, // win32 | darwin | linux
        event_properties,
      }],
    });
    const debug = (msg) => { if (process.env.PERSO_TELEMETRY_DEBUG) console.error(`[telemetry] ${eventType} → ${msg}`); };
    const deadline = Date.now() + TOTAL_BUDGET_MS;
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

/** Call once at process start (before other track calls). Emits `first_run` the first time this
 *  install is seen. No-op when opted out. Safe to call unconditionally; never throws. */
export function initTelemetry() {
  if (process.env.PERSO_NO_TELEMETRY) return;
  try { if (installId().isNew) track('first_run'); } catch { /* fail-silent */ }
}
