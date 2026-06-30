#!/usr/bin/env node
// Resolve API key (env override → local file → onboarding help).
// The raw key is never written to stdout. The CLI (--check) only shows a masked form.
import { readFileSync, writeFileSync, unlinkSync, existsSync, realpathSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CRED_DIR, CRED_FILE } from '../lib/config.mjs';
import { maskKey } from '../lib/mask.mjs';

const isWindows = process.platform === 'win32';

// Windows: decrypt the DPAPI ciphertext stored via ConvertFrom-SecureString under the current account.
function decryptDpapi(enc) {
  const ps =
    '$ErrorActionPreference="Stop";' +
    `$sec = ConvertTo-SecureString ${JSON.stringify(enc.trim())};` +
    '$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec);' +
    'try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }' +
    'finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }';
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'], // explicit stdio — mitigates libuv handle conflicts in background/non-console contexts
  }).replace(/\r?\n$/, '');
}

/** Returns the key in-process (never prints it). Returns null if absent.
 *  The resolved key is cached once per process — so Windows DPAPI decryption (running powershell)
 *  is not repeated on every request/poll (avoids blocking the event loop). A missing key (null) is not cached. */
let _cachedKey = null;
export function resolveKey() {
  if (_cachedKey) return _cachedKey;
  if (process.env.XP_API_KEY) return (_cachedKey = process.env.XP_API_KEY.trim());
  if (existsSync(CRED_FILE)) {
    const raw = readFileSync(CRED_FILE, 'utf8').trim();
    if (!raw) return null;
    if (!isWindows) return (_cachedKey = raw);
    try { return (_cachedKey = decryptDpapi(raw)); }
    catch { return null; } // corrupted credential (empty/broken) → treated as 'absent' (prompts re-registration), prevents crash
  }
  return null;
}

/**
 * Preload the key for long-running processes (dubbing/resume). At startup (before async), it finishes
 * DPAPI decryption in a **clean child process** and passes the result via the XP_API_KEY env var. This avoids
 * the Windows Node libuv (async.c) crash that occurs when the main process calls powershell.exe
 * synchronously itself. The key is passed only through a pipe (never printed).
 * Failures are ignored — falls back to the existing path (resolveKey decrypts directly).
 */
export function preloadKeyEnv() {
  if (process.env.XP_API_KEY) return;     // not needed if already in env
  if (!isWindows) return;                 // non-Windows reads the plaintext file directly (no powershell)
  if (!existsSync(CRED_FILE)) return;      // if there's no key, the gate handles it
  try {
    const self = fileURLToPath(import.meta.url);
    const key = execFileSync(process.execPath, [self, '--export'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, PERSO_KEY_EXPORT: '1' }, // internal-call marker
    }).replace(/\r?\n$/, '');
    if (key) process.env.XP_API_KEY = key;
  } catch { /* fallback: resolveKey decrypts directly */ }
}

/** Registration guidance when no key is present. Interactive input (Read-Host) yields empty values in agent environments without a TTY, so the file-based path (--import) is recommended first. */
export function onboardingHelp() {
  const self = fileURLToPath(import.meta.url).replace(/\\/g, '/'); // forward-slash path, shell-agnostic
  const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
  return [
    'No API key found. Do not paste the key into the chat — register it as below:',
    '',
    `  1) Create a text file containing just the key on one line.  e.g. ${example}`,
    `  2) Run:  ! node "${self}" --import "${example}"`,
    '     → The key is stored encrypted and the key file is auto-deleted.',
    '',
    `  (If you opened a real terminal window yourself, interactive entry also works: node "${self}" --set)`,
    '',
    'Get an API key: https://developers.perso.ai/api-keys',
  ].join('\n');
}

/** Takes a known key string: ensure directory → encrypt (Windows DPAPI) → save as ascii → read back to verify. The key is passed only via stdin (avoids command-line exposure). */
function storeKey(key) {
  const k = (key ?? '').trim();
  if (!k) { console.error('❌ The key is empty.'); process.exit(1); }
  mkdirSync(CRED_DIR, { recursive: true });
  if (isWindows) {
    const lit = `'${CRED_FILE.replace(/'/g, "''")}'`;
    const ps =
      '$ErrorActionPreference="Stop";' +
      '$k = ([Console]::In.ReadToEnd()).Trim();' +
      'if ($k.Length -lt 1) { throw "empty" };' +
      `($k | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString) | Set-Content -Encoding ascii ${lit}`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { input: k });
  } else {
    writeFileSync(CRED_FILE, k, { mode: 0o600 });
  }
  _cachedKey = null;
  const back = resolveKey();
  if (!back) { console.error('❌ Could not verify registration. Try again.'); process.exit(1); }
  console.log(`✅ Key registered: ${maskKey(back)}`);
}

