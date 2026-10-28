// Builds client runtime info (version, execution environment).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // <skill-root>/lib
const ROOT = dirname(HERE);

// Every agent host reports as one unified channel — API logs and UTM segment by version only.
export const CLIENT_HOST = 'agents';

// No browser can open on this machine (headless box / SSH session). The connect flow delivers the key to
// a 127.0.0.1 listener, so its page is only usable in a browser on the SAME machine — where this is true
// the workers skip it and register from a file instead. Pure (env, platform) → unit-testable.
// Windows always has a desktop session; DISPLAY (X/XWayland) anywhere means a browser can open.
export function isHeadlessEnv(env = {DISPLAY: process.env.DISPLAY, WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY, SSH_CONNECTION: process.env.SSH_CONNECTION, SSH_TTY: process.env.SSH_TTY}, platform = process.platform) {
  if (platform === 'win32') return false;
  const has = (k) => !!String(env?.[k] ?? '').trim();
  if (has('DISPLAY')) return false;
  if (platform === 'linux') return !has('WAYLAND_DISPLAY');
  return has('SSH_CONNECTION') || has('SSH_TTY'); // macOS/BSD: only a remote session counts as headless
}

// The skill sits either at the package root (installed copy) or under <repo>/skills/dubbing — check both for package.json.
function readVersion() {
  for (const dir of [ROOT, join(ROOT, '..', '..')]) {
    try {
      const v = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
      if (v) return v;
    } catch { /* try next */ }
  }
  return '0.0.0';
}

export const CLIENT_VERSION = readVersion();
export const CLIENT_USER_AGENT = `perso-dubbing/${CLIENT_VERSION} (host=${CLIENT_HOST})`;

// Which coding agent this process runs under — telemetry segmentation only (the API User-Agent /
// UTM channel above stays the unified 'agents'). Best-effort, returning the detection source too so
// telemetry can weight it: env markers first (CLAUDECODE verified on Claude Code; the others are
// identified by their install path), then the skill's own install path. '~/.agents/skills' is shared by
// Codex · Antigravity · Gemini, so path alone yields 'agents-dir'. A worker can also pass --host to
// self-report (see telemetry.setAgentHost), which overrides this with source 'self'.
function detectAgentHost() {
  // Only inspect the two documented Claude markers; do not enumerate unrelated environment names.
  // Other hosts are identified from the install path or the worker's explicit --host option.
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return { host: 'claude-code', source: 'env' };
  const here = HERE.replace(/\\/g, '/').toLowerCase();
  if (here.includes('/.claude/')) return { host: 'claude-code', source: 'path' };
  if (here.includes('/.cursor/')) return { host: 'cursor', source: 'path' };
  if (here.includes('/.codex/')) return { host: 'codex', source: 'path' };
  if (here.includes('/.antigravity/')) return { host: 'antigravity', source: 'path' };
  if (here.includes('/.gemini/')) return { host: 'gemini', source: 'path' };
  if (here.includes('/.agents/')) return { host: 'agents-dir', source: 'path' };
  return { host: 'unknown', source: 'none' };
}
const detected = detectAgentHost();
export const AGENT_HOST = detected.host;
export const AGENT_HOST_SOURCE = detected.source;
