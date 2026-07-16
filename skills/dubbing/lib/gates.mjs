// Shared run gates & error plumbing for the worker scripts (dubbing.mjs, ../srt/scripts/srt.mjs).
// Extracted from dubbing.mjs so sibling skills reuse the exact same key/space behavior.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { resolveKey, onboardingHelp, preloadKeyEnv } from '../scripts/resolve_key.mjs';
import { dubbingSpaces, getPlanStatus } from './space.mjs';
import { track } from './telemetry.mjs';

const notify = (m) => console.log(`[progress] ${m}`);

export class UsageError extends Error {
  constructor(msg) { super(msg); this.name = 'UsageError'; }
}

// Signals "stop with this exit code" after the message was already printed. Thrown instead of calling
// process.exit() directly: a hard exit while fetch sockets are tearing down hits a Windows libuv assert
// (async.c) and corrupts the exit code — main() sets process.exitCode and lets the loop drain instead.
export class ExitCode extends Error {
  constructor(code) { super(`exit ${code}`); this.name = 'ExitCode'; this.code = code; }
}

// Convert API errors into user-friendly text (avoid exposing raw codes/messages)
export function isAuthError(e) {
  return e?.name === 'PersoApiError' && (e.httpStatus === 401 || ['A0009', 'A0010', 'A0011'].includes(e.code ?? ''));
}
export function friendlyError(e) {
  if (e?.name === 'MissingKeyError' || isAuthError(e)) {
    return 'API key is missing or invalid (it may be expired or mistyped). Re-register it and try again.\n\n' + onboardingHelp();
  }
  if (e?.name === 'PersoApiError') return 'Something went wrong while processing. Please try again in a moment.';
  return e?.message ?? 'Unknown error';
}

// Coarse error bucket for telemetry — never the raw message/code.
export function errorClass(e) {
  if (e?.name === 'MissingKeyError' || isAuthError(e)) return 'auth';
  if (e?.name === 'UnsupportedMediaError') return 'unsupported';
  if (e?.name === 'PersoApiError') return 'network';
  return 'unknown';
}

// Key gate with self-healing: when no key is registered, hand off to `resolve_key.mjs --watch` in a child
// process (creates the key file, opens it in the editor, encrypts on save, deletes the file) and continue
// once registered. Runs in a child because Windows DPAPI work (powershell) must not run in this main process.
// PERSO_NO_WATCH=1 restores the old fail-fast behavior (headless/CI).
export async function ensureKey() {
  if (resolveKey()) { track('key_check', { has_key: true }); return; }
  track('key_check', { has_key: false });
  if (process.env.PERSO_NO_WATCH) {
    console.error(onboardingHelp());
    throw new ExitCode(2);
  }
  notify('No API key registered — a key file will open; paste just your Perso API key and save it. (Get one: https://developers.perso.ai/api-keys)');
  track('key_onboarding_started');
  const watcher = fileURLToPath(new URL('../scripts/resolve_key.mjs', import.meta.url));
  const code = await new Promise((res) => {
    const child = spawn(process.execPath, [watcher, '--watch'], { stdio: 'inherit' });
    child.on('close', res);
    child.on('error', () => res(1));
  });
  preloadKeyEnv();
  if (code !== 0 || !resolveKey()) {
    console.error(onboardingHelp());
    throw new ExitCode(2);
  }
  track('key_registered');
  notify('API key registered — continuing.');
}

// Space gate: which workspace to run in. The user only ever sees space NAME + PLAN (never the seq):
// --space accepts a space name (or a raw seq for scripts); PERSO_SPACE_SEQ pins it; a single space is used
// as-is. With several spaces the user chooses — interactively on a TTY; otherwise (agent/background) the
// name+plan options are printed as [space-select] lines and the run exits with code 3 → re-run with
// --space "<space name>".
export async function ensureSpace(args) {
  const wanted = args.space != null ? String(args.space).trim() : '';
  if (/^\d+$/.test(wanted)) { track('space_resolved'); return Number(wanted); } // raw seq — power users/scripts; not shown to end users
  const pinned = Number(process.env.PERSO_SPACE_SEQ);
  if (!wanted && pinned) { track('space_resolved'); return pinned; }

  const spaces = await dubbingSpaces();
  // Options shown to the user carry "name | (plan) | remaining credits" — never the internal seq.
  // Credits are fetched only when a list is actually displayed (one plan-status call per option).
  const enrich = (list) => Promise.all(list.map(async (s) => ({ ...s, credits: (await getPlanStatus(s.seq))?.remainingQuota ?? null })));
  const label = (s) => [s.name, s.tier ? `(${s.tier})` : '(-)', s.credits != null ? `${s.credits} credits left` : 'credits unknown'].join(' | ');
  const brief = (s) => `${s.name}${s.tier ? ` (${s.tier})` : ''}`;

  if (wanted) {
    const hits = spaces.filter((s) => s.name.toLowerCase() === wanted.toLowerCase());
    if (hits.length === 1) { track('space_resolved', { plan_tier: hits[0].tier ?? null, plan_name: hits[0].planName ?? null }); console.log(`Space: ${brief(hits[0])}`); return hits[0].seq; }
    if (hits.length > 1) {
      console.log(`[space-select] Several spaces share the name "${wanted}" — rename one in Perso, or pin PERSO_SPACE_SEQ:`);
      for (const s of await enrich(hits)) console.log(`  PERSO_SPACE_SEQ=${s.seq}  →  ${label(s)}`);
      throw new ExitCode(3);
    }
    console.log(`[space-select] No space named "${wanted}". Ask the user to pick one of these:`);
    for (const s of await enrich(spaces)) console.log(`  - ${label(s)}`);
    throw new ExitCode(3);
  }

  if (spaces.length === 1) { track('space_resolved', { plan_tier: spaces[0].tier ?? null, plan_name: spaces[0].planName ?? null }); return spaces[0].seq; }
  const options = await enrich(spaces);
  if (process.stdin.isTTY && process.stdout.isTTY) {
    console.log('Several spaces are available. Which one should this job run in?');
    options.forEach((s, i) => console.log(`  ${i + 1}) ${label(s)}`));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Select (number or name): ')).trim();
    rl.close();
    const chosen = options[Number(answer) - 1] ?? options.find((s) => s.name.toLowerCase() === answer.toLowerCase());
    if (!chosen) { console.error('Invalid selection — run again.'); throw new ExitCode(1); }
    track('space_resolved', { plan_tier: chosen.tier ?? null, plan_name: chosen.planName ?? null });
    console.log(`Space: ${brief(chosen)}`);
    return chosen.seq;
  }
  console.log('[space-select] Several spaces are available — show the user ONLY these options (name | plan | credits left), ask which one to run in, then re-run the same command with --space "<space name>":');
  for (const s of options) console.log(`  - ${label(s)}`);
  throw new ExitCode(3);
}
