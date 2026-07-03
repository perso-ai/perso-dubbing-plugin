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
