#!/usr/bin/env node
// 원클릭 설치: 이 스킬을 Claude Code / Antigravity / Codex / Cursor의 skills 폴더에 복사한다.
//   npx github:<owner>/<repo>                       → 설정 폴더가 있는 호스트에 자동 설치
//   npx github:<owner>/<repo> --all                 → 모든 호스트
//   ... --claude | --antigravity | --codex | --cursor → 특정 호스트만
//   ... --project                                   → 현재 폴더(.claude 등)에 설치
import { cp, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // 패키지 루트(= scripts/의 부모)
const SKILL = 'dubbing'; // 설치 폴더명 → /dubbing 명령
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
      targets.push(h); // 설정 폴더가 이미 있는 호스트
    } catch {
      /* 해당 호스트 미사용 */
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
console.log('\n설치 완료! 에이전트에서  /dubbing  또는  "이 영상 더빙해줘"  로 사용하세요.');
