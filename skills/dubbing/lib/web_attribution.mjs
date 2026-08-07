// Landing-page → plugin acquisition handshake, no server in between: after an install click the
// still-open landing tab retries POSTing GA acquisition info (client_id, source, utm, clicked
// button) to this fixed loopback port; whichever plugin process has the receiver open persists it
// once to ~/.perso/web-attribution. The values ride ONLY the `install` and `first_run` events —
// as event properties, and the same keys as user properties (see telemetry.mjs track()).
// Fail-silent everywhere; PERSO_NO_TELEMETRY disables receiving, reading, and sending.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CRED_DIR } from './config.mjs';

// Fixed port — the landing page posts to http://127.0.0.1:41599 (keep the two in sync).
export const ATTR_PORT = Number(process.env.PERSO_ATTR_PORT) || 41599;
const ATTR_FILE = join(CRED_DIR, 'web-attribution');
// Identify API: sets user properties WITHOUT an event. Same project key as telemetry.mjs; the
// endpoint is derived from the same override so tests capture both.
const AMP_KEY = process.env.PERSO_AMPLITUDE_KEY || 'd795c0c0328160be4d7df3365eb0c05e';
const IDENTIFY_ENDPOINT = (process.env.PERSO_AMPLITUDE_URL || 'https://api2.amplitude.com/2/httpapi').replace(/\/2\/httpapi$/, '/identify');
const MAX_BODY_BYTES = 4096;
const MAX_WINDOW_MS = 15 * 60_000;
// Only these keys are accepted, stored, and sent — anything else in the POST body is dropped.
const FIELDS = [
  'ga_client_id', 'ga_session_id', 'acquisition_source', 'referrer_host',
  'utm_source', 'utm_medium', 'utm_campaign', 'install_click_agent', 'install_click_method',
];
// The landing runs on perso.ai subdomains only; the browser enforces the Origin header.
const ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*perso\.ai$/;

function sanitize(body) {
  if (!body || typeof body !== 'object') return null;
  const out = {};
  for (const k of FIELDS) {
    const v = body[k];
    if (typeof v === 'string' && v.trim() && v.length <= 120) out[k] = v.trim();
  }
  // Without the GA client_id there is nothing to join on — reject the delivery.
  return /^[\w.-]{4,64}$/.test(out.ga_client_id ?? '') ? out : null;
}

/** The persisted payload (validated), or null when none was ever delivered / telemetry is opted out. */
export function readWebAttribution() {
  if (process.env.PERSO_NO_TELEMETRY) return null;
  try { return sanitize(JSON.parse(readFileSync(ATTR_FILE, 'utf8'))); } catch { return null; }
}

// This install's device_id, without importing telemetry.mjs (it imports us): env first (set by the
// parent run — survives sandboxed homes), then the persisted install-id file.
function deviceId() {
  const env = (process.env.PERSO_INSTALL_ID || '').trim();
  if (env) return env;
  try { return readFileSync(join(CRED_DIR, 'install-id'), 'utf8').trim() || null; } catch { return null; }
}

// $set the payload as user properties immediately via the Identify API (no event, so install counts
// are untouched) — covers users who install but never run a skill (first_run never comes).
async function sendIdentify(data) {
  try {
    const device_id = deviceId();
    if (!device_id) return;
    await fetch(IDENTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: AMP_KEY, identification: JSON.stringify([{ device_id, user_properties: data }]) }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* fail-silent */ }
}

/** Listen for one valid landing-page delivery for up to windowMs. Resolves the payload (already
 *  persisted) or null on timeout / port already taken (another receiver is up → defer to it).
 *  opts.hold keeps the process alive while listening (CLI + install script); without it the server
 *  never blocks process exit. */
export function captureWebAttribution(windowMs, opts = {}) {
  if (process.env.PERSO_NO_TELEMETRY) return Promise.resolve(null);
  const prior = readWebAttribution();
  if (prior) return Promise.resolve(prior);
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { server.close(); server.closeAllConnections?.(); } catch { /* already down */ }
      resolve(v);
    };
    const server = createServer((req, res) => {
      const origin = req.headers.origin ?? '';
      const cors = ORIGIN_RE.test(origin) ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Private-Network': 'true', // https page → loopback listener needs the PNA preflight
      } : {};
      const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      if (req.method !== 'POST') return respond(405, { ok: false });
      let size = 0;
      const parts = [];
      req.on('data', (c) => { size += c.length; size > MAX_BODY_BYTES ? req.destroy() : parts.push(c); });
      req.on('end', () => {
        let data = null;
        try { data = sanitize(JSON.parse(Buffer.concat(parts).toString('utf8'))); } catch { /* rejected below */ }
        if (!data) return respond(400, { ok: false });
        clearTimeout(timer); // a valid delivery landed — the identify below must not race the window timeout
        try { mkdirSync(CRED_DIR, { recursive: true }); writeFileSync(ATTR_FILE, JSON.stringify(data)); } catch { /* best-effort */ }
        respond(200, { ok: true }); // the tab stops retrying on 200
        res.on('finish', async () => {
          await sendIdentify(data);
          done(data);
        });
      });
    });
    server.on('error', () => done(null));
    const timer = setTimeout(() => done(null), Math.min(windowMs, MAX_WINDOW_MS));
    server.listen(ATTR_PORT, '127.0.0.1', () => { if (!opts.hold) { server.unref(); timer.unref?.(); } });
  });
}

/** Detached background receiver for late deliveries (backgrounded tabs are throttled to ~1 poll/min):
 *  a child process listens for windowMs and exits; the payload lands in ~/.perso and rides whichever
 *  of install/first_run has not fired yet. No-op when a payload already arrived. */
export function lingerWebAttribution(windowMs = 5 * 60_000) {
  if (process.env.PERSO_NO_TELEMETRY || readWebAttribution()) return;
  try {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--listen', String(windowMs)], { detached: true, stdio: 'ignore' });
    child.on('error', () => { /* fail-silent */ });
    child.unref();
  } catch { /* fail-silent */ }
}

// CLI entry (the detached receiver): `node web_attribution.mjs --listen <ms>`.
const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (isMain) {
  const i = process.argv.indexOf('--listen');
  captureWebAttribution(Number(process.argv[i + 1]) || 5 * 60_000, { hold: true });
}
