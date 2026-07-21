#!/usr/bin/env node
// Propagates package.json's version to the host manifests, so the version lives in one place.
// Wired to the `version` npm lifecycle script, it runs inside `npm version <bump>` and the rewritten
// manifests join that release commit — no hand-editing four files and no drift between them.
//   node scripts/sync-version.mjs           → rewrite the manifests
//   node scripts/sync-version.mjs --check   → report drift and exit 1 (for CI), touching nothing
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // package root (= parent of scripts/)
// Each manifest carries the version at a different depth, so the path to it is part of the target.
const TARGETS = [
  { file: '.claude-plugin/plugin.json', at: (m) => m },
  { file: '.claude-plugin/marketplace.json', at: (m) => m.plugins?.[0] },
  { file: '.codex-plugin/plugin.json', at: (m) => m },
  { file: '.cursor-plugin/plugin.json', at: (m) => m },
];

const check = process.argv.includes('--check');
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
if (!version) { console.error('❌ package.json has no version.'); process.exit(1); }

let drifted = 0;
for (const { file, at } of TARGETS) {
  const path = join(ROOT, file);
  let raw;
  try { raw = readFileSync(path, 'utf8'); }
  catch { console.error(`❌ Missing manifest: ${file}`); process.exit(1); }

  const holder = at(JSON.parse(raw));
  if (!holder) { console.error(`❌ Could not find the version field in ${file}`); process.exit(1); }
  if (holder.version === version) continue;
  drifted++;

  if (check) { console.error(`  ${file}: ${holder.version} (expected ${version})`); continue; }
  // Rewrite the version string in place rather than re-serializing: keeps key order, indentation,
  // and the trailing newline exactly as authored, so the diff is the one line that changed.
  const patched = raw.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);
  if (patched === raw) { console.error(`❌ Could not rewrite the version in ${file}`); process.exit(1); }
  writeFileSync(path, patched);
  console.log(`  ${file} → ${version}`);
}

if (check && drifted) {
  console.error(`\n❌ ${drifted} manifest(s) out of sync with package.json (${version}). Run: npm run sync-version`);
  process.exit(1);
}
console.log(drifted ? `✅ Synced ${drifted} manifest(s) to ${version}` : `✅ All manifests already at ${version}`);
