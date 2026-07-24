// Builds client runtime info (version, execution environment).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // <skill-root>/lib
const ROOT = dirname(HERE);

// Every agent host reports as one unified channel — API logs and UTM segment by version only.
export const CLIENT_HOST = 'agents';

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
// prefix scans, unverified), then the skill's own install path. '~/.agents/skills' is shared by
// Codex · Antigravity · Gemini, so path alone yields 'agents-dir'. A worker can also pass --host to
// self-report (see telemetry.setAgentHost), which overrides this with source 'self'.
function detectAgentHost() {
  const env = process.env;
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return { host: 'claude-code', source: 'env' };
  const has = (prefix) => Object.keys(env).some((k) => k.startsWith(prefix));
  if (has('CURSOR_')) return { host: 'cursor', source: 'env' };
  if (has('CODEX_')) return { host: 'codex', source: 'env' };
  if (has('ANTIGRAVITY_')) return { host: 'antigravity', source: 'env' };
  if (has('GEMINI_')) return { host: 'gemini', source: 'env' };
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
