#!/usr/bin/env node
// One-click install: copy every skill into the skills folder of every detected host.
//   npx github:perso-ai/perso-dubbing-plugin        → auto-install to hosts that have a config folder
//   node scripts/install.mjs --all                                 → all hosts
//   ... --claude | --antigravity | --codex | --cursor              → specific hosts only
//   ... --project                                                  → install into the current folder (./.claude etc.)
import { cp, mkdir, access, writeFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // package root (= parent of scripts/)
// Skill payloads → each installs under its own name (→ /dubbing, /srt). They must land side by side:
// the srt worker imports the dubbing skill's lib via the sibling folder.
const SKILLS = {
  dubbing: ['SKILL.md', 'lib', 'scripts', 'agents'],
  srt: ['SKILL.md', 'scripts', 'agents'],
};

const args = process.argv.slice(2);
const baseDir = args.includes('--project') ? process.cwd() : homedir();

// probes: config dirs whose presence means the host is in use. dests: skills dirs to install into.
// '.agents/skills' is the cross-tool Agent Skills location (Codex · Antigravity 2.0 · Gemini CLI);
// '.codex/skills' is kept for older Codex versions that only scan their own folder.
const HOSTS = {
  claude: { probes: ['.claude'], dests: [join('.claude', 'skills')] },
  antigravity: { probes: ['.antigravity', '.gemini'], dests: [join('.antigravity', 'skills'), join('.agents', 'skills')] },
  codex: { probes: ['.codex', '.agents'], dests: [join('.agents', 'skills'), join('.codex', 'skills')] },
  cursor: { probes: ['.cursor'], dests: [join('.cursor', 'skills')] },
};

const exists = (p) => access(p).then(() => true, () => false);

let targets = Object.keys(HOSTS).filter((h) => args.includes(`--${h}`));
if (args.includes('--all')) targets = Object.keys(HOSTS);
if (!targets.length) {
  for (const [h, { probes }] of Object.entries(HOSTS)) {
    for (const probe of probes) {
      if (await exists(join(baseDir, probe))) { targets.push(h); break; }
    }
  }
  if (!targets.length) targets = ['claude'];
}

// A minimal package.json goes with the copy so the worker can report its version (User-Agent) from the installed dir.
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const miniPkg = JSON.stringify({ name: pkg.name, version: pkg.version, description: pkg.description, type: 'module', license: pkg.license }, null, 2);

const roots = [...new Set(targets.flatMap((h) => HOSTS[h].dests))].map((d) => join(baseDir, d));
for (const root of roots) {
  for (const [skill, items] of Object.entries(SKILLS)) {
    const dest = join(root, skill);
    await mkdir(dest, { recursive: true });
    for (const item of items) {
      await cp(join(ROOT, 'skills', skill, item), join(dest, item), { recursive: true, force: true }).catch(() => {});
    }
    for (const doc of ['README.md', 'LICENSE']) {
      await cp(join(ROOT, doc), join(dest, doc), { force: true }).catch(() => {});
    }
    await writeFile(join(dest, 'package.json'), miniPkg + '\n', 'utf8').catch(() => {});
    console.log(`✅ ${dest}`);
  }
}
console.log('\nInstalled! Use  /dubbing  ("dub this video for me")  or  /srt  ("make me an English SRT for this video").');
