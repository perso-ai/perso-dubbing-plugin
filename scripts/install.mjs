#!/usr/bin/env node
// One-click install: copy this skill into the skills folder of Claude Code / Antigravity / Codex / Cursor.
//   npx github:<owner>/<repo>                       → auto-install to hosts that have a config folder
//   npx github:<owner>/<repo> --all                 → all hosts
//   ... --claude | --antigravity | --codex | --cursor → specific hosts only
//   ... --project                                   → install into the current folder (.claude, etc.)
import { cp, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // package root (= parent of scripts/)
const SKILL = 'dubbing'; // install folder name → /dubbing command
const ITEMS = ['SKILL.md', 'lib', 'scripts', 'package.json', 'README.md', 'LICENSE'];

const args = process.argv.slice(2);
const baseDir = args.includes('--project') ? process.cwd() : homedir();
const HOSTS = {
  claude: join(baseDir, '.claude', 'skills', SKILL),
  antigravity: join(baseDir, '.antigravity', 'skills', SKILL),
  codex: join(baseDir, '.codex', 'skills', SKILL),
  cursor: join(baseDir, '.cursor', 'skills', SKILL),
};

let targets = Object.keys(HOSTS).filter((h) => args.includes(`--${h}`));
if (args.includes('--all')) targets = Object.keys(HOSTS);
if (!targets.length) {
  for (const h of Object.keys(HOSTS)) {
    try {
      await access(join(baseDir, `.${h}`));
      targets.push(h); // hosts that already have a config folder
    } catch {
      /* host not in use */
    }
  }
  if (!targets.length) targets = ['claude'];
}

for (const h of targets) {
  const dest = HOSTS[h];
  await mkdir(dest, { recursive: true });
  for (const item of ITEMS) {
    await cp(join(ROOT, item), join(dest, item), { recursive: true, force: true }).catch(() => {});
  }
  console.log(`✅ ${h} → ${dest}`);
}
console.log('\nInstalled! Use it in your agent with  /dubbing  or just  "dub this video for me".');