/** Register using a key contained in a file — no interactive input needed, so it works in TTY-less environments/agents. Deletes the original file after registration. */
export function importKey(srcPath) {
  let key;
  try { key = readFileSync(srcPath, 'utf8'); }
  catch { console.error(`❌ Could not read the key file: ${srcPath}`); process.exit(1); }
  storeKey(key);
  try { unlinkSync(srcPath); console.log('   (original key file deleted)'); } catch { /* ignore deletion failure */ }
}

/** Interactive key registration — only in a real terminal (TTY). Without a TTY an empty value would be saved, so steer users to --import. */
export function setKey() {
  if (!process.stdin.isTTY) {
    const self = fileURLToPath(import.meta.url).replace(/\\/g, '/');
    const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
    console.error([
      'This environment has no interactive input (Read-Host/read), so the key would be saved empty.',
      'Register via a key file instead:',
      `  1) Create a file containing just the key on one line  e.g. ${example}`,
      `  2) node "${self}" --import "${example}"`,
    ].join('\n'));
    process.exit(1);
  }
  mkdirSync(CRED_DIR, { recursive: true });
  try {
    if (isWindows) {
      const lit = `'${CRED_FILE.replace(/'/g, "''")}'`;
      const ps =
        '$ErrorActionPreference="Stop";' +
        "$s = Read-Host 'Perso API Key' -AsSecureString;" +
        "if ($s.Length -lt 1) { throw 'empty' };" +
        `($s | ConvertFrom-SecureString) | Set-Content -Encoding ascii ${lit}`;
      execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
    } else {
      const lit = `'${CRED_FILE.replace(/'/g, "'\\''")}'`;
      const sh = `umask 177; printf 'Perso API Key: '; IFS= read -rs k; [ -n "$k" ] || { echo; exit 1; }; printf '%s' "$k" > ${lit}; echo`;
      execFileSync('/bin/sh', ['-c', sh], { stdio: 'inherit' });
    }
  } catch {
    console.error('\n❌ The key was empty or could not be saved. Run it again.');
    process.exit(1);
  }
  _cachedKey = null;
  const back = resolveKey();
  if (back) console.log(`✅ Key registered: ${maskKey(back)}`);
  else { console.error('❌ Could not read the saved file. Try again.'); process.exit(1); }
}

/** Default key-input file path (next to the home directory). */
export function keyFilePath() {
  return join(dirname(CRED_DIR), 'perso_key.txt');
}

/** Open a file in the OS default editor (best-effort). Skipped when PERSO_NO_OPEN is set (for headless/automation). */
function openInEditor(path) {
  if (process.env.PERSO_NO_OPEN) return;
  try {
    const [bin, args] =
      isWindows ? ['notepad.exe', [path]] :
      process.platform === 'darwin' ? ['open', ['-t', path]] :
      ['xdg-open', [path]];
    spawn(bin, args, { detached: true, stdio: 'ignore' }).unref();
  } catch { /* ignore auto-open failure — the user can open the path manually */ }
}

/** Create an empty key file and watch it — when the user pastes the key and saves, it auto-detects → encrypts and saves → deletes the file. No TTY needed. */
export function watchKey(file) {
  const path = file || keyFilePath();
  if (!existsSync(path)) writeFileSync(path, '');
  openInEditor(path); // auto-open in the OS default editor (Notepad, etc.)
  console.log('An editor will open. Paste only the API key and save (Ctrl+S / Cmd+S) — it registers automatically.');
  console.log(`(If it doesn't open, open this file yourself): ${path}`);
  const start = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000;
  const tick = () => {
    let content = '';
    try { content = readFileSync(path, 'utf8').trim(); } catch { /* lock/transient error → next tick */ }
    if (content) {
      storeKey(content); // encrypt and save in real time + verify (prints ✅)
      try { unlinkSync(path); console.log('   (key file auto-deleted)'); } catch { /* ignore */ }
      process.exit(0);
    }
    if (Date.now() - start > TIMEOUT_MS) {
      console.error('Timed out — no key input detected. Try again.');
      process.exit(1);
    }
    setTimeout(tick, 500);
  };
  setTimeout(tick, 500);
}

// CLI: `--watch [file]` auto-detect registration (recommended) / `--import <file>` / `--set` interactive / `--check` (default) verify
const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--export') {
    // internal only: print the key only when preloadKeyEnv captures it via a pipe (avoids accidental chat exposure)
    if (process.env.PERSO_KEY_EXPORT !== '1') { console.error('--export is internal only.'); process.exit(1); }
    const key = resolveKey();
    if (key) process.stdout.write(key);
    process.exit(key ? 0 : 2);
  } else if (argv[0] === '--watch') {
    watchKey(argv[1]);
  } else if (argv[0] === '--import') {
    if (!argv[1]) { console.error('Usage: --import "<key file path>"'); process.exit(1); }
    importKey(argv[1]);
  } else if (argv.includes('--set')) {
    setKey();
  } else {
    const key = resolveKey();
    if (!key) {
      console.error(onboardingHelp());
      process.exit(2);
    }
    console.log(`Key OK: ${maskKey(key)}`);
  }
}
