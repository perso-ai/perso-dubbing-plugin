#!/usr/bin/env node
// docs/ (GitHub Pages 구조, 루트=한국어) → perso.ai/{lang}/dubbing/agents 서빙용 정적 트리로 변환.
// 원본 docs/ 는 건드리지 않는다 — 기존 dubbing-plugin.perso.ai (GitHub Pages) 는 301 전환 전까지 현행 유지.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) {
  console.error('usage: node build-site.mjs <docsDir> <outDir>');
  process.exit(1);
}

const OLD_ORIGIN = 'https://dubbing-plugin.perso.ai';
const ASSET_PREFIX = '/dubbing/agents';
const newPageUrl = (lang) => `https://perso.ai/${lang}/dubbing/agents`;

const LOCALES = [
  { lang: 'ko', src: 'index.html' },
  { lang: 'en', src: 'en/index.html' },
  { lang: 'es', src: 'es/index.html' },
  { lang: 'pt', src: 'pt/index.html' },
];

function transform(html) {
  let out = html;
  // 페이지 URL — 언어 경로가 붙은 것을 먼저 치환하고, 루트(한국어)는 마지막에.
  for (const lang of ['en', 'es', 'pt']) {
    out = out.replaceAll(`${OLD_ORIGIN}/${lang}/`, newPageUrl(lang));
  }
  out = out.replaceAll(`${OLD_ORIGIN}/`, newPageUrl('ko'));
  // 루트 절대경로 에셋 → /dubbing/agents 프리픽스 (perso.ai 루트는 다른 앱이 사용)
  out = out.replaceAll('"/media/', `"${ASSET_PREFIX}/media/`);
  out = out.replaceAll('url(/fonts/', `url(${ASSET_PREFIX}/fonts/`);
  out = out.replaceAll('"/perso-mark.svg', `"${ASSET_PREFIX}/perso-mark.svg`);
  // 클라이언트 사이드 언어 라우팅 — root-absolute 경로를 /dubbing/agents 하위 경로로.
  out = out.replaceAll(
    'function langPath(l){ return l === "ko" ? "/" : "/" + l + "/"; }',
    'function langPath(l){ return l === "ko" ? "/ko/dubbing/agents" : "/" + l + "/dubbing/agents"; }'
  );
  // ?lang= 리다이렉트 스크립트 (docs/index.html 에만 존재; 다른 파일에서는 no-op).
  out = out.replaceAll('location.replace("/"+l+"/");', 'location.replace("/"+l+"/dubbing/agents");');
  return out;
}

rmSync(outDir, { recursive: true, force: true });

for (const { lang, src } of LOCALES) {
  const out = transform(readFileSync(path.join(srcDir, src), 'utf8'));
  // 치환 누락이 있으면 빌드 자체를 실패시킨다.
  for (const bad of [
    'dubbing-plugin.perso.ai',
    '"/media/',
    'url(/fonts/',
    '"/perso-mark.svg',
    '? "/" : "/" + l + "/"',
    'location.replace("/"+l+"/")',
  ]) {
    if (out.includes(bad)) throw new Error(`${src}: untransformed pattern remains: ${bad}`);
  }
  // 치환 결과물이 실제로 존재하는지도 검증 (원본 포맷이 바뀌어 replaceAll 이 no-op 되는 회귀 방지)
  for (const mustHave of [
    'function langPath(l){ return l === "ko" ? "/ko/dubbing/agents" : "/" + l + "/dubbing/agents"; }',
    `"${ASSET_PREFIX}/media/`,
    'https://perso.ai/',
  ]) {
    if (!out.includes(mustHave)) throw new Error(`${src}: expected transformed pattern missing: ${mustHave}`);
  }
  mkdirSync(path.join(outDir, lang), { recursive: true });
  writeFileSync(path.join(outDir, lang, 'index.html'), out);
}

for (const asset of ['media', 'fonts']) {
  cpSync(path.join(srcDir, asset), path.join(outDir, 'dubbing/agents', asset), { recursive: true });
}
cpSync(path.join(srcDir, 'perso-mark.svg'), path.join(outDir, 'dubbing/agents/perso-mark.svg'));

console.log(`built ${LOCALES.length} locale pages -> ${outDir}`);
