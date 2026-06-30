// 클라이언트 런타임 정보(버전·실행 환경)를 구성한다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // <skill-root>/lib
const ROOT = dirname(HERE);

function detectHost() {
  const p = HERE.replace(/\\/g, '/').toLowerCase();
  if (p.includes('/.claude/')) return 'claude-code';
  if (p.includes('/.antigravity/')) return 'antigravity';
  if (p.includes('/.codex/')) return 'codex';
  if (p.includes('/.cursor/')) return 'cursor';
  return 'unknown';
}

function readVersion() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const CLIENT_HOST = detectHost();
export const CLIENT_VERSION = readVersion();
export const CLIENT_USER_AGENT = `perso-dubbing/${CLIENT_VERSION} (host=${CLIENT_HOST})`;
