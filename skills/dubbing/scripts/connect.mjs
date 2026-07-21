#!/usr/bin/env node
// One-click API key issuance via the developer portal (/connect page). Opens the browser, then
// receives the freshly issued key on a one-shot 127.0.0.1 listener and stores it encrypted (same
// storage as resolve_key.mjs) — the key never appears in chat, on screen, or in any URL.
// Flow: local listener on an ephemeral port → browser opens {portal}/connect?port&state&name →
// the user signs in and clicks once → the page POSTs {state, apiKey, ...} back to the listener.
// Falls back to the file-based flow (resolve_key.mjs --watch) on timeout or when no browser opens.
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { persoBaseUrl } from '../lib/config.mjs';
import { storeKey } from './resolve_key.mjs';
import { track, primeTelemetrySpace } from '../lib/telemetry.mjs';

const PORTAL_BASE = persoBaseUrl('PERSO_PORTAL_BASE', process.env.PERSO_PORTAL_BASE, 'https://developers.perso.ai');
const PORTAL_ORIGIN = new URL(PORTAL_BASE).origin;
const TIMEOUT_MS = 5 * 60_000;
const MAX_BODY_BYTES = 16 * 1024;
const CALLBACK_PATHS = ['/callback', '/key'];

// Constant-time state comparison — the state is the only thing authenticating the callback.
function sameState(expected, got) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(got ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

// CORS + Private-Network-Access preflight headers: the https portal page fetches this http://127.0.0.1
// listener, which Chromium only allows when the target answers the PNA preflight itself.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': PORTAL_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Private-Network': 'true',
};

function openBrowser(url) {
  try {
    // Windows: rundll32 hands the URL to the default browser without cmd's `&`-quoting pitfalls.
    const [bin, args] =
      process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] :
      process.platform === 'darwin' ? ['open', [url]] :
      ['xdg-open', [url]];
    const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => { /* URL is already printed — the user can open it manually */ });
    child.unref();
  } catch { /* same — manual open via the printed URL */ }
}

/** Listen for one valid callback; invalid/mismatched requests are answered and ignored (listener stays
 *  up). Resolves { apiKey, expireAt } on success, null on timeout. */
function awaitCallback(state) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const respond = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify(body));
      };
      // The portal posts to /key; the spec named it /callback. Accept both so the flow works
      // whichever one the deployed page uses.
      if (!CALLBACK_PATHS.some((p) => req.url?.startsWith(p))) return respond(404, { ok: false });
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS_HEADERS); return res.end(); }
      if (req.method !== 'POST') return respond(405, { ok: false });
      let size = 0;
      const parts = [];
      req.on('data', (c) => { size += c.length; size > MAX_BODY_BYTES ? req.destroy() : parts.push(c); });
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { /* rejected below */ }
        const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
        if (!body || !sameState(state, body.state) || !apiKey) return respond(400, { ok: false });
        respond(200, { ok: true }); // the page shows "connected — close this window"
        // Resolve only after the 200 is flushed: the next step (DPAPI encrypt) blocks the event loop
        // with a synchronous powershell call, which must not delay the page's fetch response.
        res.on('finish', () => {
          server.close();
          server.closeAllConnections?.(); // don't wait out the keep-alive socket
          // The portal sends the API response field name (expireDate); the spec called it expireAt.
          resolve({ apiKey, expireAt: body.expireAt ?? body.expireDate ?? null });
        });
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      // The portal prefills its key-name input with this, truncated to 16 chars — anything longer
      // (a hostname suffix, say) gets cut mid-word, so keep it short enough to survive intact.
      const name = 'perso-dubbing';
      const url = `${PORTAL_BASE}/connect?port=${port}&state=${state}&name=${encodeURIComponent(name)}`;
      console.log('Opening the Perso developer portal — sign in and click [Issue key for this device]:');
      console.log(`  ${url}`);
      if (process.env.PERSO_NO_OPEN) console.log('(PERSO_NO_OPEN set — open the URL yourself, in a browser on THIS machine.)');
      else openBrowser(url);
      console.log('Waiting for the key from the browser... (up to 5 minutes, Ctrl+C to cancel)');
    });
    setTimeout(() => { server.close(); server.closeAllConnections?.(); resolve(null); }, TIMEOUT_MS).unref();
  });
}

async function main() {
  primeTelemetrySpace(); // separate process from the caller — re-registrations carry the last known workspace
  const state = randomBytes(24).toString('base64url');
  const received = await awaitCallback(state);
  if (!received) {
    const watcher = join(dirname(fileURLToPath(import.meta.url)), 'resolve_key.mjs').replace(/\\/g, '/');
    console.error('Timed out — no key was delivered from the browser.');
    console.error(`Fallback (file-based): node "${watcher}" --watch`);
    process.exit(1);
  }
  storeKey(received.apiKey); // encrypt + verify + print the masked key; exits non-zero on failure
  if (received.expireAt) console.log(`   (expires ${String(received.expireAt).slice(0, 10)} — the plugin reopens this page when it does)`);
  await track('key_registered', { method: 'connect' });
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) main();
