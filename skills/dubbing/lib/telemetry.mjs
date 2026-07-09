// Anonymous, opt-out usage telemetry → Amplitude HTTP API (/2/httpapi). Non-blocking and
// fail-silent: never delays or fails a run. No personal data — a random per-install UUID
// (~/.perso/install-id), coarse environment, and the caller-supplied counts only. No API key,
// filenames, media content, account/email, or spaceSeq/projectSeq is ever sent.
// Opt out with PERSO_NO_TELEMETRY. See README "Telemetry & Privacy".
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CRED_DIR } from './config.mjs';
import { CLIENT_VERSION, CLIENT_HOST } from './client_info.mjs';

// Write-only ingestion (project API) key. Public by design — it can only SEND events, never read
// data; exposure in the repo allows spoofing at worst, not data access. Override via env for testing.
const API_KEY = process.env.PERSO_AMPLITUDE_KEY || 'd795c0c0328160be4d7df3365eb0c05e';
// US data residency. EU projects must use https://api.eu.amplitude.com/2/httpapi.
const ENDPOINT = process.env.PERSO_AMPLITUDE_URL || 'https://api2.amplitude.com/2/httpapi';
const TIMEOUT_MS = 3000;

const ID_FILE = join(CRED_DIR, 'install-id');
const NODE_MAJOR = Number(process.versions.node.split('.')[0]) || null;

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

/** Fire one event. Fail-silent and never throws; safe to call without awaiting (the run drains the
 *  pending request on exit). null/undefined properties are dropped so only set fields are sent. */
export async function track(eventType, props = {}) {
  if (process.env.PERSO_NO_TELEMETRY || !API_KEY) return;
  try {
    const event_properties = NODE_MAJOR ? { node_major: NODE_MAJOR } : {};
    for (const [k, v] of Object.entries(props)) if (v != null) event_properties[k] = v;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        api_key: API_KEY,
        events: [{
          device_id: installId().id,
          event_type: eventType,
          time: Date.now(),
          app_version: CLIENT_VERSION,
          platform: CLIENT_HOST, // 'agents' — one unified channel
          os_name: process.platform, // win32 | darwin | linux
          event_properties,
        }],
      }),
    });
    if (process.env.PERSO_TELEMETRY_DEBUG) console.error(`[telemetry] ${eventType} → HTTP ${res.status} ${JSON.stringify(event_properties)}`);
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
